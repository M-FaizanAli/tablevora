import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const schemaName = 'tablevora_migration_test_' + Date.now();
const envText = readFileSync('.env', 'utf8');
const line = envText.split(/\r?\n/).find((item) => item.startsWith('DATABASE_URL='));
if (!line) throw new Error('apps/backend/.env must have DATABASE_URL configured.');
const baseUrl = line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
const isolatedUrl = new URL(baseUrl);
isolatedUrl.searchParams.set('schema', schemaName);
const admin = new PrismaClient({ datasources: { db: { url: baseUrl } } });
let created = false;
try {
  const exists = await admin.$queryRawUnsafe('SELECT 1 FROM information_schema.schemata WHERE schema_name = $1', schemaName);
  if (exists.length) throw new Error('Refusing to reuse an existing test schema.');
  await admin.$executeRawUnsafe('CREATE SCHEMA "' + schemaName + '"');
  created = true;
  const result = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: isolatedUrl.toString() },
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error('Migration deployment exited with status ' + result.status);
  const isolated = new PrismaClient({ datasources: { db: { url: isolatedUrl.toString() } } });
  try {
    const restaurants = await isolated.restaurant.count();
    console.log('Migrations applied successfully to isolated schema (' + restaurants + ' restaurants; fresh schema expected 0).');
  } finally { await isolated.$disconnect(); }
} finally {
  if (created) await admin.$executeRawUnsafe('DROP SCHEMA "' + schemaName + '" CASCADE');
  await admin.$disconnect();
}
