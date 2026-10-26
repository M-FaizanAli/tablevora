import { UnauthorizedException } from '@nestjs/common';
import { base32Decode, generateSecret, hotp, sealSecret, stepAt } from './totp';
import { TwoFactorService } from './two-factor.service';
import * as bcrypt from 'bcrypt';

const KEY = 'unit-test-key';
function setup(lastStep: number | null = null) {
  const secret = generateSecret();
  const user = {
    id: 'u1', isActive: true, twoFactorEnabled: true,
    twoFactorSecret: sealSecret(secret, KEY), twoFactorRecoveryHashes: [] as string[],
    twoFactorLastStep: lastStep, failedTwoFactorAttempts: 0, twoFactorLockedUntil: null as Date | null,
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: user.id }]),
    user: {
      findUniqueOrThrow: jest.fn().mockImplementation(() => ({ ...user })),
      update: jest.fn().mockImplementation(({ data }: { data: Partial<typeof user> }) => Object.assign(user, data)),
    },
  };
  // A shared serialized store models the row lock used by separate service instances.
  let pending = Promise.resolve<unknown>(undefined);
  const prisma = { $transaction: (run: (t: typeof tx) => Promise<unknown>) => {
    const next = pending.then(() => run(tx));
    pending = next.catch(() => undefined);
    return next;
  } };
  const config = { get: () => KEY, getOrThrow: () => KEY };
  const createService = () => new TwoFactorService(prisma as never, config as never, { record: jest.fn() } as never);
  const codeAt = (offset = 0) => hotp(base32Decode(secret), stepAt(Date.now()) + offset);
  return { svc: createService(), createService, user, tx, codeAt };
}

describe('persistent two-factor attempt budget', () => {
  it('accepts a valid code once and rejects replay from a stale caller', async () => {
    const { svc, user, codeAt } = setup();
    const stale = { ...user };
    const code = codeAt();
    await expect(svc.verifyLogin(user, code)).resolves.toBeUndefined();
    await expect(svc.verifyLogin(stale, code)).rejects.toThrow('Invalid verification code');
  });
  it('asks for a missing code', async () => {
    const { svc, user } = setup();
    await expect(svc.verifyLogin(user, undefined)).rejects.toThrow('TWO_FACTOR_REQUIRED');
  });
  it('shares lockout between instances and preserves it after recreation', async () => {
    const { svc, createService, user, codeAt } = setup();
    const another = createService();
    for (let i = 0; i < 5; i++) await expect((i % 2 ? svc : another).verifyLogin(user, 'invalid')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(user.failedTwoFactorAttempts).toBe(5);
    await expect(createService().verifyLogin(user, codeAt())).rejects.toThrow(/Too many/);
  });
  it('allows a fresh attempt after the persisted lock expires', async () => {
    const { svc, user, codeAt } = setup();
    user.failedTwoFactorAttempts = 5;
    user.twoFactorLockedUntil = new Date(Date.now() - 1);
    await expect(svc.verifyLogin(user, codeAt())).resolves.toBeUndefined();
    expect(user.failedTwoFactorAttempts).toBe(0);
    expect(user.twoFactorLockedUntil).toBeNull();
  });
  it('accepts only one of two simultaneous uses of the same code', async () => {
    const { svc, createService, user, codeAt } = setup();
    const results = await Promise.allSettled([svc.verifyLogin({ ...user }, codeAt()), createService().verifyLogin({ ...user }, codeAt())]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
  it('consumes a recovery code once even when the caller has stale hashes', async () => {
    const { svc, user } = setup();
    user.twoFactorRecoveryHashes = [await bcrypt.hash('TESTRECOVERY', 4)];
    const stale = { ...user };
    await svc.verifyLogin(user, 'TEST-RECOVERY');
    await expect(svc.verifyLogin(stale, 'TEST-RECOVERY')).rejects.toThrow('Invalid verification code');
    expect(user.twoFactorRecoveryHashes).toHaveLength(0);
  });
});
