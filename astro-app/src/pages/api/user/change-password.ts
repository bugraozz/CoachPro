import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromRequest, verifyPassword, hashPassword } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const user = await getUserFromRequest(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return new Response(JSON.stringify({ error: 'Tüm alanlar zorunludur' }), { status: 400 });
    }

    if (newPassword.length < 12) {
      return new Response(JSON.stringify({ error: 'Yeni şifre en az 12 karakter olmalıdır' }), { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return new Response(JSON.stringify({ error: 'Yeni şifreler eşleşmiyor' }), { status: 400 });
    }

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Mevcut şifre yanlış' }), { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return new Response(JSON.stringify({ success: true, message: 'Şifre başarıyla değiştirildi' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Password change error:', err);
    return new Response(JSON.stringify({ error: 'Şifre değiştirilirken hata oluştu' }), { status: 500 });
  }
};
