import type { APIRoute } from 'astro';
import prisma from '../../../../lib/prisma';
import {
  verifyPassword,
  createSession,
  syncMembershipAccessState,
  requiresPaymentStep,
  createPaymentAccessToken,
} from '../../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, password } = body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return new Response(JSON.stringify({ error: 'E-posta ve şifre gereklidir.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!existingUser) {
      return new Response(JSON.stringify({ error: 'E-posta veya şifre hatalı.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await syncMembershipAccessState(existingUser);

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return new Response(JSON.stringify({ error: 'E-posta veya şifre hatalı.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!user.active) {
      if (requiresPaymentStep(user)) {
        return new Response(JSON.stringify({
          error: 'Hesabınız aktif değil. Lütfen ödeme işlemini tamamlayın.',
          requiresPayment: true,
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
          paymentAccessToken: createPaymentAccessToken(user.id),
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Hesabınız aktif değil.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Başarılı giriş, session oluştur. Mobil uygulamada bu token kullanılacak.
    const token = await createSession(user.id);
    
    // Güvenlik: şifreyi dönme
    const { password: _, ...safeUser } = user;

    return new Response(JSON.stringify({ 
      success: true, 
      token, 
      user: safeUser 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Sunucu hatası', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
