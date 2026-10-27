import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const rl = createInterface({ input: stdin, output: stdout });
try {
  const admins = await prisma.platformAdmin.findMany({ select: { id: true, email: true } });
  if (admins.length > 1) throw new Error('Expected one Platform Admin, found multiple. Manual incident response is required.');
  if (!admins.length) { console.log('No platform admin exists. Configure PLATFORM_ADMIN_BOOTSTRAP_SECRET and use /platform-admin/bootstrap.'); process.exitCode = 0; }
  else {
    const email = admins[0].email;
    console.log(`This recovery removes the single Platform Admin (${email}) so bootstrap can be performed again.`);
    console.log('Existing audit records are retained; their actor reference will be cleared.');
    const confirmation = await rl.question(`Type ${email} to continue: `);
    if (confirmation !== email) throw new Error('Confirmation did not match; no changes made.');
    await prisma.platformAdmin.delete({ where: { id: admins[0].id } });
    console.log('Platform Admin removed. Set a new strong PLATFORM_ADMIN_BOOTSTRAP_SECRET, restart the service, then use the one-time bootstrap page.');
  }
} finally { rl.close(); await prisma.$disconnect(); }
