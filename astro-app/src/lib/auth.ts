import bcrypt from 'bcryptjs';
import { parse, serialize } from 'cookie';
import prisma from './prisma';

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_EXPIRY_DAYS = 7;

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
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
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
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

// Request'ten kullanıcı alma
export async function getUserFromRequest(request: Request) {
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

export function isBackofficeUser(user: any): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const allowedEmailsRaw = String(import.meta.env.ADMIN_EMAILS || '').trim();
  if (!allowedEmailsRaw) return false;

  const allowedEmails = allowedEmailsRaw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return allowedEmails.includes(String(user.email || '').trim().toLowerCase());
}

// Eğitmenin aboneliği aktif mi?
export function hasActiveSubscription(user: any): boolean {
  if (!isCoach(user)) return false;
  if (user.subscriptionStatus !== 'active') return false;
  if (user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date()) return false;
  return true;
}
