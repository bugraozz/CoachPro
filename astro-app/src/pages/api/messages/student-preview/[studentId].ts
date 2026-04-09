import type { APIRoute } from 'astro';
import prisma from '../../../../lib/prisma';
import { getUserFromRequest } from '../../../../lib/auth';

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  if (user.role !== 'coach') {
    return new Response(JSON.stringify({ error: 'Only coaches can access student preview data' }), { status: 403 });
  }

  const studentId = params.studentId;
  if (!studentId) {
    return new Response(JSON.stringify({ error: 'Student ID required' }), { status: 400 });
  }

  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: 'student',
      coachId: user.id
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      gender: true,
      age: true,
      height: true,
      currentWeight: true,
      targetWeight: true,
      healthNotes: true,
      programs: {
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          name: true,
          category: true,
          status: true,
          createdAt: true,
          days: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              dayName: true,
              order: true,
              exercises: {
                orderBy: { order: 'asc' },
                select: {
                  id: true,
                  name: true,
                  muscleGroup: true,
                  sets: true,
                  reps: true,
                  order: true
                }
              }
            }
          }
        }
      },
      dietPlans: {
        where: { active: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          name: true,
          active: true,
          dailyCalorieTarget: true,
          proteinTarget: true,
          carbsTarget: true,
          fatTarget: true,
          createdAt: true,
          meals: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              name: true,
              order: true,
              foods: {
                select: {
                  id: true,
                  name: true,
                  amount: true,
                  unit: true,
                  calories: true,
                  protein: true,
                  carbs: true,
                  fat: true
                }
              }
            }
          }
        }
      },
      bodyAnalyses: {
        orderBy: { date: 'desc' },
        take: 5,
        select: {
          id: true,
          date: true,
          imageUrl: true,
          postureScore: true,
          postureNotes: true,
          analysisType: true
        }
      },
      weightHistory: {
        orderBy: { date: 'desc' },
        take: 12,
        select: {
          id: true,
          weight: true,
          date: true
        }
      },
      measurements: {
        orderBy: { date: 'desc' },
        take: 5,
        select: {
          id: true,
          date: true,
          chest: true,
          waist: true,
          hip: true,
          bodyFat: true
        }
      }
    }
  });

  if (!student) {
    return new Response(JSON.stringify({ error: 'Student not found' }), { status: 404 });
  }

  return new Response(JSON.stringify(student), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
