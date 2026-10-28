import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  STAFF_ROLES,
  type LoginDto,
  type PinLoginDto,
  type RegisterDto,
  type SessionUser,
} from '@nodedr-restaurant/types';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TwoFactorService } from './two-factor.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly twoFactor: TwoFactorService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private toSessionUser(user: {
    id: string;
    restaurantId: string;
    name: string;
    roleId: string;
    role: { name: string; permissions: { permission: { key: string } }[] };
  }): SessionUser {
    return {
      id: user.id,
      restaurantId: user.restaurantId,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.key),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Only asked for after the password is right, so the response never
    // reveals which emails exist or which accounts use two-factor.
    if (user.twoFactorEnabled) {
      await this.twoFactor.verifyLogin(user, dto.totp);
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      select: { status: true },
    });
    if (
      !restaurant ||
      restaurant.status === 'PENDING' ||
      restaurant.status === 'DECLINED'
    ) {
      throw new UnauthorizedException(
        'This restaurant account is awaiting platform approval or is unavailable',
      );
    }
    return this.issueSession(user);
  }

  async register(dto: RegisterDto) {
    if (
      process.env.TENANT_SIGNUP_ENABLED !== 'true' ||
      process.env.DEMO_MODE === 'true'
    ) {
      throw new UnauthorizedException(
        'Restaurant signup is not available on this service.',
      );
    }
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException(
        'An account with this email already exists',
      );
    }

    // Permissions are global, not per-tenant — upsert (idempotent) outside
    // the transaction below rather than re-creating them per restaurant.
    for (const permission of PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { key: permission.key },
        update: {},
        create: permission,
      });
    }
    const allPermissions = await this.prisma.permission.findMany();
    const permissionByKey = new Map(allPermissions.map((p) => [p.key, p]));

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: { name: dto.restaurantName, currency: dto.currency, timezone: dto.timezone, status: 'PENDING' },
      });
      const branch = await tx.branch.create({
        data: {
          restaurantId: restaurant.id,
          name: dto.branchName,
          country: dto.country,
          taxRegime: dto.taxRegime,
          taxMode: dto.taxMode,
          defaultTaxRatePercent: dto.defaultTaxRatePercent,
          taxLabel: dto.taxLabel || null,
          taxId: dto.taxId || null,
          address: dto.branchAddress || null,
          phone: dto.branchPhone || null,
        },
      });

      let ownerRoleId = '';
      for (const roleName of STAFF_ROLES) {
        const role = await tx.role.create({
          data: {
            restaurantId: restaurant.id,
            name: roleName,
            label: roleName.replace(/_/g, ' '),
          },
        });
        if (roleName === 'OWNER') ownerRoleId = role.id;

        const grantedKeys = DEFAULT_ROLE_PERMISSIONS[roleName];
        await tx.rolePermission.createMany({
          data: grantedKeys
            .map((key) => permissionByKey.get(key))
            .filter((p): p is NonNullable<typeof p> => Boolean(p))
            .map((permission) => ({
              roleId: role.id,
              permissionId: permission.id,
            })),
        });
      }

      const user = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          roleId: ownerRoleId,
          name: dto.ownerName,
          email: dto.email,
          passwordHash,
        },
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
        },
      });

      await tx.userBranch.create({
        data: { userId: user.id, branchId: branch.id },
      });

      return user;
    });

    return { status: 'PENDING' as const };
  }

  async hasAnyRestaurant(): Promise<boolean> {
    const restaurant = await this.prisma.restaurant.findFirst({
      select: { id: true },
    });
    return restaurant !== null;
  }

  async lifecycleStatus(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { status: true },
    });
    return restaurant?.status ?? null;
  }

  async pinLogin(dto: PinLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!user || !user.isActive || !user.pinHash) {
      throw new UnauthorizedException('PIN login not available for this user');
    }
    // A 4-8 digit PIN must not be a way around the second factor.
    if (user.twoFactorEnabled) {
      throw new UnauthorizedException(
        'PIN login is off for accounts with two-factor authentication — sign in with your password',
      );
    }

    const valid = await bcrypt.compare(dto.pin, user.pinHash);
    if (!valid) {
      throw new UnauthorizedException('Incorrect PIN');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: user.restaurantId },
      select: { status: true },
    });
    if (
      !restaurant ||
      restaurant.status === 'PENDING' ||
      restaurant.status === 'DECLINED'
    ) {
      throw new UnauthorizedException(
        'This restaurant account is awaiting platform approval or is unavailable',
      );
    }

    return this.issueSession(user);
  }

  async logout(userId: string) {
    // Logging out revokes all sessions for this account, including copied JWTs.
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    this.realtime.disconnectUser(userId);
  }

  private async issueSession(
    user: Parameters<AuthService['toSessionUser']>[0] & {
      tokenVersion: number;
    },
  ) {
    const sessionUser = this.toSessionUser(user);
    const token = await this.jwt.signAsync({
      sub: user.id,
      tokenVersion: user.tokenVersion,
    });
    return { token, user: sessionUser };
  }
}
