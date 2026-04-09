import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const stamp = Date.now();
  const subscriptionCoachEmail = `sandbox.subscription.coach.${stamp}@example.com`;
  const marketplaceCoachEmail = `sandbox.marketplace.coach.${stamp}@example.com`;
  const studentEmail = `sandbox.student.${stamp}@example.com`;
  const password = 'Test123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const envSubMerchantKey = String(process.env.IYZICO_MARKETPLACE_TEST_SUBMERCHANT_KEY || '').trim();
  const envSubMerchantExternalId = String(process.env.IYZICO_MARKETPLACE_TEST_SUBMERCHANT_EXTERNAL_ID || '').trim();
  const envIban = String(process.env.IYZICO_MARKETPLACE_TEST_IBAN || '').trim();

  if ((envSubMerchantKey && !envSubMerchantExternalId) || (!envSubMerchantKey && envSubMerchantExternalId)) {
    throw new Error('IYZICO_MARKETPLACE_TEST_SUBMERCHANT_KEY ve IYZICO_MARKETPLACE_TEST_SUBMERCHANT_EXTERNAL_ID birlikte verilmelidir.');
  }

  const coachSubMerchantKey = envSubMerchantKey || `subm_${stamp}`;
  const coachSubMerchantExternalId = envSubMerchantExternalId || `coach_${stamp}`;

  const subscriptionCoach = await prisma.user.create({
    data: {
      name: 'Sandbox Subscription Coach',
      email: subscriptionCoachEmail,
      password: passwordHash,
      role: 'coach',
      active: true,
      subscriptionStatus: 'pending',
      referralCode: `SB${String(stamp).slice(-6)}A`,
      phone: '05003334455',
    },
  });

  let marketplaceCoach = envSubMerchantKey
    ? await prisma.user.findFirst({
      where: { iyzicoSubMerchantKey: envSubMerchantKey },
      select: { id: true, email: true },
    })
    : null;

  let reusedMarketplaceCoach = false;

  if (marketplaceCoach) {
    reusedMarketplaceCoach = true;
    await prisma.user.update({
      where: { id: marketplaceCoach.id },
      data: {
        role: 'coach',
        active: true,
        iyzicoSubMerchantExternalId: coachSubMerchantExternalId,
        iyzicoSubMerchantType: 'PERSONAL',
        iyzicoSubMerchantStatus: 'active',
        iyzicoIdentityNumber: '11111111111',
        iyzicoIban: envIban || 'TR330006100519786457841326',
        iyzicoAddress: 'Istanbul',
        iyzicoCity: 'Istanbul',
        iyzicoZipCode: '34000',
        iyzicoPayoutReadyAt: new Date(),
        iyzicoLastSyncAt: new Date(),
      },
    });
  } else {
    marketplaceCoach = await prisma.user.create({
      data: {
        name: 'Sandbox Marketplace Coach',
        email: marketplaceCoachEmail,
        password: passwordHash,
        role: 'coach',
        active: true,
        subscriptionStatus: 'pending',
        referralCode: `SB${String(stamp).slice(-6)}B`,
        iyzicoSubMerchantKey: coachSubMerchantKey,
        iyzicoSubMerchantExternalId: coachSubMerchantExternalId,
        iyzicoSubMerchantType: 'PERSONAL',
        iyzicoSubMerchantStatus: 'active',
        iyzicoIdentityNumber: '11111111111',
        iyzicoIban: envIban || 'TR330006100519786457841326',
        iyzicoAddress: 'Istanbul',
        iyzicoCity: 'Istanbul',
        iyzicoZipCode: '34000',
        iyzicoPayoutReadyAt: new Date(),
        iyzicoLastSyncAt: new Date(),
        phone: '05001112233',
      },
      select: { id: true, email: true },
    });
  }

  const coachPackage = await prisma.coachPackage.create({
    data: {
      coachId: marketplaceCoach.id,
      name: 'Sandbox Ogrenci Paketi',
      description: 'E2E test paketi',
      price: 1200,
      durationWeeks: 4,
      isActive: true,
    },
  });

  const student = await prisma.user.create({
    data: {
      name: 'Sandbox Student',
      email: studentEmail,
      password: passwordHash,
      role: 'student',
      active: false,
      coachId: marketplaceCoach.id,
      studentPaymentStatus: 'pending',
      phone: '05002223344',
    },
  });

  const studentCheckoutRes = await fetch('http://localhost:4321/api/payments/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: student.id, packageId: coachPackage.id }),
  });
  const studentCheckoutBody = await studentCheckoutRes.json().catch(() => ({}));

  const coachCheckoutRes = await fetch('http://localhost:4321/api/payments/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: subscriptionCoach.id }),
  });
  const coachCheckoutBody = await coachCheckoutRes.json().catch(() => ({}));

  const transactions = await prisma.paymentTransaction.findMany({
    where: {
      OR: [{ payerId: subscriptionCoach.id }, { payerId: student.id }],
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      type: true,
      status: true,
      provider: true,
      amount: true,
      metadata: true,
      createdAt: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        credentials: { email: subscriptionCoachEmail, password },
        subscriptionCoachId: subscriptionCoach.id,
        marketplaceCoachId: marketplaceCoach.id,
        marketplaceCoachEmail: marketplaceCoach.email,
        reusedMarketplaceCoach,
        studentId: student.id,
        packageId: coachPackage.id,
        marketplaceSeed: {
          usedEnvSubMerchant: Boolean(envSubMerchantKey && envSubMerchantExternalId),
          subMerchantKey: coachSubMerchantKey,
          subMerchantExternalId: coachSubMerchantExternalId,
        },
        studentCheckout: {
          status: studentCheckoutRes.status,
          ok: studentCheckoutRes.ok,
          body: studentCheckoutBody,
        },
        coachCheckout: {
          status: coachCheckoutRes.status,
          ok: coachCheckoutRes.ok,
          body: coachCheckoutBody,
        },
        transactions,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
