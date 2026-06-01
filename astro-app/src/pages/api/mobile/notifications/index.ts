import type { APIRoute } from 'astro';
import { getUserFromMobileRequest } from '../utils';
import { listNotifications, unreadCount } from '../../../../lib/notifications';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ request }) => {
  const user = await getUserFromMobileRequest(request);
  if (!user) return jsonResponse({ error: 'Yetkisiz' }, 401);

  const url = new URL(request.url);
  const before = url.searchParams.get('before');
  const limit = Number(url.searchParams.get('limit') || '50') || 50;
  const beforeDate = before ? new Date(before) : undefined;

  const notifications = await listNotifications(user.id, { limit, before: beforeDate });
  const unread = await unreadCount(user.id);

  return jsonResponse({ notifications, unread });
};
