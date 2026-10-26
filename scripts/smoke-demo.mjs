// Run against a dedicated seeded demo API: node scripts/smoke-demo.mjs http://localhost:4101
import assert from 'node:assert/strict';
const base = process.argv[2];
if (!base) throw new Error('Pass a dedicated demo API URL');
let cookie = '';
const req = (path, method = 'GET', body, overrideCookie) => fetch(base + '/api/v1' + path, { method, headers: { 'Content-Type': 'application/json', Cookie: overrideCookie ?? cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
const login = await req('/auth/login', 'POST', { email: 'owner@demo.local', password: 'Password123!' });
assert.equal(login.status, 201, `login: ${await login.clone().text()}`);
cookie = login.headers.get('set-cookie').split(';')[0];
assert.equal((await req('/auth/me')).status, 200);
for (const query of ['', '?branchId=', '?branchId=%20', '?branchId=demo-branch&branchId=another']) {
  assert.equal((await req('/customers'+query)).status, 400, `Malformed branch ${query}`);
}
assert.equal((await req('/customers?branchId=another-tenant')).status, 403);
assert.equal((await req('/customers?branchId=demo-branch')).status, 200);
assert.equal((await req('/auth/2fa/setup', 'POST')).status, 403);
assert.equal((await req('/orders/print/test', 'POST', {})).status, 403);
const logout = await req('/auth/logout', 'POST');
assert.equal(logout.status, 201);
assert.equal((await req('/auth/me', 'GET', undefined, cookie)).status, 401, 'Copied JWT must fail after logout');
const docs = await fetch(base + '/api/docs');
assert.equal(docs.status, 404);
console.log('PASS: login, tenant isolation, malformed branch inputs, demo restrictions, copied-token revocation, Swagger disabled');
