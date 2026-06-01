import type { APIRoute } from 'astro';
import { Prisma } from '@prisma/client';
import prisma from '../../../../lib/prisma';
import { getUserFromMobileRequest } from '../utils';
import { isCoach } from '../../../../lib/auth';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getUserFromMobileRequest(request);
  if (!user || !isCoach(user)) return jsonResponse({ error: 'Yetkisiz' }, 401);

  const student = await prisma.user.findFirst({
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

  if (!student) return jsonResponse({ error: 'Student not found' }, 404);

  return jsonResponse(student);
};

export const PUT: APIRoute = async ({ params, request }) => {
  const user = await getUserFromMobileRequest(request);
  if (!user || !isCoach(user)) return jsonResponse({ error: 'Yetkisiz' }, 401);

  const data = await request.json();

  const existing = await prisma.user.findFirst({
    where: {
      id: params.id,
      role: 'student',
      coachId: user.id,
    },
    select: { id: true, email: true },
  });

  if (!existing) return jsonResponse({ error: 'Client not found' }, 404);

  const nextEmail = typeof data.email === 'string' ? data.email.trim().toLowerCase() : existing.email;
  if (!nextEmail) return jsonResponse({ error: 'Gecerli bir e-posta adresi gereklidir' }, 400);

  if (nextEmail !== existing.email) {
    const duplicateUser = await prisma.user.findUnique({ where: { email: nextEmail }, select: { id: true } });
    if (duplicateUser && duplicateUser.id !== params.id) {
      return jsonResponse({ error: 'Bu e-posta adresi zaten kullaniliyor' }, 409);
    }
  }

  try {
    const client = await prisma.user.update({
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

    return jsonResponse(client);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonResponse({ error: 'Bu e-posta adresi zaten kullaniliyor' }, 409);
    }
    throw error;
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await getUserFromMobileRequest(request);
  if (!user || !isCoach(user)) return jsonResponse({ error: 'Yetkisiz' }, 401);

  const existing = await prisma.user.findFirst({
    where: {
      id: params.id,
      role: 'student',
      coachId: user.id,
    },
    select: { id: true },
  });

  if (!existing) return jsonResponse({ error: 'Client not found' }, 404);

  await prisma.user.delete({ where: { id: params.id } });
  return jsonResponse({ success: true });
};