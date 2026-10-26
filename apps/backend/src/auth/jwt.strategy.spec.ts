import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';

describe('session revocation', () => {
  const user = { id: 'u1', restaurantId: 'r1', name: 'Owner', roleId: 'role1', isActive: true, tokenVersion: 2, role: { name: 'OWNER', permissions: [] } };
  const findUnique = jest.fn().mockResolvedValue(user);
  const strategy = new JwtStrategy(new ConfigService({ JWT_SECRET: 'test-only-key' }), { user: { findUnique } } as never);
  it('allows the current session version', async () => {
    await expect(strategy.validate({ sub: 'u1', tokenVersion: 2 })).resolves.toMatchObject({ id: 'u1' });
  });
  it.each([undefined, 0, 1, 3])('rejects stale or unversioned JWT %p', async (tokenVersion) => {
    await expect(strategy.validate({ sub: 'u1', tokenVersion: tokenVersion as number })).rejects.toThrow('Session no longer valid');
  });
  it('persists revocation before disconnecting realtime clients', async () => {
    const update = jest.fn().mockResolvedValue({});
    const disconnectUser = jest.fn();
    const svc = new AuthService({ user: { update } } as never, {} as never, {} as never, { disconnectUser } as never);
    await svc.logout('u1');
    expect(update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { tokenVersion: { increment: 1 } } });
    expect(disconnectUser).toHaveBeenCalledWith('u1');
  });
});
