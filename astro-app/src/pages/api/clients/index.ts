import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';

export const GET: APIRoute = async () => {
  const clients = await prisma.user.findMany({
    where: { role: 'student' },
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
  const data = await request.json();
  const fallbackEmail = `client-${Date.now()}-${Math.floor(Math.random() * 100000)}@local.invalid`;
  const email = (data.email || '').trim() || fallbackEmail;

  const client = await prisma.user.create({
    data: {
      name: data.name,
      email,
      password: 'temporary-password',
      role: 'student',
      coachId: data.coachId || null,
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

  return new Response(JSON.stringify(client), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
