import type { APIRoute } from 'astro';
import { getUserFromMobileRequest } from '../utils';
import { markNotificationsRead } from '../../../../lib/notifications';

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
  const ids = Array.isArray(data?.ids) ? data.ids.filter(Boolean) : [];
  if (ids.length === 0) return jsonResponse({ error: 'IDs required' }, 400);

  await markNotificationsRead(user.id, ids);
  return jsonResponse({ success: true });
};
