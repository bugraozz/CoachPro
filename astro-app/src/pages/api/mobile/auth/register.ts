import type { APIRoute } from 'astro';
import prisma from '../../../../lib/prisma';
import {
  hashPassword,
  generateReferralCode,
  hasActiveSubscription,
  createPaymentAccessToken,
} from '../../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, password, confirmPassword, name, role, referralCode } = body;

    const normalizedName = String(name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedRole = role === 'coach' ? 'coach' : 'student';
    const normalizedReferralCode = String(referralCode || '').trim().toUpperCase();

    if (!normalizedEmail || !password || !normalizedName || !normalizedRole) {
      return new Response(JSON.stringify({ error: 'Tüm alanlar gereklidir.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (password !== confirmPassword) {
      return new Response(JSON.stringify({ error: 'Şifreler eşleşmiyor.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Şifre en az 6 karakter olmalıdır.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Bu e-posta adresi zaten kullanımda.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const hashedPassword = await hashPassword(password);

    const createResult = await prisma.$transaction(async (tx: any) => {
      await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(72839174)');

      const [totalUsers, backofficeUsers] = await Promise.all([
        tx.user.count(),
        tx.user.count({
          where: {
            role: {
              in: ['admin', 'super_admin'],
            },
          },
        }),
      ]);

      const shouldBootstrapSuperAdmin = totalUsers === 0 && backofficeUsers === 0;

      if (shouldBootstrapSuperAdmin) {
        const bootstrapUser = await tx.user.create({
          data: {
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            role: 'super_admin',
            active: true,
          },
        });

        await tx.adminActionAudit.create({
          data: {
            action: 'bootstrap_super_admin_auto_register',
            adminUserId: bootstrapUser.id,
            adminEmail: bootstrapUser.email,
            targetUserId: bootstrapUser.id,
            targetEmail: bootstrapUser.email,
            metadata: {
              source: 'mobile_register_first_account',
            },
          },
        });

        return {
          user: bootstrapUser,
          requiresPayment: false,
        };
      }

      if (normalizedRole === 'student') {
        if (!normalizedReferralCode) {
          throw new Error('Öğrenci kaydı için eğitmen referans kodu gereklidir.');
        }

        const coach = await tx.user.findFirst({
          where: {
            referralCode: normalizedReferralCode,
            role: 'coach',
          },
        });

        if (!coach) {
          throw new Error('Geçersiz referans kodu.');
        }

        if (!hasActiveSubscription(coach)) {
          throw new Error('Bu eğitmenin aktif aboneliği bulunmuyor.');
        }

        const activePackageCount = await tx.coachPackage.count({
          where: {
            coachId: coach.id,
            isActive: true,
          },
        });

        if (activePackageCount === 0) {
          throw new Error('Bu eğitmenin aktif paketi bulunmuyor.');
        }

        const studentUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            password: hashedPassword,
            name: normalizedName,
            role: 'student',
            coachId: coach.id,
            active: false,
            studentPaymentStatus: 'pending',
          },
        });

        return {
          user: studentUser,
          requiresPayment: true,
        };
      }

      const coachUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: normalizedName,
          role: 'coach',
          referralCode: generateReferralCode(),
          subscriptionStatus: 'pending',
          active: false,
        },
      });

      return {
        user: coachUser,
        requiresPayment: true,
      };
    });

    const { password: _, ...safeUser } = createResult.user;
    const paymentAccessToken = createResult.requiresPayment ? createPaymentAccessToken(createResult.user.id) : null;

    return new Response(JSON.stringify({
      success: true,
      user: safeUser,
      requiresPayment: createResult.requiresPayment,
      paymentAccessToken,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    const message = typeof err?.message === 'string' && err.message ? err.message : 'Sunucu hatası';
    const status = message === 'Sunucu hatası' ? 500 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
