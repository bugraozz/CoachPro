import type { APIRoute } from 'astro';
import { resetPasswordWithToken } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { token, newPassword } = data;

    if (!token || !newPassword || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: 'Geçersiz istek. Şifre en az 6 karakter olmalıdır.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const success = await resetPasswordWithToken(token, newPassword);

    if (success) {
      return new Response(JSON.stringify({ message: 'Şifreniz başarıyla güncellendi. Şimdi giriş yapabilirsiniz.' }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ error: 'Geçersiz veya süresi dolmuş bir token.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Reset Password error:', error);
    return new Response(JSON.stringify({ error: 'Şifre güncellenirken bir hata oluştu.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
