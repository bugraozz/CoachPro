import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromRequest, isCoach } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const user = await getUserFromRequest(request);
  if (!user || !isCoach(user)) {
    return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401 });
  }

  const data = await request.json();
  const studentId = data.studentId || data.clientId;

  // Öğrencinin bu eğitmene ait olduğunu kontrol et
  const student = await prisma.user.findFirst({
    where: { id: studentId, coachId: user.id, role: 'student' }
  });
  if (!student) {
    return new Response(JSON.stringify({ error: 'Öğrenci bulunamadı' }), { status: 404 });
  }

  // Mevcut aktif programı pasife çek
  await prisma.program.updateMany({
    where: { userId: student.id, status: 'active' },
    data: { status: 'inactive' }
  });

  const program = await prisma.program.create({
    data: {
      userId: student.id,
      name: data.name,
      category: data.category || 'Fitness',
      startDate: new Date(),
      status: 'active',
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
        include: { exercises: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  return new Response(JSON.stringify(program), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
