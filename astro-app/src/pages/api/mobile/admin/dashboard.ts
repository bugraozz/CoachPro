import type { APIRoute } from 'astro';
import prisma from '../../../../lib/prisma';
import { getUserFromMobileRequest } from '../utils';
import { isSuperAdmin } from '../../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);

    if (!user || !isSuperAdmin(user)) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const [
      totalUsers,
      totalCoaches,
      totalStudents,
      monthRevenueTransactions,
      newUsersLast7Days,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'coach' } }),
      prisma.user.count({ where: { role: 'student' } }),
      prisma.paymentTransaction.findMany({
        where: {
          status: 'paid',
          OR: [
            { paidAt: { gte: monthStart } },
            {
              paidAt: null,
              createdAt: { gte: monthStart },
            },
          ],
        },
        select: {
          amount: true,
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    const monthRevenue = monthRevenueTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    return new Response(JSON.stringify({
      totalUsers,
      totalCoaches,
      totalStudents,
      monthRevenue,
      newUsersLast7Days
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Sunucu hatası', details: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
