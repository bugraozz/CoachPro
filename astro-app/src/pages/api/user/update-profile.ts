import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromRequest } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone, gender, age, height, currentWeight, targetWeight, healthNotes } = body;

    if (!name || name.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'İsim en az 2 karakter olmalıdır' }), { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        gender: gender || null,
        age: age ? parseInt(age) : null,
        height: height ? parseFloat(height) : null,
        currentWeight: currentWeight ? parseFloat(currentWeight) : null,
        targetWeight: targetWeight ? parseFloat(targetWeight) : null,
        healthNotes: healthNotes?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        age: true,
        height: true,
        currentWeight: true,
        targetWeight: true,
        healthNotes: true,
        role: true,
      },
    });

    return new Response(JSON.stringify({ success: true, user: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Profile update error:', err);
    return new Response(JSON.stringify({ error: 'Profil güncellenirken hata oluştu' }), { status: 500 });
  }
};
