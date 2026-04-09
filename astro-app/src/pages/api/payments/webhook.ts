import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { retrieveCheckoutForm } from '../../../lib/iyzico';

const prismaClient = prisma as any;

function getRequestHost(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    const firstHost = forwardedHost.split(',')[0]?.trim();
    if (firstHost) {
      return firstHost;
    }
  }

  return new URL(request.url).host;
}

function isAllowedCallbackHost(request: Request): boolean {
  const appUrl = import.meta.env.PUBLIC_APP_URL;
  if (!appUrl || !/^https?:\/\//.test(appUrl)) {
    return true;
  }

  const allowedHost = new URL(appUrl).host;
  return getRequestHost(request) === allowedHost;
}

function toCurrencyNumber(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function getAppOrigin(request: Request): string {
  const envOrigin = import.meta.env.PUBLIC_APP_URL;
  if (envOrigin && /^https?:\/\//.test(envOrigin)) {
    return envOrigin;
  }

  const requestOrigin = request.headers.get('origin');
  if (requestOrigin && /^https?:\/\//.test(requestOrigin)) {
    return requestOrigin;
  }

  return 'http://localhost:4321';
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
      const subscriptionEnd = new Date();
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);

      await tx.user.update({
        where: { id: transaction.payerId },
        data: {
          active: true,
          subscriptionStatus: 'active',
          subscriptionEnd,
        },
      });
    }

    if (transaction.type === 'student_package') {
      await tx.user.update({
        where: { id: transaction.payerId },
        data: {
          active: true,
          studentPaymentStatus: 'paid',
          studentPaidAt: new Date(),
          selectedPackageId: transaction.packageId,
        },
      });

      if (transaction.coachId) {
        const [student, selectedPackage] = await Promise.all([
          tx.user.findUnique({
            where: { id: transaction.payerId },
            select: { id: true, name: true },
          }),
          transaction.packageId
            ? tx.coachPackage.findUnique({
                where: { id: transaction.packageId },
                select: { name: true },
              })
            : Promise.resolve(null),
        ]);

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
    const redirectUrl = `${appOrigin}/auth/payment?userId=${targetUserId}&session_id=${paymentRef}`;

    return Response.redirect(redirectUrl, 302);

  } catch (error) {
    console.error('Iyzico webhook isleme hatasi:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
};

