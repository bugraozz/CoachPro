import type { APIRoute } from 'astro';
import { Prisma } from '@prisma/client';
import prisma from '../../../lib/prisma';
import { getUserFromRequest, isCoach } from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const user = await getUserFromRequest(request);
  if (!user || !isCoach(user)) {
    return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401 });
  }

  const clients = await prisma.user.findMany({
    where: {
      role: 'student',
      coachId: user.id,
    },
    include: {
      weightHistory: { orderBy: { date: 'desc' }, take: 1 },
      programs: { where: { status: 'active' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return new Response(JSON.stringify(clients), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const user = await getUserFromRequest(request);
  if (!user || !isCoach(user)) {
    return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401 });
  }

  const data = await request.json();
  const fallbackEmail = `client-${Date.now()}-${Math.floor(Math.random() * 100000)}@local.invalid`;
  const email = (data.email || '').trim() || fallbackEmail;

  let client;
  try {
    client = await prisma.user.create({
      data: {
        name: data.name,
        email,
        password: 'temporary-password',
        role: 'student',
        coachId: user.id,
        phone: data.phone || null,
        gender: data.gender || null,
        age: data.age ?? null,
        height: data.height ?? null,
        currentWeight: data.currentWeight ?? null,
        targetWeight: data.targetWeight || null,
        healthNotes: data.healthNotes || null,
        ...(data.currentWeight
          ? {
              weightHistory: {
                create: { weight: data.currentWeight },
              },
            }
          : {}),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new Response(JSON.stringify({ error: 'Bu e-posta adresi zaten kullaniliyor' }), { status: 409 });
    }
    throw error;
  }

  return new Response(JSON.stringify(client), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
