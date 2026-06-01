import type { APIRoute } from 'astro';
import prisma from '../../../../lib/prisma';
import { getUserFromMobileRequest } from '../utils';
import { createNotificationAndPush } from '../../../../lib/notifications';

const messageSelect = {
  id: true,
  content: true,
  messageType: true,
  senderId: true,
  receiverId: true,
  fileUrl: true,
  fileName: true,
  fileMimeType: true,
  fileSize: true,
  read: true,
  createdAt: true,
  sender: { select: { id: true, name: true, photoUrl: true } },
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function canUsersMessage(user: any, otherUserId: string) {
  if (user?.role === 'coach') {
    const student = await prisma.user.findFirst({
      where: { id: otherUserId, coachId: user.id },
      select: { id: true },
    });
    return Boolean(student);
  }

  if (user?.role === 'student') {
    return user.coachId === otherUserId;
  }

  return false;
}

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getUserFromMobileRequest(request);
  if (!user) return jsonResponse({ error: 'Yetkisiz' }, 401);

  const otherUserId = params.userId;
  if (!otherUserId) return jsonResponse({ error: 'User ID required' }, 400);

  const hasAccess = await canUsersMessage(user, otherUserId);
  if (!hasAccess) return jsonResponse({ error: 'Forbidden' }, 403);

  await prisma.message.updateMany({
    where: { senderId: otherUserId, receiverId: user.id, read: false },
    data: { read: true },
  });

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: user.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: messageSelect,
  });

  return jsonResponse({ messages });
};

export const POST: APIRoute = async ({ request, params }) => {
  const user = await getUserFromMobileRequest(request);
  if (!user) return jsonResponse({ error: 'Yetkisiz' }, 401);

  const otherUserId = params.userId;
  if (!otherUserId) return jsonResponse({ error: 'User ID required' }, 400);

  const hasAccess = await canUsersMessage(user, otherUserId);
  if (!hasAccess) return jsonResponse({ error: 'Forbidden' }, 403);

  const data = await request.json();
  const content = typeof data?.content === 'string' ? data.content.trim() : '';
  if (!content) return jsonResponse({ error: 'Content required' }, 400);

  const message = await prisma.message.create({
    data: {
      content,
      messageType: 'text',
      senderId: user.id,
      receiverId: otherUserId,
    },
    select: messageSelect,
  });

  try {
    await createNotificationAndPush({
      userId: otherUserId,
      actorId: user.id,
      type: 'message',
      title: 'Yeni mesaj',
      body: content,
      payload: { messageId: message.id },
    });
  } catch (err) {
    console.error('Notification create error:', err);
  }

  return jsonResponse({ message }, 201);
};