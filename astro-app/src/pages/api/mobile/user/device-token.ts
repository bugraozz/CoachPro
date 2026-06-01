import type { APIRoute } from 'astro';
import prisma from '../../../../lib/prisma';
import { getUserFromMobileRequest } from '../utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await request.json();
    const { token, platform } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token gereklidir' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Kullanıcının mevcut tokenını kaydet (eğer yoksa)
    await prisma.deviceToken.upsert({
      where: { token },
      update: { userId: user.id, platform: platform || 'unknown', revoked: false },
      create: {
        userId: user.id,
        token,
        platform: platform || 'unknown',
      },
    });

    return new Response(JSON.stringify({ message: 'Cihaz tokenı kaydedildi' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Sunucu hatası', details: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
