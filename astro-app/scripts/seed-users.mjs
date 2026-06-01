import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);
  const strongPassword = await bcrypt.hash('StrongPass123!', 10);

  // Admin
  await prisma.user.upsert({
    where: { email: 'admin@coach.com' },
    update: { password, role: 'super_admin', active: true },
    create: {
      email: 'admin@coach.com',
      name: 'Super Admin',
      password,
      role: 'super_admin',
      active: true,
    },
  });

  // Coach
  const coach = await prisma.user.upsert({
    where: { email: 'coach@coach.com' },
    update: { password, role: 'coach', active: true, subscriptionStatus: 'active', referralCode: 'TESTCOACH' },
    create: {
      email: 'coach@coach.com',
      name: 'Test Coach',
      password,
      role: 'coach',
      active: true,
      subscriptionStatus: 'active',
      referralCode: 'TESTCOACH',
    },
  });

  const existingPackage = await prisma.coachPackage.findFirst({
    where: { coachId: coach.id, isActive: true },
  });

  const activePackage = existingPackage || await prisma.coachPackage.create({
    data: {
      coachId: coach.id,
      name: 'Seed Package',
      description: 'Seed test package',
      price: 1000,
      durationWeeks: 4,
      isActive: true,
    },
  });

  // Student
  await prisma.user.upsert({
    where: { email: 'student@coach.com' },
    update: {
      password,
      role: 'student',
      active: true,
      coachId: coach.id,
      studentPaymentStatus: 'paid',
      studentPaidAt: new Date(),
      selectedPackageId: activePackage.id,
    },
    create: {
      email: 'student@coach.com',
      name: 'Test Student',
      password,
      role: 'student',
      active: true,
      coachId: coach.id,
      studentPaymentStatus: 'paid',
      studentPaidAt: new Date(),
      selectedPackageId: activePackage.id,
    },
  });

  // Mobile password-change test user
  await prisma.user.upsert({
    where: { email: 'mobile-test@coach.com' },
    update: {
      password: strongPassword,
      role: 'student',
      active: true,
      coachId: coach.id,
      studentPaymentStatus: 'paid',
      studentPaidAt: new Date(),
      selectedPackageId: activePackage.id,
    },
    create: {
      email: 'mobile-test@coach.com',
      name: 'Mobile Test Student',
      password: strongPassword,
      role: 'student',
      active: true,
      coachId: coach.id,
      studentPaymentStatus: 'paid',
      studentPaidAt: new Date(),
      selectedPackageId: activePackage.id,
    },
  });

  console.log('Seed done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
