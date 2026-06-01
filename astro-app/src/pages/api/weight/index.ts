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
  const weight = Number(data.weight);

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Kullanici bulunamadi' }), { status: 400 });
  }

  if (!Number.isFinite(weight) || weight <= 0 || weight > 500) {
    return new Response(JSON.stringify({ error: 'Gecersiz kilo degeri' }), { status: 400 });
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

  const record = await prisma.weightRecord.create({
    data: {
      userId,
      weight,
    },
  });

  // Keep profile's current weight in sync.
  await prisma.user.update({
    where: { id: userId },
    data: { currentWeight: weight },
  });

  return new Response(JSON.stringify(record), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
