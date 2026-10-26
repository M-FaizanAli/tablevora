import { inspectCertificate } from './verifactu.aeat';
import { testCertificate } from './test-certificate';

describe('PKCS12 certificate inspection', () => {
  const cert = testCertificate('Tablevora certificate test', 'test-pass');
  it('reads a certificate with its matching private key', () => {
    const info = inspectCertificate(cert.pfx, 'test-pass');
    expect(info.subject).toContain('CN=Tablevora certificate test');
    expect(info.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
  it('rejects a wrong password without exposing it', () => {
    expect(() => inspectCertificate(cert.pfx, 'wrong-secret')).toThrow('Cannot read the certificate');
  });
  it('rejects arbitrary non-certificate input', () => {
    expect(() => inspectCertificate(Buffer.from('invalid'), 'test-pass')).toThrow('Cannot read the certificate');
  });
});
