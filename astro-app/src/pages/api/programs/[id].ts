import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromRequest, isCoach } from '../../../lib/auth';

// Program detayını getir
export const GET: APIRoute = async ({ request, params }) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
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

  if (!program) {
    return new Response(JSON.stringify({ error: 'Program bulunamadı' }), { status: 404 });
  }

  // Yetki: kendi programı veya eğitmenin öğrencisinin programı
  const canView =
    program.userId === user.id ||
    (isCoach(user) && program.user.coachId === user.id);

  if (!canView) {
    return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 403 });
  }

  return new Response(JSON.stringify(program), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Program güncelle
export const PUT: APIRoute = async ({ request, params }) => {
  const user = await getUserFromRequest(request);
  if (!user || !isCoach(user)) {
    return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401 });
  }

  const { id } = params;
  const data = await request.json();

  const program = await prisma.program.findUnique({
    where: { id },
    include: { user: { select: { id: true, coachId: true } } },
  });

  if (!program || program.user.coachId !== user.id) {
    return new Response(JSON.stringify({ error: 'Program bulunamadı' }), { status: 404 });
  }

  // Mevcut günleri ve egzersizleri sil, yenilerini oluştur (replace strategy)
  await prisma.exercise.deleteMany({
    where: { programDay: { programId: id } },
  });
  await prisma.programDay.deleteMany({
    where: { programId: id },
  });

  const updated = await prisma.program.update({
    where: { id },
    data: {
      name: data.name,
      category: data.category,
      status: data.status || program.status,
      days: {
        create: data.days.map((day: any, index: number) => ({
          dayName: day.dayName,
          order: day.order ?? index,
          exercises: {
            create: day.exercises.map((ex: any, exIndex: number) => ({
              name: ex.name,
              muscleGroup: ex.muscleGroup,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight || null,
              restSeconds: ex.restSeconds || null,
              notes: ex.notes || null,
              order: ex.order ?? exIndex,
            })),
          },
        })),
      },
    },
    include: {
      days: {
        include: { exercises: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      },
    },
  });

  return new Response(JSON.stringify(updated), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Program sil
export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await getUserFromRequest(request);
  if (!user || !isCoach(user)) {
    return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401 });
  }

  const { id } = params;

  const program = await prisma.program.findUnique({
    where: { id },
    include: { user: { select: { id: true, coachId: true } } },
  });

  if (!program || program.user.coachId !== user.id) {
    return new Response(JSON.stringify({ error: 'Program bulunamadı' }), { status: 404 });
  }

  // Cascade delete: exercises -> days -> program
  await prisma.exercise.deleteMany({
    where: { programDay: { programId: id } },
  });
  await prisma.programDay.deleteMany({
    where: { programId: id },
  });
  await prisma.program.delete({ where: { id } });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
