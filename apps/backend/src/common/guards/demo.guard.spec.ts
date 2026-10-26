import { DemoGuard } from './demo.guard';
import type { ExecutionContext } from '@nestjs/common';

describe('shared demo restrictions', () => {
  const previous = process.env.DEMO_MODE;
  const guard = new DemoGuard();
  const request = (method: string, path: string) => ({ switchToHttp: () => ({ getRequest: () => ({ method, path }) }) }) as ExecutionContext;
  beforeEach(() => { process.env.DEMO_MODE = 'true'; });
  afterAll(() => { if (previous === undefined) delete process.env.DEMO_MODE; else process.env.DEMO_MODE = previous; });
  it.each([['POST','/api/v1/auth/register'],['POST','/api/v1/auth/2fa/setup'],['PATCH','/api/v1/settings'],['GET','/api/v1/backups'],['GET','/api/v1/integration-api-keys'],['GET','/api/v1/staff-api-keys'],['POST','/api/v1/orders/print/test'],['POST','/api/v1/orders/delete-bulk'],['POST','/api/v1/kds/tickets/one/print']])('blocks %s %s', (method,path) => {
    expect(() => guard.canActivate(request(method,path))).toThrow();
  });
  it.each([['GET','/api/v1/orders'],['POST','/api/v1/auth/login'],['POST','/api/v1/orders'],['POST','/api/v1/orders/one/checkout'],['PATCH','/api/v1/kds/tickets/one/status']])('allows %s %s', (method,path) => {
    expect(guard.canActivate(request(method,path))).toBe(true);
  });
  it('does not restrict regular installations', () => {
    process.env.DEMO_MODE = 'false';
    expect(guard.canActivate(request('POST','/api/v1/auth/register'))).toBe(true);
  });
});
