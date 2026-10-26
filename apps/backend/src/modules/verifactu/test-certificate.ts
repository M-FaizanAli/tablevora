// Test-only certificate fixture; production certificate parsing uses native crypto.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function testCertificate(cn: string, password = 'pw', san?: string) {
  const dir = mkdtempSync(join(tmpdir(), 'tablevora-cert-'));
  const key = join(dir, 'key.pem');
  const cert = join(dir, 'cert.pem');
  const pfx = join(dir, 'cert.p12');
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30', '-subj', `/CN=${cn}`, '-keyout', key, '-out', cert, ...(san ? ['-addext', `subjectAltName=DNS:${san}`] : [])], { stdio: 'pipe' });
    execFileSync('openssl', ['pkcs12', '-export', '-keypbe', 'AES-256-CBC', '-certpbe', 'AES-256-CBC', '-macalg', 'sha256', '-inkey', key, '-in', cert, '-out', pfx, '-passout', 'env:TABLEVORA_TEST_PASSWORD'], { env: { ...process.env, TABLEVORA_TEST_PASSWORD: password }, stdio: 'pipe' });
    return { pem: readFileSync(cert, 'utf8'), keyPem: readFileSync(key, 'utf8'), pfx: readFileSync(pfx) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
