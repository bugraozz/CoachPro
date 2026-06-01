import type { APIRoute } from 'astro';
import { resetPasswordWithToken } from '../../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json().catch(() => ({} as Record<string, unknown>));
    const token = String(data.token || '').trim();
    const newPassword = String(data.newPassword || '').trim();

    if (!token || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: 'Geçersiz istek. Şifre en az 6 karakter olmalıdır.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const success = await resetPasswordWithToken(token, newPassword);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Geçersiz veya süresi dolmuş bir token.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Şifreniz başarıyla güncellendi. Şimdi giriş yapabilirsiniz.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Mobile reset password error:', error);
    return new Response(JSON.stringify({ error: 'Şifre güncellenirken bir hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};