import type { APIRoute } from 'astro';
import { getSessionToken, deleteSession, deleteSessionCookie } from '../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const cookieHeader = request.headers.get('cookie');
  const token = getSessionToken(cookieHeader);
  
  if (token) {
    await deleteSession(token);
  }

  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/auth/login',
      'Set-Cookie': deleteSessionCookie(),
    },
  });
};
