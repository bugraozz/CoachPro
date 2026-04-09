import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromRequest, isCoach } from '../../../lib/auth';

const prismaClient = prisma as any;

function extractFailureReason(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object') {
    return 'Bilinmeyen hata';
  }

  const metadataMap = metadata as Record<string, unknown>;
  const candidates = [
    metadataMap.failureReason,
    metadataMap.checkoutError,
    metadataMap.error,
    metadataMap.marketplaceFallbackReason,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return 'Bilinmeyen hata';
}

export const GET: APIRoute = async ({ request }) => {
  const user = await getUserFromRequest(request);

  if (!user) {
    return new Response(JSON.stringify({ error: 'Yetkisiz istek.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const where = isCoach(user)
    ? {
        OR: [
          { payerId: user.id },
          { coachId: user.id },
        ],
      }
    : {
        OR: [
          { payerId: user.id },
          { studentId: user.id },
        ],
      };

  const transactions = await prismaClient.paymentTransaction.findMany({
    where,
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const summary = {
    totalCount: 0,
    paidCount: 0,
    failedCount: 0,
    pendingCount: 0,
    totalRevenue: 0,
    monthRevenue: 0,
    retryCount: 0,
  };

  const failureReasonCounts: Record<string, number> = {};

  for (const transaction of transactions) {
    summary.totalCount += 1;

    if (transaction.status === 'paid') {
      summary.paidCount += 1;
      summary.totalRevenue += Number(transaction.amount || 0);
      if (new Date(transaction.createdAt) >= monthStart) {
        summary.monthRevenue += Number(transaction.amount || 0);
      }
    }

    if (transaction.status === 'failed') {
      summary.failedCount += 1;
      const reason = extractFailureReason(transaction.metadata);
      failureReasonCounts[reason] = (failureReasonCounts[reason] || 0) + 1;
    }

    if (transaction.status === 'pending') {
      summary.pendingCount += 1;
    }

    if (
      transaction.metadata &&
      typeof transaction.metadata === 'object' &&
      (transaction.metadata as Record<string, unknown>).retryOfTransactionId
    ) {
      summary.retryCount += 1;
    }
  }

  const topFailureReasons = Object.entries(failureReasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));

  const recentFailures = transactions
    .filter((transaction: any) => transaction.status === 'failed')
    .slice(0, 10)
    .map((transaction: any) => ({
      id: transaction.id,
      amount: transaction.amount,
      createdAt: transaction.createdAt,
      reason: extractFailureReason(transaction.metadata),
    }));

  return new Response(JSON.stringify({ summary, topFailureReasons, recentFailures }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
