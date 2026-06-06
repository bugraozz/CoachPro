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

    const transactions = await prisma.paymentTransaction.findMany({
      select: {
        id: true,
        payerId: true,
        type: true,
        amount: true,
        currency: true,
        paidAt: true,
        failedAt: true,
        createdAt: true,
        status: true,
        packageId: true,
        coachId: true,
        metadata: true,
        payer: { select: { id: true, name: true, email: true } },
        coach: { select: { id: true, name: true, email: true } },
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 150,
    });

    return new Response(JSON.stringify({ transactions }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Sunucu hatası', details: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
