import type { APIRoute } from 'astro';
import { generateResetToken } from '../../../../lib/auth';
import { sendPasswordResetEmail } from '../../../../lib/email';

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const data = await request.json().catch(() => ({} as Record<string, unknown>));
    const email = String(data.email || '').trim().toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Geçerli bir e-posta adresi giriniz.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const resetToken = await generateResetToken(email);

    if (resetToken) {
      const resetLink = `${url.origin}/auth/reset-password?token=${resetToken}`;
      const emailSent = await sendPasswordResetEmail(email, resetLink);

      return new Response(JSON.stringify({
        message: emailSent
          ? 'Şifre sıfırlama linki e-posta adresinize gönderildi.'
          : 'Şifre sıfırlama talebi alındı ancak e-posta gönderilemedi.',
        devLink: import.meta.env.DEV ? resetLink : undefined,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama linki gönderilmiştir.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Mobile forgot password error:', error);
    return new Response(JSON.stringify({ error: 'İşlem sırasında bir hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};