import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  generateRecoveryCode,
  generateSecret,
  openSecret,
  otpauthUrl,
  sealSecret,
  verifyTotp,
} from './totp';

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60_000;
const RECOVERY_CODES = 8;

interface TwoFactorUser {
  id: string;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  twoFactorRecoveryHashes: string[];
  twoFactorLastStep: number | null;
}

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private get keyMaterial() {
    return (
      this.config.get<string>('TWO_FACTOR_KEY') ??
      this.config.getOrThrow<string>('JWT_SECRET')
    );
  }

  /** Serialize attempts per account in PostgreSQL, shared across workers and restarts.
   * Failure results commit BEFORE an exception is thrown; otherwise a failed
   * attempt would roll back its own counter and never enforce the lockout.
   */
  private async attempt<T>(userId: string, verify: (tx: Prisma.TransactionClient, user: User) => Promise<T | null>): Promise<T> {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const now = Date.now();
      const activeWindow = user.twoFactorLockedUntil != null && user.twoFactorLockedUntil.getTime() > now;
      if (activeWindow && user.failedTwoFactorAttempts >= MAX_FAILURES) {
        return { ok: false as const, message: 'Too many incorrect codes. Try again in 15 minutes.' };
      }
      const value = await verify(tx, user);
      if (value === null) {
        await tx.user.update({ where: { id: userId }, data: {
          failedTwoFactorAttempts: activeWindow ? user.failedTwoFactorAttempts + 1 : 1,
          twoFactorLockedUntil: new Date(now + LOCK_MS),
        } });
        return { ok: false as const, message: 'Invalid verification code' };
      }
      await tx.user.update({ where: { id: userId }, data: { failedTwoFactorAttempts: 0, twoFactorLockedUntil: null } });
      return { ok: true as const, value };
    }, { timeout: 15_000 });
    if (!result.ok) throw new UnauthorizedException(result.message);
    return result.value;
  }

  async verifyLogin(user: TwoFactorUser, code: string | undefined) {
    if (!code) throw new UnauthorizedException('TWO_FACTOR_REQUIRED');
    await this.attempt(user.id, async (tx, current) => {
      if (!current.isActive || !current.twoFactorEnabled) return null;
      const trimmed = code.trim();
      if (/^\d{6}$/.test(trimmed) && current.twoFactorSecret) {
        let plain: string | null = null;
        try { plain = openSecret(current.twoFactorSecret, this.keyMaterial); } catch { /* recovery codes remain usable */ }
        const step = plain ? verifyTotp(plain, trimmed) : null;
        if (step == null || step <= (current.twoFactorLastStep ?? 0)) return null;
        await tx.user.update({ where: { id: current.id }, data: { twoFactorLastStep: step } });
        return true;
      }
      const normalised = trimmed.toUpperCase().replace(/[\s-]/g, '');
      for (const hash of current.twoFactorRecoveryHashes) {
        if (await bcrypt.compare(normalised, hash)) {
          await tx.user.update({ where: { id: current.id }, data: {
            twoFactorRecoveryHashes: current.twoFactorRecoveryHashes.filter((h) => h !== hash),
          } });
          return true;
        }
      }
      return null;
    });
  }

  async status(userId: string) {
    const u = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorRecoveryHashes: true },
    });
    return {
      enabled: u.twoFactorEnabled,
      recoveryCodesLeft: u.twoFactorRecoveryHashes.length,
    };
  }

  /** Starts enrolment: stores a pending secret; not active until confirmed. */
  async setup(userId: string) {
    const u = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        twoFactorEnabled: true,
        restaurant: { select: { name: true } },
      },
    });
    if (u.twoFactorEnabled)
      throw new BadRequestException('Two-factor authentication is already on');
    const secret = generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: sealSecret(secret, this.keyMaterial) },
    });
    return {
      secret,
      otpauthUrl: otpauthUrl(secret, u.email ?? u.name, u.restaurant.name),
    };
  }

  /** Confirms enrolment with a first valid code; returns recovery codes once. */
  async enable(userId: string, code: string) {
    const codes = await this.attempt(userId, async (tx, user) => {
      if (user.twoFactorEnabled) throw new BadRequestException('Two-factor authentication is already on');
      if (!user.twoFactorSecret) throw new BadRequestException('Start setup first');
      const step = verifyTotp(openSecret(user.twoFactorSecret, this.keyMaterial), code);
      if (step == null) return null;
      const recoveryCodes = Array.from({ length: RECOVERY_CODES }, generateRecoveryCode);
      const hashes = await Promise.all(recoveryCodes.map((c) => bcrypt.hash(c.replace(/-/g, ''), 10)));
      await tx.user.update({ where: { id: userId }, data: {
        twoFactorEnabled: true, twoFactorLastStep: step, twoFactorRecoveryHashes: hashes,
      } });
      return recoveryCodes;
    });
    await this.audit.record({ userId, action: '2fa.enabled', entity: 'User', entityId: userId });
    return { recoveryCodes: codes };
  }

  /** Turning it off needs the password AND a valid code (or recovery code). */
  async disable(userId: string, password: string, code: string) {
    const u = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!u.twoFactorEnabled)
      throw new BadRequestException('Two-factor authentication is not on');
    if (!(await bcrypt.compare(password, u.passwordHash)))
      throw new UnauthorizedException('Incorrect password');
    await this.verifyLogin(u, code);
    await this.clear(userId);
    await this.audit.record({
      userId,
      action: '2fa.disabled',
      entity: 'User',
      entityId: userId,
    });
    return { ok: true };
  }

  /** Lets an owner/admin unlock a staff member who lost their device. */
  async adminReset(
    actorId: string,
    restaurantId: string,
    targetUserId: string,
  ) {
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, restaurantId },
      select: { id: true },
    });
    if (!target) throw new BadRequestException('Staff member not found');
    await this.clear(targetUserId);
    await this.audit.record({
      userId: actorId,
      action: '2fa.reset',
      entity: 'User',
      entityId: targetUserId,
    });
    return { ok: true };
  }

  private async clear(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedTwoFactorAttempts: 0,
        twoFactorLockedUntil: null,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorLastStep: null,
        twoFactorRecoveryHashes: [],
      },
    });
  }
}
