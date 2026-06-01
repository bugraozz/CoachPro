import type { APIRoute } from 'astro';
import { getUserFromMobileRequest } from '../utils';
import prisma from '../../../../lib/prisma';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const user = await getUserFromMobileRequest(request);
  if (!user) return jsonResponse({ error: 'Yetkisiz' }, 401);

  const data = await request.json().catch(() => ({}));
  const token = String(data?.token || '').trim();
  const platform = String(data?.platform || '').trim() || null;
  if (!token) return jsonResponse({ error: 'Token required' }, 400);

  try{
    await prisma.deviceToken.upsert({
      where: { token },
      update: { revoked: false, platform, userId: user.id },
      create: { token, platform, userId: user.id }
    });
  }catch(err){
    console.error('Register device token error:', err);
    return jsonResponse({ error: 'Could not register token' }, 500);
  }

  return jsonResponse({ success: true });
};
