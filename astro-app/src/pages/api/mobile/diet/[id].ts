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
  const diet = await prisma.dietPlan.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, coachId: true } },
      meals: {
        include: { foods: true },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!diet) return jsonResponse({ error: 'Diyet bulunamadı' }, 404);

  const canView = diet.userId === user.id || (isCoach(user) && diet.user.coachId === user.id);
  if (!canView) return jsonResponse({ error: 'Yetkisiz' }, 403);

  return jsonResponse(diet);
};

export const PUT: APIRoute = async ({ request, params }) => {
  const user = await getUserFromMobileRequest(request);
  if (!user || !isCoach(user)) return jsonResponse({ error: 'Yetkisiz' }, 401);

  const id = params.id;
  const data = await request.json();

  const diet = await prisma.dietPlan.findUnique({
    where: { id },
    include: { user: { select: { id: true, coachId: true } } },
  });

  if (!diet || diet.user.coachId !== user.id) return jsonResponse({ error: 'Diyet bulunamadı' }, 404);

  const meals = Array.isArray(data.meals) ? data.meals : [];
  if (meals.length === 0) return jsonResponse({ error: 'En az bir öğün ekleyin' }, 400);

  await prisma.food.deleteMany({ where: { meal: { dietPlanId: id } } });
  await prisma.meal.deleteMany({ where: { dietPlanId: id } });

  const updated = await prisma.dietPlan.update({
    where: { id },
    data: {
      name: String(data.name || diet.name).trim(),
      dailyCalorieTarget: Number(data.dailyCalorieTarget || diet.dailyCalorieTarget),
      proteinTarget: Number(data.proteinTarget || diet.proteinTarget),
      carbsTarget: Number(data.carbsTarget || diet.carbsTarget),
      fatTarget: Number(data.fatTarget || diet.fatTarget),
      waterTarget: Number(data.waterTarget || diet.waterTarget),
      active: data.active !== undefined ? Boolean(data.active) : diet.active,
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

  return jsonResponse(updated);
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await getUserFromMobileRequest(request);
  if (!user || !isCoach(user)) return jsonResponse({ error: 'Yetkisiz' }, 401);

  const id = params.id;
  const diet = await prisma.dietPlan.findUnique({
    where: { id },
    include: { user: { select: { id: true, coachId: true } } },
  });

  if (!diet || diet.user.coachId !== user.id) return jsonResponse({ error: 'Diyet bulunamadı' }, 404);

  await prisma.food.deleteMany({ where: { meal: { dietPlanId: id } } });
  await prisma.meal.deleteMany({ where: { dietPlanId: id } });
  await prisma.dietPlan.delete({ where: { id } });

  return jsonResponse({ success: true });
};