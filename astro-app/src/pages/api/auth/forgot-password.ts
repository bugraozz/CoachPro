import type { APIRoute } from 'astro';
import { generateResetToken } from '../../../lib/auth';
import { sendPasswordResetEmail } from '../../../lib/email';

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const data = await request.json();
    const { email } = data;

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Geçerli bir e-posta adresi giriniz.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const resetToken = await generateResetToken(email);

    if (resetToken) {
      const resetLink = `${url.origin}/auth/reset-password?token=${resetToken}`;
      
      // E-posta gönderimi
      const emailSent = await sendPasswordResetEmail(email, resetLink);
      
      return new Response(JSON.stringify({ 
         message: emailSent 
          ? 'Şifre sıfırlama linki e-posta adresinize gönderildi.' 
          : 'Şifre sıfırlama talebi alındı ancak e-posta gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.',
         devLink: import.meta.env.DEV ? resetLink : undefined 
      }), { 
         status: 200,
         headers: { 'Content-Type': 'application/json' }
      });
    }

    // Güvenlik: Email var veya yok bilgisini sızdırmıyoruz
    return new Response(JSON.stringify({ message: 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama linki gönderilmiştir.' }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Forgot Password error:', error);
    return new Response(JSON.stringify({ error: 'İşlem sırasında bir hata oluştu.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
