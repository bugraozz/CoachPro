import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromMobileRequest } from './utils';
import { isCoach } from '../../../lib/auth';
import { createNotificationAndPush } from '../../../lib/notifications';

export const GET: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const isCoach = user.role === 'coach';

    if (isCoach) {
      const dietPlans = await prisma.dietPlan.findMany({
        where: { user: { coachId: user.id } },
        include: {
          user: { select: { name: true } },
          meals: { include: { foods: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      return new Response(JSON.stringify({ dietPlans }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } else {
      const dietPlans = await prisma.dietPlan.findMany({
        where: { userId: user.id },
        include: {
          meals: {
            include: { foods: true },
            orderBy: { order: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return new Response(JSON.stringify({ dietPlans }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
    const meals = Array.isArray(data.meals) ? data.meals : [];

    if (!studentId) {
      return new Response(JSON.stringify({ error: 'Öğrenci seçilmedi' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!data.name || !String(data.name).trim()) {
      return new Response(JSON.stringify({ error: 'Diyet adı gerekli' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (meals.length === 0) {
      return new Response(JSON.stringify({ error: 'En az bir öğün ekleyin' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const student = await prisma.user.findFirst({
      where: { id: studentId, coachId: user.id, role: 'student' }
    });

    if (!student) {
      return new Response(JSON.stringify({ error: 'Öğrenci bulunamadı' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    await prisma.dietPlan.updateMany({
      where: { userId: student.id, active: true },
      data: { active: false }
    });

    const dietPlan = await prisma.dietPlan.create({
      data: {
        userId: student.id,
        name: String(data.name).trim(),
        startDate: new Date(),
        dailyCalorieTarget: Number(data.dailyCalorieTarget || 0),
        proteinTarget: Number(data.proteinTarget || 0),
        carbsTarget: Number(data.carbsTarget || 0),
        fatTarget: Number(data.fatTarget || 0),
        waterTarget: Number(data.waterTarget || 3000),
        active: true,
        meals: {
          create: meals.map((meal: any, index: number) => ({
            name: String(meal.name || `Öğün ${index + 1}`).trim(),
            order: meal.order ?? index,
            foods: {
              create: Array.isArray(meal.foods)
                ? meal.foods.map((food: any) => ({
                    name: String(food.name || '').trim(),
                    amount: Number(food.amount || 0),
                    unit: String(food.unit || '').trim(),
                    calories: Number(food.calories || 0),
                    protein: Number(food.protein || 0),
                    carbs: Number(food.carbs || 0),
                    fat: Number(food.fat || 0),
                  }))
                : [],
            },
          })),
        },
      },
      include: {
        meals: {
          include: { foods: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    try {
      await createNotificationAndPush({
        userId: student.id,
        actorId: user.id,
        type: 'diet',
        title: 'Yeni diyet',
        body: String(data.name).trim(),
        payload: { dietId: dietPlan.id },
      });
    } catch (err) {
      console.error('Notification create error:', err);
    }

    return new Response(JSON.stringify(dietPlan), {
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
