import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromMobileRequest } from './utils';

export const GET: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Parametreden contactId'yi al (chat odası için) veya son mesajlaşılan kişileri dön
    const url = new URL(request.url);
    const contactId = url.searchParams.get('contactId');

    if (contactId) {
      // Spesifik bir kişiyle olan mesajlar
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: user.id, receiverId: contactId },
            { senderId: contactId, receiverId: user.id }
          ]
        },
        orderBy: { createdAt: 'asc' }
      });
      return new Response(JSON.stringify({ messages }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } else {
      // Kişi listesi
      if (user.role === 'coach' || user.role === 'admin' || user.role === 'super_admin') {
        let students: any[] = [];
        if (user.role === 'coach') {
          students = await prisma.user.findMany({
            where: { coachId: user.id, role: 'student' },
            select: { id: true, name: true, photoUrl: true }
          });
        } else {
          // Admin can see all users as contacts for messaging
          students = await prisma.user.findMany({
            select: { id: true, name: true, photoUrl: true },
            take: 100
          });
        }
        return new Response(JSON.stringify({ contacts: students }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else {
        const coachInfo = await prisma.user.findFirst({
          where: { id: user.coachId || '' },
          select: { id: true, name: true, photoUrl: true }
        });
        return new Response(JSON.stringify({ contacts: coachInfo ? [coachInfo] : [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Sunucu hatası', details: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Yetkisiz' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { receiverId, content } = await request.json();
    if (!receiverId || !content) {
      return new Response(JSON.stringify({ error: 'Eksik bilgi' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const message = await prisma.message.create({
      data: {
        senderId: user.id,
        receiverId,
        content,
        messageType: 'text'
      }
    });

    return new Response(JSON.stringify({ message }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Sunucu hatası', details: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
