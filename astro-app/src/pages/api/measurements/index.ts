import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  const userId = data.clientId || data.userId;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Kullanici bulunamadi' }), { status: 400 });
  }

  const measurement = await prisma.measurement.create({
    data: {
      userId,
      chest: data.chest || null,
      waist: data.waist || null,
      hip: data.hip || null,
      armLeft: data.armLeft || null,
      armRight: data.armRight || null,
      legLeft: data.legLeft || null,
      legRight: data.legRight || null,
      bodyFat: data.bodyFat || null,
      neck: data.neck || null,
      shoulders: data.shoulders || null,
    },
  });

  return new Response(JSON.stringify(measurement), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
