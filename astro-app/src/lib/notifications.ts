import type { Prisma } from '@prisma/client';
import prisma from './prisma';
import { sendPushToUser } from './push';

export async function createNotification(opts: {
  userId: string;
  actorId?: string | null;
  type: string;
  title?: string | null;
  body?: string | null;
  payload?: Record<string, unknown> | null;
}) {
  const { userId, actorId = null, type, title = null, body = null, payload = null } = opts;
  const data: Prisma.NotificationUncheckedCreateInput = {
    userId,
    actorId,
    type,
    title,
    body,
  };

  if (payload) {
    data.payload = payload as Prisma.InputJsonValue;
  }

  return prisma.notification.create({
    data,
  });
}

export async function createNotificationAndPush(opts: {
  userId: string;
  actorId?: string | null;
  type: string;
  title?: string | null;
  body?: string | null;
  payload?: Record<string, unknown> | null;
}){
  const notif = await createNotification(opts);
  try{
    await sendPushToUser(opts.userId, opts.title || opts.type, opts.body || '', opts.payload || {});
  }catch(err){
    console.error('Push send error:', err);
  }
  return notif;
}

export async function listNotifications(userId: string, opts?: { limit?: number; before?: Date }) {
  const limit = opts?.limit ?? 50;
  const where: any = { userId };
  if (opts?.before) where.createdAt = { lt: opts.before };

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function markNotificationsRead(userId: string, ids: string[]) {
  return prisma.notification.updateMany({
    where: { userId, id: { in: ids } },
    data: { read: true },
  });
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}
