import type { APIRoute } from 'astro';
import { Prisma } from '@prisma/client';
import prisma from '../../../lib/prisma';
import { getUserFromRequest, isCoach } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getUserFromRequest(request);
  if (!user || !isCoach(user)) {
    return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401 });
  }

  const client = await prisma.user.findFirst({
    where: {
      id: params.id,
      role: 'student',
      coachId: user.id,
    },
    include: {
      weightHistory: { orderBy: { date: 'desc' } },
      measurements: { orderBy: { date: 'desc' } },
      bodyAnalyses: { orderBy: { date: 'desc' } },
      programs: {
        include: {
          days: {
            include: { exercises: { orderBy: { order: 'asc' } } },
            orderBy: { order: 'asc' },
          },
        },
      },
      dietPlans: {
        include: {
          meals: {
            include: { foods: true },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  if (!client) {
    return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404 });
  }

  return new Response(JSON.stringify(client), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const user = await getUserFromRequest(request);
  if (!user || !isCoach(user)) {
    return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401 });
  }

  const data = await request.json();

  const existing = await prisma.user.findFirst({
    where: {
      id: params.id,
      role: 'student',
      coachId: user.id,
    },
    select: { id: true, email: true },
  });

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404 });
  }

  const nextEmail = typeof data.email === 'string' ? data.email.trim().toLowerCase() : existing.email;
  if (!nextEmail) {
    return new Response(JSON.stringify({ error: 'Gecerli bir e-posta adresi gereklidir' }), { status: 400 });
  }

  if (nextEmail !== existing.email) {
    const duplicateUser = await prisma.user.findUnique({
      where: { email: nextEmail },
      select: { id: true },
    });

    if (duplicateUser && duplicateUser.id !== params.id) {
      return new Response(JSON.stringify({ error: 'Bu e-posta adresi zaten kullaniliyor' }), { status: 409 });
    }
  }

  let client;
  try {
    client = await prisma.user.update({
      where: { id: params.id },
      data: {
        name: data.name,
        email: nextEmail,
        phone: data.phone,
        gender: data.gender,
        age: data.age,
        height: data.height,
        currentWeight: data.currentWeight,
        targetWeight: data.targetWeight,
        healthNotes: data.healthNotes,
        active: data.active,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new Response(JSON.stringify({ error: 'Bu e-posta adresi zaten kullaniliyor' }), { status: 409 });
    }
    throw error;
  }

  return new Response(JSON.stringify(client), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await getUserFromRequest(request);
  if (!user || !isCoach(user)) {
    return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401 });
  }

  const existing = await prisma.user.findFirst({
    where: {
      id: params.id,
      role: 'student',
      coachId: user.id,
    },
    select: { id: true },
  });

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404 });
  }

  await prisma.user.delete({
    where: { id: params.id },
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
