import type { APIRoute } from 'astro';
import prisma from '../../../../lib/prisma';
import { getUserFromMobileRequest } from '../utils';
import { isSuperAdmin } from '../../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);

    if (!user || !isSuperAdmin(user)) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const students = await prisma.user.findMany({
      where: { role: 'student' },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        createdAt: true,
        studentPaymentStatus: true,
        studentAccessEnd: true,
        coach: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return new Response(JSON.stringify({ students }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
    const { action, userId, nextState, days } = body;

    if (action === 'toggle_user_active') {
      await prisma.user.updateMany({
        where: { id: userId, role: 'student' },
        data: { active: nextState === 1 || nextState === true }
      });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'extend_student_membership' || action === 'gift_student_membership') {
      const targetUser = await prisma.user.findFirst({
        where: { id: userId, role: 'student' }
      });

      if (!targetUser) {
        return new Response(JSON.stringify({ error: 'Kullanıcı bulunamadı' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

      const now = new Date();
      const baseAccessDate = targetUser.studentAccessEnd && new Date(targetUser.studentAccessEnd) > now
        ? new Date(targetUser.studentAccessEnd)
        : now;

      const nextAccessEnd = new Date(baseAccessDate);
      nextAccessEnd.setDate(nextAccessEnd.getDate() + (days || 30));

      await prisma.user.update({
        where: { id: userId },
        data: {
          active: true,
          studentPaymentStatus: 'paid',
          studentPaidAt: targetUser.studentPaidAt || now,
          studentAccessEnd: nextAccessEnd,
        },
      });

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Geçersiz işlem' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Sunucu hatası', details: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
