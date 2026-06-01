import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromMobileRequest } from './utils';

export const GET: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);

    if (!user || user.role !== 'coach') {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const students = await prisma.user.findMany({
      where: { coachId: user.id, role: 'student' },
      include: {
        selectedPackage: true,
        programs: { where: { status: 'active' }, select: { id: true } },
        dietPlans: { where: { active: true }, select: { id: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return new Response(JSON.stringify({ students }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Sunucu hatası', details: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);

    if (!user || user.role !== 'coach') {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await request.json();
    const { name, email, phone, gender, age, height, currentWeight, targetWeight, healthNotes } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: 'Ad soyad zorunludur' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const fallbackEmail = `client-${Date.now()}-${Math.floor(Math.random() * 100000)}@local.invalid`;
    const resolvedEmail = (email || '').trim() || fallbackEmail;

    const student = await prisma.user.create({
      data: {
        name,
        email: resolvedEmail,
        password: 'temporary-password',
        role: 'student',
        coachId: user.id,
        phone: phone || null,
        gender: gender || null,
        age: age ? Number(age) : null,
        height: height ? Number(height) : null,
        currentWeight: currentWeight ? Number(currentWeight) : null,
        targetWeight: targetWeight ? Number(targetWeight) : null,
        healthNotes: healthNotes || null,
        weightHistory: currentWeight ? {
          create: { weight: Number(currentWeight) },
        } : undefined,
      },
    });

    return new Response(JSON.stringify({ message: 'Öğrenci oluşturuldu', student }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Sunucu hatası', details: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
