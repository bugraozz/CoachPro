import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromRequest, isCoach } from '../../../lib/auth';

const prismaClient = prisma as any;

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
    include: {
      payer: { select: { id: true, name: true, email: true } },
      student: { select: { id: true, name: true, email: true } },
      coachPackage: { select: { id: true, name: true, durationWeeks: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return new Response(JSON.stringify(transactions), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
