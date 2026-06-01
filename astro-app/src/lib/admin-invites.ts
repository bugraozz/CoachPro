import { createHash, randomBytes } from 'crypto';
import prisma from './prisma';

const DEFAULT_ADMIN_INVITE_TTL_HOURS = 48;
const ADMIN_INVITE_ALLOWED_ROLES = new Set(['admin', 'super_admin']);

const prismaClient = prisma as any;

function normalizeRole(rawRole: unknown): 'admin' | 'super_admin' {
  const role = String(rawRole || '').trim().toLowerCase();
  if (role === 'super_admin') {
    return 'super_admin';
  }

  return 'admin';
}

function normalizeEmail(rawEmail: unknown): string {
  return String(rawEmail || '').trim().toLowerCase();
}

export function hashAdminInviteToken(token: string): string {
  return createHash('sha256').update(String(token || '').trim()).digest('hex');
}

export function generateAdminInviteToken(): string {
  return randomBytes(32).toString('hex');
}

export function getAdminInviteTtlHours(): number {
  const parsed = Number.parseInt(String(import.meta.env.ADMIN_INVITE_TTL_HOURS || '').trim(), 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_ADMIN_INVITE_TTL_HOURS;
  }

  return Math.min(168, Math.max(1, parsed));
}

export function getAdminInviteAppOrigin(request: Request): string {
  const envOrigin = String(import.meta.env.PUBLIC_APP_URL || '').trim();
  if (envOrigin && /^https?:\/\//.test(envOrigin)) {
    return envOrigin.replace(/\/+$/, '');
  }

  if (import.meta.env.PROD) {
    throw new Error('PUBLIC_APP_URL must be configured in production');
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function createAdminInvite(params: {
  email: string;
  role: string;
  invitedByUserId: string;
  invitedByEmail?: string | null;
  ttlHours?: number;
}): Promise<{
  token: string;
  record: {
    id: string;
    email: string;
    role: string;
    expiresAt: Date;
    createdAt: Date;
  };
}> {
  const email = normalizeEmail(params.email);
  if (!email || !email.includes('@')) {
    throw new Error('Gecerli bir e-posta adresi gereklidir.');
  }

  const role = normalizeRole(params.role);
  if (!ADMIN_INVITE_ALLOWED_ROLES.has(role)) {
    throw new Error('Gecerli bir admin rol secilmelidir.');
  }

  const ttlHours = Number.isFinite(Number(params.ttlHours))
    ? Math.min(168, Math.max(1, Math.round(Number(params.ttlHours))))
    : getAdminInviteTtlHours();

  const token = generateAdminInviteToken();
  const tokenHash = hashAdminInviteToken(token);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

  await prismaClient.adminInvitation.updateMany({
    where: {
      email,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    data: {
      revokedAt: now,
      metadata: {
        revokedReason: 'replaced_by_new_invite',
      },
    },
  });

  const record = await prismaClient.adminInvitation.create({
    data: {
      email,
      role,
      tokenHash,
      invitedByUserId: params.invitedByUserId,
      invitedByEmail: normalizeEmail(params.invitedByEmail || ''),
      expiresAt,
      metadata: {
        inviteTtlHours: ttlHours,
      },
    },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return {
    token,
    record,
  };
}

export async function getAdminInviteByToken(token: string): Promise<any | null> {
  const tokenHash = hashAdminInviteToken(token);
  if (!tokenHash) return null;

  return prismaClient.adminInvitation.findUnique({
    where: { tokenHash },
  });
}

export async function acceptAdminInvite(params: {
  token: string;
  userId: string;
  userEmail: string;
  acceptedFromIp?: string;
  acceptedUserAgent?: string | null;
}): Promise<{ role: string }> {
  const tokenHash = hashAdminInviteToken(params.token);
  const userEmail = normalizeEmail(params.userEmail);

  if (!tokenHash) {
    throw new Error('Davet tokeni gecersiz.');
  }

  const now = new Date();

  const result = await prismaClient.$transaction(async (tx: any) => {
    const invite = await tx.adminInvitation.findUnique({
      where: { tokenHash },
    });

    if (!invite) {
      throw new Error('Davet bulunamadi.');
    }

    if (invite.revokedAt) {
      throw new Error('Bu davet iptal edildi.');
    }

    if (invite.acceptedAt) {
      throw new Error('Bu davet daha once kullanildi.');
    }

    if (new Date(invite.expiresAt) <= now) {
      throw new Error('Davet suresi doldu.');
    }

    if (normalizeEmail(invite.email) !== userEmail) {
      throw new Error('Bu davet farkli bir e-posta adresi icin olusturuldu.');
    }

    const role = normalizeRole(invite.role);

    await tx.user.update({
      where: { id: params.userId },
      data: { role },
    });

    await tx.adminInvitation.update({
      where: { id: invite.id },
      data: {
        acceptedAt: now,
        acceptedByUserId: params.userId,
        metadata: {
          ...(invite.metadata && typeof invite.metadata === 'object' ? invite.metadata : {}),
          acceptedFromIp: params.acceptedFromIp || null,
          acceptedUserAgent: params.acceptedUserAgent || null,
        },
      },
    });

    return { role };
  });

  return result;
}

export async function revokeAdminInvite(params: {
  inviteId: string;
  revokedByUserId: string;
  revokedByEmail?: string | null;
}): Promise<boolean> {
  const updated = await prismaClient.adminInvitation.updateMany({
    where: {
      id: params.inviteId,
      acceptedAt: null,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      metadata: {
        revokedByUserId: params.revokedByUserId,
        revokedByEmail: normalizeEmail(params.revokedByEmail || ''),
      },
    },
  });

  return Boolean(updated.count);
}
