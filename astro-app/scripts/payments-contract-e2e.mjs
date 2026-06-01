#!/usr/bin/env node

import { createHmac } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

const baseUrl = (process.env.PAYMENTS_CONTRACT_BASE_URL || 'http://localhost:4321').replace(/\/+$/, '');
const origin = process.env.PAYMENTS_CONTRACT_ORIGIN || baseUrl;
const paymentSecret =
  process.env.PAYMENT_LINK_SECRET ||
  process.env.PAYMENTS_CONTRACT_PAYMENT_SECRET ||
  process.env.IYZICO_SECRET_KEY ||
  'coachpro-dev-payment-secret-change-me';
const webhookSecret = process.env.IYZICO_WEBHOOK_SECRET || paymentSecret || '';
const tokenTtlSeconds = Number(process.env.PAYMENTS_CONTRACT_TOKEN_TTL_SECONDS || 3600);

const QA = {
  coach: {
    email: 'qa.coach.contract@example.com',
    name: 'QA Contract Coach',
    role: 'coach',
    sessionToken: 'qa_contract_coach_session_0001',
  },
  student: {
    email: 'qa.student.contract@example.com',
    name: 'QA Contract Student',
    role: 'student',
    sessionToken: 'qa_contract_student_session_0001',
  },
};

const QA_PASSWORD_HASH = '$2b$12$k9UEVfTk1lA7Y21Yhx9v9OP1LQDgY17M2E4WQxHyfKVJkQW8C9sNq';

const prisma = new PrismaClient();
const results = [];

function buildUrl(pathname) {
  return `${baseUrl}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function buildPaymentAccessToken(userId) {
  const expiresAt = Date.now() + tokenTtlSeconds * 1000;
  const payload = `${userId}.${expiresAt}`;
  const signature = createHmac('sha256', paymentSecret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function buildWebhookPath(sessionId, userId) {
  const params = new URLSearchParams({
    transactionId: String(sessionId),
    userId: String(userId),
  });

  if (webhookSecret) {
    const signature = createHmac('sha256', webhookSecret)
      .update(`${sessionId}:${userId}`)
      .digest('hex');
    params.set('sig', signature);
  }

  return `/api/payments/webhook?${params.toString()}`;
}

function toSnippet(text) {
  if (!text) return '';
  return text.length > 300 ? `${text.slice(0, 300)}...` : text;
}

async function sendRequest({ method, path, headers = {}, body }) {
  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  const init = {
    method,
    headers: requestHeaders,
    redirect: 'manual',
  };

  if (body !== undefined) {
    if (body instanceof URLSearchParams) {
      init.body = body;
    } else if (typeof body === 'string') {
      requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
      init.body = body;
    } else {
      requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
      init.body = JSON.stringify(body);
    }
  }

  const response = await fetch(buildUrl(path), init);
  const text = await response.text();

  return {
    status: response.status,
    headers: response.headers,
    text,
  };
}

function pushResult(name, pass, details = {}) {
  results.push({
    name,
    pass,
    ...details,
  });
}

async function ensureQaData() {
  const coach = await prisma.user.upsert({
    where: { email: QA.coach.email },
    update: {
      name: QA.coach.name,
      role: QA.coach.role,
      password: QA_PASSWORD_HASH,
      active: true,
      subscriptionStatus: 'active',
      referralCode: 'QACTR001',
      iyzicoSubMerchantKey: 'mock-sub-merchant-contract-coach',
      iyzicoSubMerchantExternalId: 'coach_contract_external',
      iyzicoSubMerchantType: 'PERSONAL',
      iyzicoSubMerchantStatus: 'active',
      iyzicoIdentityNumber: '11111111111',
      iyzicoIban: 'TR000000000000000000000000',
      iyzicoAddress: 'Istanbul Test Address',
      iyzicoCity: 'Istanbul',
      iyzicoZipCode: '34000',
      iyzicoPayoutReadyAt: new Date(),
      iyzicoLastError: null,
    },
    create: {
      email: QA.coach.email,
      name: QA.coach.name,
      role: QA.coach.role,
      password: QA_PASSWORD_HASH,
      active: true,
      subscriptionStatus: 'active',
      referralCode: 'QACTR001',
      iyzicoSubMerchantKey: 'mock-sub-merchant-contract-coach',
      iyzicoSubMerchantExternalId: 'coach_contract_external',
      iyzicoSubMerchantType: 'PERSONAL',
      iyzicoSubMerchantStatus: 'active',
      iyzicoIdentityNumber: '11111111111',
      iyzicoIban: 'TR000000000000000000000000',
      iyzicoAddress: 'Istanbul Test Address',
      iyzicoCity: 'Istanbul',
      iyzicoZipCode: '34000',
      iyzicoPayoutReadyAt: new Date(),
      iyzicoLastError: null,
    },
    select: { id: true, email: true },
  });

  const student = await prisma.user.upsert({
    where: { email: QA.student.email },
    update: {
      name: QA.student.name,
      role: QA.student.role,
      coachId: coach.id,
      password: QA_PASSWORD_HASH,
      active: false,
      studentPaymentStatus: 'pending',
      studentPaidAt: null,
      studentAccessEnd: null,
      selectedPackageId: null,
    },
    create: {
      email: QA.student.email,
      name: QA.student.name,
      role: QA.student.role,
      coachId: coach.id,
      password: QA_PASSWORD_HASH,
      active: false,
      studentPaymentStatus: 'pending',
      studentAccessEnd: null,
      selectedPackageId: null,
    },
    select: { id: true, email: true },
  });

  const packageName = 'QA Contract Starter Package';
  let packageRecord = await prisma.coachPackage.findFirst({
    where: {
      coachId: coach.id,
      name: packageName,
    },
    select: { id: true },
  });

  if (!packageRecord) {
    packageRecord = await prisma.coachPackage.create({
      data: {
        coachId: coach.id,
        name: packageName,
        description: 'Contract E2E package',
        price: 250,
        durationWeeks: 4,
        isActive: true,
      },
      select: { id: true },
    });
  } else {
    await prisma.coachPackage.update({
      where: { id: packageRecord.id },
      data: {
        description: 'Contract E2E package',
        price: 250,
        durationWeeks: 4,
        isActive: true,
      },
    });
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.upsert({
    where: { token: QA.coach.sessionToken },
    update: { userId: coach.id, expiresAt },
    create: {
      userId: coach.id,
      token: QA.coach.sessionToken,
      expiresAt,
    },
  });

  await prisma.session.upsert({
    where: { token: QA.student.sessionToken },
    update: { userId: student.id, expiresAt },
    create: {
      userId: student.id,
      token: QA.student.sessionToken,
      expiresAt,
    },
  });

  return {
    coachId: coach.id,
    studentId: student.id,
    packageId: packageRecord.id,
  };
}

async function assertTransactionStatus(transactionId, expectedStatus) {
  const tx = await prisma.paymentTransaction.findUnique({
    where: { id: transactionId },
    select: {
      id: true,
      status: true,
      metadata: true,
    },
  });

  return {
    ok: Boolean(tx && tx.status === expectedStatus),
    tx,
  };
}

async function assertStudentPaid(studentId, expectedPaid) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      active: true,
      studentPaymentStatus: true,
      studentAccessEnd: true,
      selectedPackageId: true,
    },
  });

  if (!student) {
    return false;
  }

  if (expectedPaid) {
    return (
      student.active === true &&
      student.studentPaymentStatus === 'paid' &&
      Boolean(student.selectedPackageId) &&
      Boolean(student.studentAccessEnd)
    );
  }

  return student.studentPaymentStatus !== 'paid';
}

async function runInactivePayoutStatusBlocked(context) {
  await prisma.user.update({
    where: { id: context.coachId },
    data: {
      iyzicoSubMerchantStatus: 'pending_review',
      iyzicoPayoutReadyAt: new Date(),
    },
  });

  const paymentToken = buildPaymentAccessToken(context.studentId);

  const checkout = await sendRequest({
    method: 'POST',
    path: '/api/payments/create-checkout-session',
    headers: {
      Cookie: `payment_access_token=${paymentToken}`,
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: {
      userId: context.studentId,
      packageId: context.packageId,
    },
  });

  let message = '';
  try {
    message = String(JSON.parse(checkout.text)?.error || '');
  } catch {
    message = checkout.text;
  }

  const pass = checkout.status === 400 && message.toLowerCase().includes('aktif degil');
  pushResult('payment blocked when coach payout status inactive', pass, {
    status: checkout.status,
    bodySnippet: toSnippet(checkout.text),
  });

  await prisma.user.update({
    where: { id: context.coachId },
    data: {
      iyzicoSubMerchantStatus: 'active',
      iyzicoPayoutReadyAt: new Date(),
    },
  });
}

async function runSuccessFlow(context) {
  const paymentToken = buildPaymentAccessToken(context.studentId);

  const checkout = await sendRequest({
    method: 'POST',
    path: '/api/payments/create-checkout-session',
    headers: {
      Cookie: `payment_access_token=${paymentToken}`,
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: {
      userId: context.studentId,
      packageId: context.packageId,
    },
  });

  if (checkout.status !== 200) {
    pushResult('payment success flow - checkout create', false, {
      status: checkout.status,
      bodySnippet: toSnippet(checkout.text),
    });
    return null;
  }

  const checkoutBody = JSON.parse(checkout.text);
  const sessionId = String(checkoutBody.sessionId || '').trim();

  if (!sessionId) {
    pushResult('payment success flow - checkout session id', false, {
      status: checkout.status,
      bodySnippet: toSnippet(checkout.text),
    });
    return null;
  }

  pushResult('payment success flow - checkout create', true, {
    status: checkout.status,
    sessionId,
  });

  const webhook = await sendRequest({
    method: 'POST',
    path: buildWebhookPath(sessionId, context.studentId),
    body: new URLSearchParams({ token: `mock-token-${sessionId}` }),
    headers: {
      Origin: origin,
    },
  });

  const location = webhook.headers.get('location') || '';
  const webhookPass = webhook.status === 302 && location.includes('/auth/payment?');

  pushResult('payment success flow - webhook callback', webhookPass, {
    status: webhook.status,
    location,
    bodySnippet: toSnippet(webhook.text),
  });

  const txCheck = await assertTransactionStatus(sessionId, 'paid');
  pushResult('payment success flow - transaction paid', txCheck.ok, {
    transactionId: sessionId,
    status: txCheck.tx?.status || null,
  });

  const studentPaid = await assertStudentPaid(context.studentId, true);
  pushResult('payment success flow - student activated', studentPaid, {
    studentId: context.studentId,
  });

  return sessionId;
}

async function runFailAndRetryFlow(context) {
  await prisma.user.update({
    where: { id: context.studentId },
    data: {
      active: false,
      studentPaymentStatus: 'pending',
      studentPaidAt: null,
      studentAccessEnd: null,
      selectedPackageId: null,
    },
  });

  const paymentToken = buildPaymentAccessToken(context.studentId);

  const failCheckout = await sendRequest({
    method: 'POST',
    path: '/api/payments/create-checkout-session',
    headers: {
      Cookie: `payment_access_token=${paymentToken}`,
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: {
      userId: context.studentId,
      packageId: context.packageId,
    },
  });

  if (failCheckout.status !== 200) {
    pushResult('payment fail flow - checkout create', false, {
      status: failCheckout.status,
      bodySnippet: toSnippet(failCheckout.text),
    });
    return;
  }

  const failSessionId = String(JSON.parse(failCheckout.text).sessionId || '').trim();
  if (!failSessionId) {
    pushResult('payment fail flow - session id', false, {
      status: failCheckout.status,
      bodySnippet: toSnippet(failCheckout.text),
    });
    return;
  }

  pushResult('payment fail flow - checkout create', true, {
    status: failCheckout.status,
    sessionId: failSessionId,
  });

  const failWebhook = await sendRequest({
    method: 'POST',
    path: buildWebhookPath(failSessionId, context.studentId),
    body: new URLSearchParams({ token: `mock-fail-${failSessionId}` }),
    headers: {
      Origin: origin,
    },
  });

  pushResult('payment fail flow - webhook callback', failWebhook.status === 302, {
    status: failWebhook.status,
    bodySnippet: toSnippet(failWebhook.text),
  });

  const failTx = await assertTransactionStatus(failSessionId, 'failed');
  pushResult('payment fail flow - transaction failed', failTx.ok, {
    transactionId: failSessionId,
    status: failTx.tx?.status || null,
  });

  const stillUnpaid = await assertStudentPaid(context.studentId, false);
  pushResult('payment fail flow - student still unpaid', stillUnpaid, {
    studentId: context.studentId,
  });

  const retryCheckout = await sendRequest({
    method: 'POST',
    path: '/api/payments/create-checkout-session',
    headers: {
      Cookie: `payment_access_token=${paymentToken}`,
      Origin: origin,
      'Content-Type': 'application/json',
    },
    body: {
      userId: context.studentId,
      packageId: context.packageId,
      retryOfTransactionId: failSessionId,
    },
  });

  if (retryCheckout.status !== 200) {
    pushResult('payment retry flow - checkout create', false, {
      status: retryCheckout.status,
      bodySnippet: toSnippet(retryCheckout.text),
    });
    return;
  }

  const retrySessionId = String(JSON.parse(retryCheckout.text).sessionId || '').trim();
  if (!retrySessionId) {
    pushResult('payment retry flow - session id', false, {
      status: retryCheckout.status,
      bodySnippet: toSnippet(retryCheckout.text),
    });
    return;
  }

  pushResult('payment retry flow - checkout create', true, {
    status: retryCheckout.status,
    sessionId: retrySessionId,
  });

  const retryWebhook = await sendRequest({
    method: 'POST',
    path: buildWebhookPath(retrySessionId, context.studentId),
    body: new URLSearchParams({ token: `mock-token-${retrySessionId}` }),
    headers: {
      Origin: origin,
    },
  });

  pushResult('payment retry flow - webhook callback', retryWebhook.status === 302, {
    status: retryWebhook.status,
    bodySnippet: toSnippet(retryWebhook.text),
  });

  const retryTx = await prisma.paymentTransaction.findUnique({
    where: { id: retrySessionId },
    select: {
      status: true,
      metadata: true,
    },
  });

  const retryMetadata = (retryTx?.metadata && typeof retryTx.metadata === 'object')
    ? retryTx.metadata
    : {};

  const retryMetaPass =
    retryTx?.status === 'paid' &&
    retryMetadata.retryOfTransactionId === failSessionId &&
    Number(retryMetadata.retryAttempt || 0) >= 1;

  pushResult('payment retry flow - metadata linked', retryMetaPass, {
    transactionId: retrySessionId,
    status: retryTx?.status || null,
    retryOfTransactionId: retryMetadata.retryOfTransactionId || null,
    retryAttempt: retryMetadata.retryAttempt || null,
  });

  const originalFailedTx = await prisma.paymentTransaction.findUnique({
    where: { id: failSessionId },
    select: {
      metadata: true,
    },
  });

  const originalMetadata =
    originalFailedTx?.metadata && typeof originalFailedTx.metadata === 'object'
      ? originalFailedTx.metadata
      : {};

  const reverseLinkPass =
    originalMetadata.lastRetryTransactionId === retrySessionId &&
    typeof originalMetadata.retriedAt === 'string' &&
    originalMetadata.retriedAt.length > 0;

  pushResult('payment retry flow - original has reverse link', reverseLinkPass, {
    originalTransactionId: failSessionId,
    lastRetryTransactionId: originalMetadata.lastRetryTransactionId || null,
    retriedAt: originalMetadata.retriedAt || null,
  });

  const paidAfterRetry = await assertStudentPaid(context.studentId, true);
  pushResult('payment retry flow - student activated', paidAfterRetry, {
    studentId: context.studentId,
  });
}

async function main() {
  const context = await ensureQaData();

  await runInactivePayoutStatusBlocked(context);
  await runSuccessFlow(context);
  await runFailAndRetryFlow(context);

  const total = results.length;
  const passed = results.filter((item) => item.pass).length;
  const failed = total - passed;

  console.log(`TOTAL=${total} PASS=${passed} FAIL=${failed}`);

  if (failed > 0) {
    console.log('FAILED_CASES_START');
    for (const item of results.filter((entry) => !entry.pass)) {
      console.log(JSON.stringify(item));
    }
    console.log('FAILED_CASES_END');
  }

  await writeFile(
    resolve(process.cwd(), 'payments-contract-e2e-results.json'),
    JSON.stringify(results, null, 2),
    'utf8',
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('Fatal payments contract E2E error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
