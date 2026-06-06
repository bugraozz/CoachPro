import type { APIRoute } from 'astro';
import prisma from '../../../../lib/prisma';
import { getUserFromMobileRequest } from '../utils';
import { isSuperAdmin } from '../../../../lib/auth';
import { getCoachStudentPackageDiscount, setCoachStudentPackageDiscount } from '../../../../lib/pricing';

export const GET: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);

    if (!user || !isSuperAdmin(user)) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const coaches = await prisma.user.findMany({
      where: { role: 'coach' },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        referralCode: true,
        subscriptionStatus: true,
        subscriptionEnd: true,
        createdAt: true,
        _count: {
          select: { students: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const coachesWithDiscounts = await Promise.all(
      coaches.map(async (coach) => {
        const discount = await getCoachStudentPackageDiscount(coach.id);
        return {
          ...coach,
          discount
        };
      })
    );

    return new Response(JSON.stringify({ coaches: coachesWithDiscounts }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Sunucu hatası', details: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);
    if (!user || !isSuperAdmin(user)) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await request.json();
    const { action, coachId, nextState, permanent, months, enabled, amount } = body;

    if (action === 'toggle_user_active') {
      await prisma.user.update({
        where: { id: coachId },
        data: { active: nextState === 1 || nextState === true }
      });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'grant_free_coach_access') {
      const coach = await prisma.user.findFirst({
        where: { id: coachId, role: 'coach' }
      });

      if (!coach) return new Response(JSON.stringify({ error: 'Eğitmen bulunamadı' }), { status: 404 });

      const now = new Date();
      const baseDate = coach.subscriptionEnd && new Date(coach.subscriptionEnd) > now
        ? new Date(coach.subscriptionEnd)
        : now;
      const subscriptionEnd = permanent
        ? null
        : new Date(new Date(baseDate).setMonth(baseDate.getMonth() + (months || 1)));

      await prisma.user.update({
        where: { id: coachId },
        data: {
          active: true,
          subscriptionStatus: 'active',
          subscriptionEnd,
          subscriptionId: permanent ? 'admin-granted-permanent' : `admin-granted-${Date.now()}`,
        },
      });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'save_coach_discount') {
      await setCoachStudentPackageDiscount(coachId, {
        enabled: Boolean(enabled),
        amount: Number(amount) || 0,
        updatedBy: user.id,
      });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Geçersiz işlem' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Sunucu hatası', details: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
