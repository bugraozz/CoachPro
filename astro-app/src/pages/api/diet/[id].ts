import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromRequest, isCoach } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { id } = params;
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

  if (!diet) {
    return new Response(JSON.stringify({ error: 'Diyet bulunamadı' }), { status: 404 });
  }

  const canView =
    diet.userId === user.id ||
    (isCoach(user) && diet.user.coachId === user.id);

  if (!canView) {
    return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 403 });
  }

  return new Response(JSON.stringify(diet), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request, params }) => {
  const user = await getUserFromRequest(request);
  if (!user || !isCoach(user)) {
    return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401 });
  }

  const { id } = params;
  const data = await request.json();

  const diet = await prisma.dietPlan.findUnique({
    where: { id },
    include: { user: { select: { id: true, coachId: true } } },
  });

  if (!diet || diet.user.coachId !== user.id) {
    return new Response(JSON.stringify({ error: 'Diyet bulunamadı' }), { status: 404 });
  }

  // Delete existing meals and foods, then recreate
  await prisma.food.deleteMany({
    where: { meal: { dietPlanId: id } },
  });
  await prisma.meal.deleteMany({
    where: { dietPlanId: id },
  });

  const updated = await prisma.dietPlan.update({
    where: { id },
    data: {
      name: data.name,
      dailyCalorieTarget: data.dailyCalorieTarget || diet.dailyCalorieTarget,
      proteinTarget: data.proteinTarget || diet.proteinTarget,
      carbsTarget: data.carbsTarget || diet.carbsTarget,
      fatTarget: data.fatTarget || diet.fatTarget,
      waterTarget: data.waterTarget || diet.waterTarget,
      active: data.active !== undefined ? data.active : diet.active,
      meals: {
        create: data.meals.map((meal: any, index: number) => ({
          name: meal.name,
          order: meal.order ?? index,
          foods: {
            create: meal.foods.map((food: any) => ({
              name: food.name,
              amount: food.amount,
              unit: food.unit,
              calories: food.calories,
              protein: food.protein,
              carbs: food.carbs,
              fat: food.fat,
            })),
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

  return new Response(JSON.stringify(updated), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const user = await getUserFromRequest(request);
  if (!user || !isCoach(user)) {
    return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401 });
  }

  const { id } = params;

  const diet = await prisma.dietPlan.findUnique({
    where: { id },
    include: { user: { select: { id: true, coachId: true } } },
  });

  if (!diet || diet.user.coachId !== user.id) {
    return new Response(JSON.stringify({ error: 'Diyet bulunamadı' }), { status: 404 });
  }

  await prisma.food.deleteMany({
    where: { meal: { dietPlanId: id } },
  });
  await prisma.meal.deleteMany({
    where: { dietPlanId: id },
  });
  await prisma.dietPlan.delete({ where: { id } });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
