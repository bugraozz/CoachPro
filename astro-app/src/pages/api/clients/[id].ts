import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';

export const GET: APIRoute = async ({ params }) => {
  const client = await prisma.user.findFirst({
    where: { id: params.id, role: 'student' },
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
  const data = await request.json();

  const existing = await prisma.user.findFirst({
    where: { id: params.id, role: 'student' },
    select: { id: true },
  });

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404 });
  }

  const client = await prisma.user.update({
    where: { id: params.id },
    data: {
      name: data.name,
      email: data.email,
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

  return new Response(JSON.stringify(client), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const existing = await prisma.user.findFirst({
    where: { id: params.id, role: 'student' },
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
