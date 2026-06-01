#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function main() {
  const argEmail = normalizeEmail(process.argv[2]);
  const envEmail = normalizeEmail(process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL);
  const email = argEmail || envEmail;

  if (!email || !email.includes('@')) {
    console.error('Usage: node astro-app/scripts/bootstrap-super-admin.mjs <email>');
    console.error('Or set BOOTSTRAP_SUPER_ADMIN_EMAIL environment variable.');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  if (!user) {
    console.error(`User not found for email: ${email}`);
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: 'super_admin',
      active: true,
    },
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  await prisma.adminActionAudit.create({
    data: {
      action: 'bootstrap_super_admin',
      adminUserId: updated.id,
      adminEmail: updated.email,
      targetUserId: updated.id,
      targetEmail: updated.email,
      metadata: {
        previousRole: user.role,
        nextRole: updated.role,
        source: 'bootstrap_script',
      },
    },
  }).catch(() => null);

  console.log('Super admin bootstrap completed:');
  console.log(`- id: ${updated.id}`);
  console.log(`- name: ${updated.name}`);
  console.log(`- email: ${updated.email}`);
  console.log(`- role: ${updated.role}`);
}

main()
  .catch((error) => {
    console.error('Bootstrap failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
