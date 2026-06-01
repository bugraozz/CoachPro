import type { APIRoute } from 'astro';
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
  if (!user) return jsonResponse({ error: 'Yetkisiz' }, 401);

  const id = params.id;
  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, coachId: true } },
      days: {
        include: { exercises: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!program) return jsonResponse({ error: 'Program bulunamadı' }, 404);

  const canView = program.userId === user.id || (isCoach(user) && program.user.coachId === user.id);
  if (!canView) return jsonResponse({ error: 'Yetkisiz' }, 403);

  return jsonResponse(program);
};

export const PUT: APIRoute = async ({ request, params }) => {
  const user = await getUserFromMobileRequest(request);
  if (!user || !isCoach(user)) return jsonResponse({ error: 'Yetkisiz' }, 401);

  const id = params.id;
  const data = await request.json();

  const program = await prisma.program.findUnique({
    where: { id },
    include: { user: { select: { id: true, coachId: true } } },
  });

  if (!program || program.user.coachId !== user.id) return jsonResponse({ error: 'Program bulunamadı' }, 404);

  const days = Array.isArray(data.days) ? data.days : [];
  if (days.length === 0) return jsonResponse({ error: 'En az bir gün ekleyin' }, 400);

  await prisma.exercise.deleteMany({ where: { programDay: { programId: id } } });
  await prisma.programDay.deleteMany({ where: { programId: id } });

  const updated = await prisma.program.update({
    where: { id },
    data: {
      name: String(data.name || program.name).trim(),
      category: data.category || program.category,
      status: data.status || program.status,
      days: {
        create: days.map((day: any, index: number) => ({
          dayName: String(day.dayName || `Gün ${index + 1}`).trim(),
          order: day.order ?? index,
          exercises: {
            create: Array.isArray(day.exercises)
              ? day.exercises.map((ex: any, exIndex: number) => ({
                  name: String(ex.name || '').trim(),
                  muscleGroup: String(ex.muscleGroup || '').trim(),
                  sets: Number(ex.sets || 0),
                  reps: String(ex.reps || '').trim(),
                  weight: ex.weight || null,
                  restSeconds: ex.restSeconds || null,
                  notes: ex.notes || null,
                  order: ex.order ?? exIndex,
                }))
              : [],
          },
        })),
      },
    },
    include: {
      days: { include: { exercises: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
    },
  });

  return jsonResponse(updated);
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await getUserFromMobileRequest(request);
  if (!user || !isCoach(user)) return jsonResponse({ error: 'Yetkisiz' }, 401);

  const id = params.id;
  const program = await prisma.program.findUnique({
    where: { id },
    include: { user: { select: { id: true, coachId: true } } },
  });

  if (!program || program.user.coachId !== user.id) return jsonResponse({ error: 'Program bulunamadı' }, 404);

  await prisma.exercise.deleteMany({ where: { programDay: { programId: id } } });
  await prisma.programDay.deleteMany({ where: { programId: id } });
  await prisma.program.delete({ where: { id } });

  return jsonResponse({ success: true });
};