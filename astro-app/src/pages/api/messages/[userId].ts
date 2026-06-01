import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { createNotificationAndPush } from '../../../lib/notifications';
import { getUserFromRequest } from '../../../lib/auth';
import redis from '../../../lib/redis';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar'
]);

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
  sender: { select: { id: true, name: true, photoUrl: true } }
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function publishMessage(message: any) {
  try {
    const channel = `chat:${message.receiverId}`;
    await redis.publish(channel, JSON.stringify(message));
  } catch (err) {
    console.error('Redis publish error:', err);
  }
}

function sanitizeFileName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 80);
}

async function canUsersMessage(user: any, otherUserId: string) {
  if (user?.role === 'coach') {
    const student = await prisma.user.findFirst({
      where: { id: otherUserId, coachId: user.id },
      select: { id: true }
    });
    return Boolean(student);
  }

  if (user?.role === 'student') {
    return user.coachId === otherUserId;
  }

  return false;
}

async function createAttachmentMessage(userId: string, otherUserId: string, formData: FormData) {
  const file = formData.get('file');
  const rawContent = typeof formData.get('content') === 'string' ? String(formData.get('content')).trim() : '';

  if (!(file instanceof File)) {
    return jsonResponse({ error: 'File required' }, 400);
  }

  if (file.size <= 0) {
    return jsonResponse({ error: 'File is empty' }, 400);
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return jsonResponse({ error: 'File size must be 10MB or less' }, 400);
  }

  const mimeType = file.type || 'application/octet-stream';
  const isImage = mimeType.startsWith('image/');
  if (!isImage && !ALLOWED_DOCUMENT_MIME_TYPES.has(mimeType)) {
    return jsonResponse({ error: 'File type is not supported' }, 400);
  }

  const originalName = file.name || `upload${extname(file.name || '') || ''}`;
  const safeName = sanitizeFileName(originalName) || `upload_${Date.now()}`;
  const filename = `${Date.now()}_${randomUUID().slice(0, 8)}_${safeName}`;

  const uploadDir = join(process.cwd(), 'uploads', 'chat', userId);
  await mkdir(uploadDir, { recursive: true });

  const filePath = join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const message = await prisma.message.create({
    data: {
      content: rawContent || null,
      messageType: isImage ? 'image' : 'file',
      senderId: userId,
      receiverId: otherUserId,
      fileUrl: `/api/uploads/chat/${userId}/${filename}`,
      fileName: originalName,
      fileMimeType: mimeType,
      fileSize: file.size
    },
    select: messageSelect
  });

  await publishMessage(message);
  try {
    await createNotificationAndPush({
      userId: otherUserId,
      actorId: userId,
      type: 'message',
      title: 'Yeni mesaj',
      body: rawContent || (message.fileName ? `Dosya: ${message.fileName}` : null),
      payload: { messageId: message.id },
    });
  } catch (err) {
    console.error('Notification create error:', err);
  }
  return jsonResponse(message, 201);
}

export const GET: APIRoute = async ({ request, params }) => {
  const user = await getUserFromRequest(request);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const otherUserId = params.userId;
  if (!otherUserId) return jsonResponse({ error: 'User ID required' }, 400);

  const hasAccess = await canUsersMessage(user, otherUserId);
  if (!hasAccess) return jsonResponse({ error: 'Forbidden' }, 403);

  await prisma.message.updateMany({
    where: {
      senderId: otherUserId,
      receiverId: user.id,
      read: false
    },
    data: { read: true }
  });

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: user.id }
      ]
    },
    orderBy: { createdAt: 'asc' },
    select: messageSelect
  });

  return jsonResponse(messages);
};

export const POST: APIRoute = async ({ request, params }) => {
  const user = await getUserFromRequest(request);
  if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const otherUserId = params.userId;
  if (!otherUserId) return jsonResponse({ error: 'User ID required' }, 400);

  const hasAccess = await canUsersMessage(user, otherUserId);
  if (!hasAccess) return jsonResponse({ error: 'Forbidden' }, 403);

  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      return createAttachmentMessage(user.id, otherUserId, formData);
    }

    const data = await request.json();
    const rawContent = typeof data?.content === 'string' ? data.content.trim() : '';

    if (!rawContent) {
      return jsonResponse({ error: 'Content required' }, 400);
    }

    const msg = await prisma.message.create({
      data: {
        content: rawContent,
        messageType: 'text',
        senderId: user.id,
        receiverId: otherUserId
      },
      select: messageSelect
    });

    await publishMessage(msg);
    try {
      await createNotificationAndPush({
        userId: otherUserId,
        actorId: user.id,
        type: 'message',
        title: 'Yeni mesaj',
        body: rawContent || null,
        payload: { messageId: msg.id },
      });
    } catch (err) {
      console.error('Notification create error:', err);
    }
    return jsonResponse(msg, 201);
  } catch (error) {
    console.error('Message creation error:', error);
    return jsonResponse({ error: 'Error creating message' }, 500);
  }
};
