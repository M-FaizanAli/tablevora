import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService restaurant lifecycle login', () => {
  const owner = {
    id: 'user-1',
    restaurantId: 'restaurant-1',
    name: 'Owner',
    roleId: 'role-1',
    tokenVersion: 0,
    passwordHash: '',
    twoFactorEnabled: false,
    isActive: true,
    role: { name: 'OWNER', permissions: [] },
  };
  const serviceFor = (status: string | null) => {
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue(owner) },
      restaurant: {
        findUnique: jest.fn().mockResolvedValue(status ? { status } : null),
      },
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('tenant-token') };
    const twoFactor = { verifyLogin: jest.fn() };
    const realtime = { disconnectUser: jest.fn() };
    return {
      service: new AuthService(
        prisma as never,
        jwt as never,
        twoFactor as never,
        realtime as never,
      ),
      jwt,
    };
  };

  beforeAll(async () => {
    owner.passwordHash = await bcrypt.hash('correct-password', 4);
  });

  it.each(['PENDING', 'DECLINED', null])(
    'denies login for status %s',
    async (status) => {
      const { service, jwt } = serviceFor(status);
      await expect(
        service.login({
          email: 'owner@example.test',
          password: 'correct-password',
        } as never),
      ).rejects.toMatchObject({ status: 401 });
      expect(jwt.signAsync).not.toHaveBeenCalled();
    },
  );

  it('allows an approved read-only owner to sign in', async () => {
    const { service, jwt } = serviceFor('READ_ONLY');
    await expect(
      service.login({
        email: 'owner@example.test',
        password: 'correct-password',
      } as never),
    ).resolves.toMatchObject({ token: 'tenant-token' });
    expect(jwt.signAsync).toHaveBeenCalledTimes(1);
  });
});
