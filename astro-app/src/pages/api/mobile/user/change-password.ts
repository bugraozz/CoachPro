import type { APIRoute } from 'astro';
import { getUserFromMobileRequest } from '../utils';
import prisma from '../../../../lib/prisma';
import { verifyPassword, hashPassword } from '../../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  const user = await getUserFromMobileRequest(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return new Response(JSON.stringify({ error: 'Tüm alanlar zorunludur' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (newPassword.length < 12) {
      return new Response(JSON.stringify({ error: 'Yeni şifre en az 12 karakter olmalıdır' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (newPassword !== confirmPassword) {
      return new Response(JSON.stringify({ error: 'Yeni şifreler eşleşmiyor' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const existingUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!existingUser) {
      return new Response(JSON.stringify({ error: 'Kullanıcı bulunamadı' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const isValid = await verifyPassword(currentPassword, existingUser.password);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Mevcut şifre yanlış' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
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
    return new Response(JSON.stringify({ error: 'Şifre değiştirilirken hata oluştu', details: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};