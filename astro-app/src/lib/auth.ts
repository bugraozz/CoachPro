import bcrypt from 'bcryptjs';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { parse, serialize } from 'cookie';
import prisma from './prisma';

const SESSION_COOKIE_NAME = 'session_token';
const PAYMENT_ACCESS_COOKIE_NAME = 'payment_access_token';
const SESSION_EXPIRY_DAYS = 7;
const PAYMENT_ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

const BACKOFFICE_ROLES = new Set(['admin', 'super_admin']);

// Şifre hashleme
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Şifre doğrulama
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Rastgele token oluşturma
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function getPaymentTokenSecret(): string {
  const explicitSecret = String(import.meta.env.PAYMENT_LINK_SECRET || '').trim();
  if (explicitSecret) {
    return explicitSecret;
  }

  const iyzicoSecret = String(import.meta.env.IYZICO_SECRET_KEY || '').trim();
  if (iyzicoSecret) {
    return iyzicoSecret;
  }

  if (import.meta.env.PROD) {
    throw new Error('PAYMENT_LINK_SECRET (or IYZICO_SECRET_KEY) must be configured in production');
  }

  return 'coachpro-dev-payment-secret-change-me';
}

export function createPaymentAccessToken(userId: string): string {
  const expiresAt = Date.now() + PAYMENT_ACCESS_TOKEN_TTL_SECONDS * 1000;
  const payload = `${userId}.${expiresAt}`;
  const signature = createHmac('sha256', getPaymentTokenSecret()).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

export function verifyPaymentAccessToken(token: string, expectedUserId: string): boolean {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return false;

  const [userId, expiresAtRaw, signature] = parts;
  if (!userId || !expiresAtRaw || !signature) return false;
  if (userId !== expectedUserId) return false;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }

  const payload = `${userId}.${expiresAtRaw}`;
  const expectedSignature = createHmac('sha256', getPaymentTokenSecret()).update(payload).digest('hex');

  const actualBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function createPaymentAccessCookie(token: string): string {
  return serialize(PAYMENT_ACCESS_COOKIE_NAME, token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: PAYMENT_ACCESS_TOKEN_TTL_SECONDS,
  });
}

export function deletePaymentAccessCookie(): string {
  return serialize(PAYMENT_ACCESS_COOKIE_NAME, '', {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function getPaymentAccessToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = parse(cookieHeader);
  return cookies[PAYMENT_ACCESS_COOKIE_NAME] || null;
}

// Referans kodu oluşturma (eğitmenler için)
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Session oluşturma
export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

// Session cookie oluşturma
export function createSessionCookie(token: string): string {
  return serialize(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
  });
}

// Session cookie silme
export function deleteSessionCookie(): string {
  return serialize(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

// Cookie'den session token alma
export function getSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = parse(cookieHeader);
  return cookies[SESSION_COOKIE_NAME] || null;
}

function isPastDate(value: unknown): boolean {
  if (!value) return false;

  const timestamp = new Date(value as string | number | Date).getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

function buildMembershipExpiryPatch(user: any): Record<string, unknown> | null {
  if (!user?.id) return null;

  if (isCoach(user) && user.subscriptionStatus === 'active' && isPastDate(user.subscriptionEnd)) {
    return {
      subscriptionStatus: 'pending',
      active: false,
    };
  }

  if (isStudent(user) && user.studentPaymentStatus === 'paid' && isPastDate(user.studentAccessEnd)) {
    return {
      studentPaymentStatus: 'pending',
      active: false,
    };
  }

  return null;
}

export async function syncMembershipAccessState(user: any) {
  let patch = buildMembershipExpiryPatch(user);

  if (
    !patch &&
    isStudent(user) &&
    user.studentPaymentStatus === 'paid' &&
    !user.studentAccessEnd &&
    user.studentPaidAt &&
    user.selectedPackageId
  ) {
    const selectedPackage = await prisma.coachPackage.findUnique({
      where: { id: user.selectedPackageId },
      select: { durationWeeks: true },
    });

    if (selectedPackage?.durationWeeks) {
      const studentAccessEnd = new Date(user.studentPaidAt);
      studentAccessEnd.setDate(studentAccessEnd.getDate() + (selectedPackage.durationWeeks * 7));

      patch = {
        studentAccessEnd,
      };

      if (isPastDate(studentAccessEnd)) {
        patch.studentPaymentStatus = 'pending';
        patch.active = false;
      }
    }
  }

  if (!patch) return user;

  await prisma.user.update({
    where: { id: user.id },
    data: patch,
  });

  return {
    ...user,
    ...patch,
  };
}

export function requiresPaymentStep(user: any): boolean {
  if (isCoach(user)) {
    return user.subscriptionStatus === 'pending';
  }

  if (isStudent(user)) {
    return user.studentPaymentStatus !== 'paid';
  }

  return false;
}

// Session'dan kullanıcı alma
export async function getUserFromSession(token: string | null) {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          students: true,
          coach: true,
        },
      },
    },
  });

  if (!session) return null;

  session.user = await syncMembershipAccessState(session.user);

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

// Request'ten kullanıcı alma
export async function getUserFromRequest(request: Request) {
  // 1. Önce Mobil (API) Authorization Header'ına bak
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.split(' ')[1];
    if (bearerToken) {
      return getUserFromSession(bearerToken);
    }
  }

  // 2. Yoksa Web Cookie'sine bak
  const cookieHeader = request.headers.get('cookie');
  const token = getSessionToken(cookieHeader);
  return getUserFromSession(token);
}

// Session silme (logout)
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } });
}

// Kullanıcı tipini kontrol et
export function isCoach(user: any): boolean {
  return user?.role === 'coach';
}

export function isStudent(user: any): boolean {
  return user?.role === 'student';
}

export function isAdmin(user: any): boolean {
  return Boolean(user) && BACKOFFICE_ROLES.has(String(user.role || '').trim().toLowerCase());
}

export function isSuperAdmin(user: any): boolean {
  return Boolean(user) && String(user.role || '').trim().toLowerCase() === 'super_admin';
}

export function canManageAdminSecurity(user: any): boolean {
  return isSuperAdmin(user);
}

export function isBackofficeUser(user: any): boolean {
  return isAdmin(user);
}

// Eğitmenin aboneliği aktif mi?
export function hasActiveSubscription(user: any): boolean {
  if (!isCoach(user)) return false;
  if (!user.active) return false;
  if (user.subscriptionStatus !== 'active') return false;
  if (user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date()) return false;
  return true;
}

// Şifre sıfırlama tokeni oluştur
export async function generateResetToken(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const resetToken = randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 saat geçerli

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry,
    },
  });

  return resetToken;
}

// Şifreyi token ile yenile
export async function resetPasswordWithToken(token: string, newPasswordRaw: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { resetToken: token } });

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return false; // Token geçersiz veya süresi dolmuş
  }

  const hashedPassword = await hashPassword(newPasswordRaw);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return true;
}
