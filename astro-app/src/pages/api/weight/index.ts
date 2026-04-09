import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  const userId = data.clientId || data.userId;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Kullanici bulunamadi' }), { status: 400 });
  }

  const record = await prisma.weightRecord.create({
    data: {
      userId,
      weight: data.weight,
    },
  });

  // Keep profile's current weight in sync.
  await prisma.user.update({
    where: { id: userId },
    data: { currentWeight: data.weight },
  });

  return new Response(JSON.stringify(record), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
