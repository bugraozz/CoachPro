import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromMobileRequest } from './utils';

export const GET: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const isCoach = user.role === 'coach';
    
    if (isCoach) {
      const students = await prisma.user.findMany({
        where: { coachId: user.id, role: 'student' },
        include: {
          weightHistory: { orderBy: { date: 'desc' }, take: 1 },
          programs: { where: { status: 'active' } },
          dietPlans: { where: { active: true } },
          selectedPackage: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const recentPaidNotifications = await prisma.paymentTransaction.findMany({
        where: {
          coachId: user.id,
          type: 'student_package',
          status: 'paid',
        },
        include: {
          student: { select: { id: true, name: true } },
          coachPackage: { select: { name: true } },
        },
        orderBy: { paidAt: 'desc' },
        take: 5,
      });

      const stats = {
        totalStudents: students.length,
        activePrograms: students.filter(s => s.programs.length > 0).length,
        activeDiets: students.filter(s => s.dietPlans.length > 0).length,
      };

      return new Response(JSON.stringify({
        role: 'coach',
        stats,
        recentStudents: students.slice(0, 5),
        recentNotifications: recentPaidNotifications
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Öğrenci
      const studentData = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          coach: true,
          programs: { where: { status: 'active' }, include: { days: { include: { exercises: true } } }, take: 1 },
          dietPlans: { where: { active: true }, include: { meals: { include: { foods: true } } }, take: 1 },
        },
      });

      return new Response(JSON.stringify({
        role: 'student',
        user: {
          currentWeight: studentData?.currentWeight,
          targetWeight: studentData?.targetWeight,
          height: studentData?.height,
          coach: studentData?.coach ? { name: studentData.coach.name } : null
        },
        activeProgram: studentData?.programs?.[0] || null,
        activeDiet: studentData?.dietPlans?.[0] || null,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Sunucu hatası', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
