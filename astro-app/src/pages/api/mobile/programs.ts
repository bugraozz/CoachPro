import type { APIRoute } from 'astro';
import { getUserFromMobileRequest } from './utils';
import prisma from '../../../lib/prisma';
import { isCoach } from '../../../lib/auth';
import { createNotificationAndPush } from '../../../lib/notifications';

export const GET: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const isCoach = user.role === 'coach' || user.role === 'admin' || user.role === 'super_admin';

    if (isCoach) {
      const whereClause: any = {};
      if (user.role === 'coach') {
        whereClause.user = { coachId: user.id };
      }
      
      const programs = await prisma.program.findMany({
        where: whereClause,
        include: {
          user: { select: { name: true, email: true } },
          days: { include: { exercises: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      return new Response(JSON.stringify({ programs }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } else {
      // Öğrenci için kendi programlarını getir
      const programs = await prisma.program.findMany({
        where: { userId: user.id },
        include: {
          days: {
            include: { exercises: true },
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return new Response(JSON.stringify({ programs }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Sunucu hatası', details: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);

    if (!user || !isCoach(user)) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const data = await request.json();
    const studentId = data.studentId || data.clientId;
    const days = Array.isArray(data.days) ? data.days : [];

    if (!studentId) {
      return new Response(JSON.stringify({ error: 'Öğrenci seçilmedi' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!data.name || !String(data.name).trim()) {
      return new Response(JSON.stringify({ error: 'Program adı gerekli' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (days.length === 0) {
      return new Response(JSON.stringify({ error: 'En az bir gün ekleyin' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const student = await prisma.user.findFirst({
      where: { id: studentId, coachId: user.id, role: 'student' }
    });

    if (!student) {
      return new Response(JSON.stringify({ error: 'Öğrenci bulunamadı' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    await prisma.program.updateMany({
      where: { userId: student.id, status: 'active' },
      data: { status: 'inactive' }
    });

    const program = await prisma.program.create({
      data: {
        userId: student.id,
        name: String(data.name).trim(),
        category: data.category || 'Fitness',
        startDate: new Date(),
        status: 'active',
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
        days: {
          include: { exercises: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });

    try {
      await createNotificationAndPush({
        userId: student.id,
        actorId: user.id,
        type: 'program',
        title: 'Yeni program',
        body: String(data.name).trim(),
        payload: { programId: program.id },
      });
    } catch (err) {
      console.error('Notification create error:', err);
    }

    return new Response(JSON.stringify(program), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Sunucu hatası', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
