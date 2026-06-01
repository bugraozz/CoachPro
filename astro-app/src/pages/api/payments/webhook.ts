import type { APIRoute } from 'astro';
import { createHmac, timingSafeEqual } from 'crypto';
import { readFileSync } from 'fs';
import prisma from '../../../lib/prisma';
import { createPaymentAccessCookie, createPaymentAccessToken } from '../../../lib/auth';
import { sendPushToUser } from '../../../lib/push';
import { retrieveCheckoutForm } from '../../../lib/iyzico';

const prismaClient = prisma as any;

function isAllowedCallbackHost(request: Request): boolean {
  const appUrl = String(import.meta.env.PUBLIC_APP_URL || '').trim();
  if (!appUrl || !/^https?:\/\//.test(appUrl)) {
    return true;
  }

  try {
    const allowedHost = new URL(appUrl).host;
    return new URL(request.url).host === allowedHost;
  } catch {
    return false;
  }
}

function toCurrencyNumber(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function getAppOrigin(request: Request): string {
  const envOrigin = String(import.meta.env.PUBLIC_APP_URL || '').trim();
  if (envOrigin && /^https?:\/\//.test(envOrigin)) {
    return envOrigin.replace(/\/+$/, '');
  }

  if (import.meta.env.PROD) {
    throw new Error('PUBLIC_APP_URL must be configured in production');
  }

  const requestUrl = new URL(request.url);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

function getWebhookSigningSecret(): string {
  return String(
    import.meta.env.IYZICO_WEBHOOK_SECRET ||
      import.meta.env.PAYMENT_LINK_SECRET ||
      import.meta.env.IYZICO_SECRET_KEY ||
      '',
  ).trim();
}

function createWebhookSignature(transactionId: string, userId: string, secret: string): string {
  return createHmac('sha256', secret).update(`${transactionId}:${userId}`).digest('hex');
}

function safeHexEquals(left: string, right: string): boolean {
  try {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');

    if (!leftBuffer.length || !rightBuffer.length || leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
}

function isValidWebhookSignature(url: URL, transactionId: string, userId: string): boolean {
  const signingSecret = getWebhookSigningSecret();
  if (!signingSecret) {
    return true;
  }

  const providedSignature = String(url.searchParams.get('sig') || '').trim().toLowerCase();
  if (!providedSignature || !/^[a-f0-9]{64}$/.test(providedSignature)) {
    return false;
  }

  if (!transactionId || !userId) {
    return false;
  }

  const expectedSignature = createWebhookSignature(transactionId, userId, signingSecret).toLowerCase();
  return safeHexEquals(providedSignature, expectedSignature);
}

function parseTrustedIpValues(raw: string): string[] {
  return raw
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && !entry.startsWith('#'));
}

function getTrustedWebhookIpsConfig(): { enabled: boolean; ips: Set<string> } {
  const inlineRaw = String(import.meta.env.IYZICO_WEBHOOK_TRUSTED_IPS || '').trim();
  const filePath = String(import.meta.env.IYZICO_WEBHOOK_TRUSTED_IPS_FILE || '').trim();

  if (!inlineRaw && !filePath) {
    return { enabled: false, ips: new Set<string>() };
  }

  let fileRaw = '';
  if (filePath) {
    try {
      fileRaw = readFileSync(filePath, 'utf8');
    } catch {
      // Fail closed if a file path is configured but cannot be read.
      return { enabled: true, ips: new Set<string>() };
    }
  }

  const ips = new Set<string>();

  for (const ip of parseTrustedIpValues(inlineRaw)) {
    ips.add(ip);
  }

  for (const ip of parseTrustedIpValues(fileRaw)) {
    ips.add(ip);
  }

  return { enabled: true, ips };
}

function getRequestSourceIp(request: Request): string {
  const cloudflareIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cloudflareIp) {
    return cloudflareIp;
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }

  return '';
}

function isTrustedWebhookSource(request: Request): boolean {
  const trustedIpConfig = getTrustedWebhookIpsConfig();
  if (!trustedIpConfig.enabled) {
    return true;
  }

  if (trustedIpConfig.ips.size === 0) {
    return false;
  }

  const sourceIp = getRequestSourceIp(request);
  return Boolean(sourceIp && trustedIpConfig.ips.has(sourceIp));
}

async function markTransactionAsPaid(transaction: any, checkoutResult: Record<string, unknown>): Promise<void> {
  if (!transaction || transaction.status === 'paid') {
    return;
  }

  await prismaClient.$transaction(async (tx: any) => {
    await tx.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        externalPaymentId: transaction.externalPaymentId || transaction.id,
        externalCustomerId: checkoutResult.paymentId ? String(checkoutResult.paymentId) : null,
        metadata: {
          ...(typeof transaction.metadata === 'object' && transaction.metadata ? transaction.metadata as object : {}),
          iyzicoConversationId: checkoutResult.conversationId ? String(checkoutResult.conversationId) : transaction.id,
          iyzicoBasketId: checkoutResult.basketId ? String(checkoutResult.basketId) : transaction.id,
          iyzicoToken: checkoutResult.token ? String(checkoutResult.token) : null,
          paymentStatus: checkoutResult.paymentStatus ? String(checkoutResult.paymentStatus) : 'success',
          callbackValidatedAt: new Date().toISOString(),
        },
      },
    });

    if (transaction.type === 'coach_subscription') {
      const transactionMetadata =
        transaction.metadata && typeof transaction.metadata === 'object'
          ? transaction.metadata as Record<string, unknown>
          : {};

      const subscriptionPlanMonthsRaw = Number(transactionMetadata.subscriptionPlanMonths || 1);
      const subscriptionPlanMonths = Number.isFinite(subscriptionPlanMonthsRaw)
        ? Math.max(1, Math.min(36, Math.round(subscriptionPlanMonthsRaw)))
        : 1;

      const existingCoach = await tx.user.findUnique({
        where: { id: transaction.payerId },
        select: { subscriptionEnd: true },
      });

      const subscriptionBaseDate =
        existingCoach?.subscriptionEnd && new Date(existingCoach.subscriptionEnd) > new Date()
          ? new Date(existingCoach.subscriptionEnd)
          : new Date();

      const subscriptionEnd = new Date(subscriptionBaseDate);
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + subscriptionPlanMonths);

      await tx.user.update({
        where: { id: transaction.payerId },
        data: {
          active: true,
          subscriptionStatus: 'active',
          subscriptionEnd,
        },
      });
      try {
        await tx.notification.create({
          data: {
            userId: transaction.payerId,
            actorId: transaction.payerId,
            type: 'payment',
            title: 'Ödeme alındı',
            body: `Abonelik ödemesi alındı.`,
            payload: { transactionId: transaction.id },
          },
        });
      } catch (err) {
        // avoid failing the whole transaction for notification errors
        console.error('Notification create error (coach_subscription):', err);
      }
    }

    if (transaction.type === 'student_package') {
      const selectedPackage = transaction.packageId
        ? await tx.coachPackage.findUnique({
            where: { id: transaction.packageId },
            select: { name: true, durationWeeks: true },
          })
        : null;

      const studentAccessEnd = new Date();
      studentAccessEnd.setDate(studentAccessEnd.getDate() + (Number(selectedPackage?.durationWeeks || 4) * 7));

      await tx.user.update({
        where: { id: transaction.payerId },
        data: {
          active: true,
          studentPaymentStatus: 'paid',
          studentPaidAt: new Date(),
          studentAccessEnd,
          selectedPackageId: transaction.packageId,
        },
      });

      if (transaction.coachId) {
        const student = await tx.user.findUnique({
          where: { id: transaction.payerId },
          select: { id: true, name: true },
        });

        const studentName = student?.name || 'Yeni bir ogrenci';
        const packageSuffix = selectedPackage?.name ? ` (${selectedPackage.name})` : '';

        await tx.message.create({
          data: {
            senderId: transaction.payerId,
            receiverId: transaction.coachId,
            messageType: 'text',
            content: `Yeni ogrenci odemesi tamamlandi: ${studentName}${packageSuffix}.`,
            read: false,
          },
        });
        try {
          await tx.notification.create({
            data: {
              userId: transaction.coachId,
              actorId: transaction.payerId,
              type: 'payment',
              title: 'Öğrenci ödemesi',
              body: `Öğrenciden yeni ödeme alındı: ${studentName}${packageSuffix}.`,
              payload: { transactionId: transaction.id },
            },
          });
        } catch (err) {
          console.error('Notification create error (student_package):', err);
        }
      }
    }
  });
}

async function markTransactionAsFailed(transaction: any, reason: string, checkoutResult: Record<string, unknown>): Promise<void> {
  if (!transaction || transaction.status === 'paid') {
    return;
  }

  await prismaClient.paymentTransaction.update({
    where: { id: transaction.id },
    data: {
      status: 'failed',
      failedAt: new Date(),
      externalPaymentId: transaction.externalPaymentId || transaction.id,
      metadata: {
        ...(typeof transaction.metadata === 'object' && transaction.metadata ? transaction.metadata as object : {}),
        failureReason: reason,
        iyzicoConversationId: checkoutResult.conversationId ? String(checkoutResult.conversationId) : transaction.id,
        iyzicoBasketId: checkoutResult.basketId ? String(checkoutResult.basketId) : transaction.id,
        paymentStatus: checkoutResult.paymentStatus ? String(checkoutResult.paymentStatus) : 'failed',
      },
    },
  });
}

export const POST: APIRoute = async ({ request }) => {
  if (!isAllowedCallbackHost(request)) {
    return new Response('Callback host is not allowed', { status: 403 });
  }

  const url = new URL(request.url);
  const transactionIdFromQuery = (url.searchParams.get('transactionId') || '').trim();
  const userIdFromQuery = (url.searchParams.get('userId') || '').trim();

  let token = '';

  try {
    const formData = await request.formData();
    token = String(formData.get('token') || '').trim();
  } catch {
    const body = await request.json().catch(() => null) as { token?: string } | null;
    token = (body?.token || '').trim();
  }

  if (!token) {
    return new Response('Missing token', { status: 400 });
  }

  if (!isValidWebhookSignature(url, transactionIdFromQuery, userIdFromQuery)) {
    return new Response('Invalid callback signature', { status: 403 });
  }

  if (!isTrustedWebhookSource(request)) {
    return new Response('Callback source is not allowed', { status: 403 });
  }

  try {
    const checkoutResult = await retrieveCheckoutForm({
      locale: 'tr',
      token,
      conversationId: transactionIdFromQuery || undefined,
    });

    const checkoutConversationId = String(checkoutResult.conversationId || '').trim();
    const checkoutBasketId = String(checkoutResult.basketId || '').trim();
    const checkoutStatus = String(checkoutResult.status || '').toLowerCase();
    const paymentStatus = String(checkoutResult.paymentStatus || '').toLowerCase();

    const transaction = transactionIdFromQuery
      ? await prismaClient.paymentTransaction.findUnique({ where: { id: transactionIdFromQuery } })
      : await prismaClient.paymentTransaction.findFirst({
          where: {
            OR: [
              { id: checkoutConversationId || checkoutBasketId },
              { externalPaymentId: checkoutConversationId || checkoutBasketId },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });

    if (!transaction) {
      return new Response('Payment transaction not found', { status: 404 });
    }

    if (checkoutConversationId && checkoutConversationId !== transaction.id) {
      await markTransactionAsFailed(transaction, 'Conversation ID mismatch', checkoutResult);
      return new Response('Invalid payment conversation id', { status: 400 });
    }

    if (checkoutBasketId && checkoutBasketId !== transaction.id) {
      await markTransactionAsFailed(transaction, 'Basket ID mismatch', checkoutResult);
      return new Response('Invalid payment basket id', { status: 400 });
    }

    const checkoutCurrency = String(checkoutResult.currency || 'TRY').toUpperCase();
    if (checkoutCurrency && checkoutCurrency !== 'TRY') {
      await markTransactionAsFailed(transaction, `Unsupported currency: ${checkoutCurrency}`, checkoutResult);
      return new Response('Unsupported payment currency', { status: 400 });
    }

    const paidPrice = toCurrencyNumber(checkoutResult.paidPrice || checkoutResult.price);
    if (paidPrice !== null && Math.abs(paidPrice - Number(transaction.amount)) > 0.01) {
      await markTransactionAsFailed(transaction, 'Amount verification failed', checkoutResult);
      return new Response('Payment amount verification failed', { status: 400 });
    }

    const isPaid = checkoutStatus === 'success' && paymentStatus === 'success';

    if (isPaid) {
      await markTransactionAsPaid(transaction, checkoutResult);
      try {
        // send push to payer
        await sendPushToUser(String(transaction.payerId), 'Ödeme başarılı', 'Ödemeniz başarıyla alındı', { transactionId: transaction.id });
        // if student package and coach exists, notify coach
        if (transaction.type === 'student_package' && transaction.coachId) {
          await sendPushToUser(String(transaction.coachId), 'Yeni ödeme', 'Bir öğrenciden ödeme alındı', { transactionId: transaction.id });
        }
      } catch (err) {
        console.error('Push send error (webhook):', err);
      }
    } else {
      await markTransactionAsFailed(
        transaction,
        String(checkoutResult.errorMessage || 'Iyzico odeme basarisiz.'),
        checkoutResult,
      );
    }

    const appOrigin = getAppOrigin(request);
    const targetUserId = transaction.payerId || userIdFromQuery;
    const paymentRef = transaction.externalPaymentId || transaction.id;
    const paymentToken = createPaymentAccessToken(targetUserId);
    const redirectUrl = `${appOrigin}/auth/payment?userId=${encodeURIComponent(targetUserId)}&session_id=${encodeURIComponent(paymentRef)}`;

    const headers = new Headers();
    headers.set('Location', redirectUrl);
    headers.append('Set-Cookie', createPaymentAccessCookie(paymentToken));

    return new Response(null, {
      status: 302,
      headers,
    });

  } catch (error) {
    console.error('Iyzico webhook isleme hatasi:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
};

