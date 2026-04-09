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

  // Mevcut aktif diyeti pasife çek
  await prisma.dietPlan.updateMany({
    where: { userId: student.id, active: true },
    data: { active: false }
  });

  const dietPlan = await prisma.dietPlan.create({
    data: {
      userId: student.id,
      name: data.name,
      startDate: new Date(),
      dailyCalorieTarget: data.dailyCalorieTarget,
      proteinTarget: data.proteinTarget,
      carbsTarget: data.carbsTarget,
      fatTarget: data.fatTarget,
      waterTarget: data.waterTarget || 3000,
      active: true,
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

  return new Response(JSON.stringify(dietPlan), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
