import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  STAFF_ROLES,
  type PlatformRestaurantCreateDto,
} from '@nodedr-restaurant/types';
import { PrismaService } from '../prisma/prisma.service';
import {
  generateRecoveryCode,
  generateSecret,
  openSecret,
  otpauthUrl,
  sealSecret,
  verifyTotp,
} from '../auth/totp';

const COOKIE = 'tablevora_platform_session';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const equal = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private enabled() {
    if (
      process.env.DEMO_MODE === 'true' ||
      process.env.PLATFORM_ADMIN_ENABLED !== 'true'
    )
      throw new ForbiddenException(
        'Platform administration is disabled on this service.',
      );
  }
  private encryptionKey() {
    const key = process.env.PLATFORM_ADMIN_ENCRYPTION_KEY || '';
    if (key.length < 32)
      throw new ForbiddenException(
        'PLATFORM_ADMIN_ENCRYPTION_KEY must contain at least 32 characters.',
      );
    return key;
  }
  private async audit(
    actorId: string | null,
    action: string,
    restaurantId: string | null = null,
    metadata: object = {},
  ) {
    await this.prisma.platformAdminAudit.create({
      data: { actorId, action, restaurantId, metadata },
    });
  }

  async createRestaurant(actorId: string, input: PlatformRestaurantCreateDto) {
    const email = input.ownerEmail.toLowerCase();
    if (
      await this.prisma.user.findFirst({
        where: { email },
        select: { id: true },
      })
    ) {
      throw new ConflictException(
        'An account with this owner email already exists.',
      );
    }
    for (const permission of PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { key: permission.key },
        update: {},
        create: permission,
      });
    }
    const allPermissions = await this.prisma.permission.findMany();
    const permissionByKey = new Map(allPermissions.map((p) => [p.key, p]));
    const inviteToken = randomBytes(32).toString('base64url');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
    const passwordHash = await bcrypt.hash(
      randomBytes(32).toString('base64url'),
      12,
    );

    const tenant = await this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: { name: input.restaurantName, currency: input.currency, timezone: input.timezone, status: 'PENDING' },
      });
      const branch = await tx.branch.create({
        data: {
          restaurantId: restaurant.id,
          name: input.branchName,
          country: input.country,
          taxRegime: input.taxRegime,
          taxMode: input.taxMode,
          defaultTaxRatePercent: input.defaultTaxRatePercent,
          taxLabel: input.taxLabel || null,
          taxId: input.taxId || null,
          address: input.branchAddress || null,
          phone: input.branchPhone || null,
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
        await tx.rolePermission.createMany({
          data: DEFAULT_ROLE_PERMISSIONS[roleName]
            .map((key) => permissionByKey.get(key))
            .filter(
              (permission): permission is NonNullable<typeof permission> =>
                Boolean(permission),
            )
            .map((permission) => ({
              roleId: role.id,
              permissionId: permission.id,
            })),
        });
      }
      const owner = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          roleId: ownerRoleId,
          name: input.ownerName,
          email,
          passwordHash,
        },
      });
      await tx.userBranch.create({
        data: { userId: owner.id, branchId: branch.id },
      });
      await tx.platformAdminInvite.create({
        data: {
          restaurantId: restaurant.id,
          ownerId: owner.id,
          tokenHash: hash(inviteToken),
          expiresAt: inviteExpiresAt,
        },
      });
      await tx.platformAdminAudit.create({
        data: {
          actorId,
          restaurantId: restaurant.id,
          action: 'restaurant.created_by_platform_admin',
          metadata: { ownerEmail: email, branchId: branch.id },
        },
      });
      return { id: restaurant.id, name: restaurant.name };
    });
    return {
      restaurantId: tenant.id,
      restaurantName: tenant.name,
      inviteToken,
      inviteExpiresAt: inviteExpiresAt.toISOString(),
    };
  }

  async reissueInvite(actorId: string, restaurantId: string) {
    const tenant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { users: { where: { role: { name: 'OWNER' } }, take: 1 } },
    });
    const owner = tenant?.users[0];
    if (!tenant || !['PENDING', 'ACTIVE'].includes(tenant.status) || !owner) {
      throw new ConflictException(
        'A setup invitation can only be reissued while the restaurant account is available.',
      );
    }
    if (
      await this.prisma.platformAdminInvite.findFirst({
        where: { ownerId: owner.id, acceptedAt: { not: null } },
        select: { id: true },
      })
    ) {
      throw new ConflictException(
        'The restaurant owner has already set up their account.',
      );
    }
    const inviteToken = randomBytes(32).toString('base64url');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
    await this.prisma.$transaction(async (tx) => {
      await tx.platformAdminInvite.updateMany({
        where: { ownerId: owner.id, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.platformAdminInvite.create({
        data: {
          restaurantId,
          ownerId: owner.id,
          tokenHash: hash(inviteToken),
          expiresAt: inviteExpiresAt,
        },
      });
      await tx.platformAdminAudit.create({
        data: {
          actorId,
          restaurantId,
          action: 'restaurant.owner_invite_reissued',
        },
      });
    });
    return {
      restaurantId,
      inviteToken,
      inviteExpiresAt: inviteExpiresAt.toISOString(),
    };
  }

  async validateInvite(token: string) {
    this.enabled();
    const invite = await this.prisma.platformAdminInvite.findFirst({
      where: {
        tokenHash: hash(token),
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        owner: { select: { name: true, email: true } },
        restaurant: { select: { name: true, status: true } },
      },
    });
    if (!invite || invite.restaurant.status === 'DECLINED')
      throw new UnauthorizedException(
        'This owner setup link is invalid, expired, or already used.',
      );
    return {
      restaurantName: invite.restaurant.name,
      ownerName: invite.owner.name,
      email: invite.owner.email,
    };
  }

  async acceptInvite(token: string, password: string) {
    this.enabled();
    const tokenHash = hash(token);
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction(async (tx) => {
      const invite = await tx.platformAdminInvite.findFirst({
        where: {
          tokenHash,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { restaurant: { select: { status: true } } },
      });
      if (!invite || invite.restaurant.status === 'DECLINED')
        throw new UnauthorizedException(
          'This owner setup link is invalid, expired, or already used.',
        );
      const consumed = await tx.platformAdminInvite.updateMany({
        where: {
          id: invite.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { acceptedAt: new Date() },
      });
      if (consumed.count !== 1)
        throw new ConflictException(
          'This owner setup link has already been used.',
        );
      await tx.user.update({
        where: { id: invite.ownerId },
        data: { passwordHash },
      });
      await tx.platformAdminAudit.create({
        data: {
          restaurantId: invite.restaurantId,
          action: 'restaurant.owner_setup_completed',
        },
      });
    });
    return { status: 'PASSWORD_SET' as const };
  }

  async bootstrap(input: {
    bootstrapSecret: string;
    email: string;
    name: string;
    password: string;
  }) {
    this.enabled();
    const configured = process.env.PLATFORM_ADMIN_BOOTSTRAP_SECRET || '';
    if (configured.length < 32 || !equal(input.bootstrapSecret, configured))
      throw new UnauthorizedException('Invalid bootstrap credentials.');
    const secret = generateSecret();
    const challengeToken = randomBytes(32).toString('base64url');
    const admin = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7349238042)`;
      if (await tx.platformAdmin.count())
        throw new ConflictException(
          'Platform admin has already been bootstrapped.',
        );
      return tx.platformAdmin.create({
        data: {
          email: input.email.toLowerCase(),
          name: input.name,
          passwordHash: await bcrypt.hash(input.password, 12),
          twoFactorSecret: sealSecret(secret, this.encryptionKey()),
          bootstrapChallengeHash: hash(challengeToken),
          bootstrapChallengeUntil: new Date(Date.now() + 10 * 60_000),
        },
      });
    });
    await this.audit(admin.id, 'platform_admin.bootstrap_started');
    return {
      challengeToken,
      secret,
      otpauthUrl: otpauthUrl(secret, admin.email, 'Tablevora Platform'),
    };
  }

  async confirmBootstrap(input: { challengeToken: string; code: string }) {
    this.enabled();
    const admin = await this.prisma.platformAdmin.findFirst({
      where: {
        bootstrapChallengeHash: hash(input.challengeToken),
        bootstrapChallengeUntil: { gt: new Date() },
      },
    });
    if (!admin?.twoFactorSecret)
      throw new UnauthorizedException('Bootstrap challenge expired.');
    const secret = openSecret(admin.twoFactorSecret, this.encryptionKey());
    const step = verifyTotp(secret, input.code);
    if (step === null)
      throw new UnauthorizedException('Invalid authenticator code.');
    const recoveryCodes = Array.from({ length: 8 }, generateRecoveryCode);
    const confirmed = await this.prisma.platformAdmin.updateMany({
      where: {
        id: admin.id,
        bootstrapChallengeHash: hash(input.challengeToken),
        bootstrapChallengeUntil: { gt: new Date() },
      },
      data: {
        twoFactorEnabled: true,
        twoFactorLastStep: step,
        twoFactorRecoveryHashes: recoveryCodes.map(hash),
        bootstrapChallengeHash: null,
        bootstrapChallengeUntil: null,
      },
    });
    if (confirmed.count !== 1)
      throw new ConflictException('Bootstrap challenge has already been used.');
    await this.audit(admin.id, 'platform_admin.bootstrap_completed');
    return { recoveryCodes, session: await this.issue(admin.id) };
  }

  private async issue(id: string) {
    const admin = await this.prisma.platformAdmin.findUniqueOrThrow({
      where: { id },
      select: { id: true, email: true, name: true, tokenVersion: true },
    });
    const token = await this.jwt.signAsync(
      { sub: admin.id, tokenVersion: admin.tokenVersion },
      { expiresIn: '8h' },
    );
    return {
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    };
  }

  async login(input: { email: string; password: string; code?: string }) {
    this.enabled();
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    const fail = async () => {
      if (admin) {
        const attempts = admin.failedTwoFactorAttempts + 1;
        await this.prisma.platformAdmin.update({
          where: { id: admin.id },
          data: {
            failedTwoFactorAttempts: attempts,
            twoFactorLockedUntil:
              attempts >= 5
                ? new Date(Date.now() + 15 * 60_000)
                : admin.twoFactorLockedUntil,
          },
        });
      }
      throw new UnauthorizedException('Invalid platform admin credentials.');
    };
    if (
      !admin ||
      !admin.isActive ||
      (admin.twoFactorLockedUntil && admin.twoFactorLockedUntil > new Date()) ||
      !(await bcrypt.compare(input.password, admin.passwordHash)) ||
      !admin.twoFactorEnabled ||
      !admin.twoFactorSecret ||
      !input.code
    )
      return fail();
    let acceptedStep: number | null = null;
    const secret = openSecret(admin.twoFactorSecret, this.encryptionKey());
    if (/^\d{6}$/.test(input.code))
      acceptedStep = verifyTotp(secret, input.code);
    const recovery = input.code.toUpperCase().replace(/\s/g, '');
    let usedRecoveryHash: string | null = null;
    if (acceptedStep === null)
      usedRecoveryHash =
        admin.twoFactorRecoveryHashes.find((entry) =>
          equal(entry, hash(recovery)),
        ) ?? null;
    if (acceptedStep === null && !usedRecoveryHash) return fail();
    if (
      acceptedStep !== null &&
      admin.twoFactorLastStep !== null &&
      acceptedStep <= admin.twoFactorLastStep
    )
      return fail();
    await this.prisma.platformAdmin.update({
      where: { id: admin.id },
      data: {
        failedTwoFactorAttempts: 0,
        twoFactorLockedUntil: null,
        ...(acceptedStep !== null
          ? { twoFactorLastStep: acceptedStep }
          : {
              twoFactorRecoveryHashes: admin.twoFactorRecoveryHashes.filter(
                (v) => v !== usedRecoveryHash,
              ),
            }),
      },
    });
    await this.audit(admin.id, 'platform_admin.login');
    return this.issue(admin.id);
  }

  async authenticate(token: string) {
    this.enabled();
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        tokenVersion: number;
      }>(token);
      const admin = await this.prisma.platformAdmin.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          tokenVersion: true,
        },
      });
      if (
        !admin ||
        !admin.isActive ||
        payload.tokenVersion !== admin.tokenVersion
      )
        throw new Error();
      return { id: admin.id, email: admin.email, name: admin.name };
    } catch {
      throw new UnauthorizedException('Platform admin session is invalid.');
    }
  }
  async logout(id: string) {
    await this.prisma.platformAdmin.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });
    await this.audit(id, 'platform_admin.logout');
  }

  async list(query: {
    status?: string;
    search?: string;
    page: number;
    pageSize: number;
  }) {
    const where: any = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              {
                users: {
                  some: {
                    email: { contains: query.search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.restaurant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          users: {
            where: { role: { name: 'OWNER' } },
            take: 1,
            select: { id: true, name: true, email: true },
          },
          _count: { select: { branches: true, users: true } },
        },
      }),
      this.prisma.restaurant.count({ where }),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        owner: r.users[0] ?? null,
        branchCount: r._count.branches,
        staffCount: r._count.users,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }
  async detail(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        users: {
          where: { role: { name: 'OWNER' } },
          take: 1,
          select: { id: true, name: true, email: true },
        },
        branches: { select: { id: true, name: true } },
      },
    });
    if (!restaurant) throw new UnauthorizedException('Restaurant not found.');
    const audit = await this.prisma.platformAdminAudit.findMany({
      where: { restaurantId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { actor: { select: { name: true } } },
    });
    const ownerSetupPending = restaurant.users[0]
      ? Boolean(
          await this.prisma.platformAdminInvite.findFirst({
            where: {
              ownerId: restaurant.users[0].id,
              acceptedAt: null,
              revokedAt: null,
            },
            select: { id: true },
          }),
        )
      : false;
    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        status: restaurant.status,
        createdAt: restaurant.createdAt.toISOString(),
        owner: restaurant.users[0] ?? null,
        branchCount: restaurant.branches.length,
        staffCount: await this.prisma.user.count({
          where: { restaurantId: id },
        }),
      },
      ownerSetupPending,
      branches: restaurant.branches,
      audit: audit.map((a) => ({
        id: a.id,
        actorName: a.actor?.name ?? null,
        restaurantId: a.restaurantId,
        action: a.action,
        metadata: a.metadata,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }
  async setStatus(
    actorId: string,
    id: string,
    status: 'ACTIVE' | 'READ_ONLY' | 'DECLINED',
  ) {
    const tenant = await this.prisma.restaurant.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!tenant) throw new UnauthorizedException('Restaurant not found.');
    const allowed =
      tenant.status === 'PENDING'
        ? ['ACTIVE', 'DECLINED']
        : tenant.status === 'ACTIVE'
          ? ['READ_ONLY']
          : tenant.status === 'READ_ONLY'
            ? ['ACTIVE']
            : [];
    if (!allowed.includes(status))
      throw new ConflictException('Invalid restaurant status transition.');
    await this.prisma.$transaction([
      this.prisma.restaurant.update({ where: { id }, data: { status } }),
      this.prisma.platformAdminAudit.create({
        data: {
          actorId,
          restaurantId: id,
          action: 'restaurant.status_changed',
          metadata: { from: tenant.status, to: status },
        },
      }),
    ]);
    return { id, status };
  }
}
