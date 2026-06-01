import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromRequest, isCoach, isStudent } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Yetkisiz istek' }), { status: 401 });
  }

  const data = await request.json();
  const userId = data.clientId || data.userId;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Kullanici bulunamadi' }), { status: 400 });
  }

  if (isCoach(user)) {
    const student = await prisma.user.findFirst({
      where: { id: userId, role: 'student', coachId: user.id },
      select: { id: true },
    });

    if (!student) {
      return new Response(JSON.stringify({ error: 'Bu ogrenciye erisim yetkiniz yok' }), { status: 403 });
    }
  } else if (isStudent(user)) {
    if (user.id !== userId) {
      return new Response(JSON.stringify({ error: 'Sadece kendi verinizi guncelleyebilirsiniz' }), { status: 403 });
    }
  } else {
    return new Response(JSON.stringify({ error: 'Yetkisiz istek' }), { status: 401 });
  }

  const measurement = await prisma.measurement.create({
    data: {
      userId,
      chest: data.chest || null,
      waist: data.waist || null,
      hip: data.hip || null,
      armLeft: data.armLeft || null,
      armRight: data.armRight || null,
      legLeft: data.legLeft || null,
      legRight: data.legRight || null,
      bodyFat: data.bodyFat || null,
      neck: data.neck || null,
      shoulders: data.shoulders || null,
    },
  });

  return new Response(JSON.stringify(measurement), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
