import type { APIRoute } from 'astro';
import prisma from '../../../lib/prisma';
import { getUserFromMobileRequest } from './utils';
import { isBackofficeUser, isSuperAdmin } from '../../../lib/auth';
import { DEFAULT_MAINTENANCE_MESSAGE, getMaintenanceModeStatus, setMaintenanceModeStatus } from '../../../lib/system-settings';
import { getCoachSubscriptionPlans, getCoachSubscriptionPlanDiscounts, getGlobalCoachSubscriptionDiscount, setCoachSubscriptionPlanPrices, setCoachSubscriptionPlanDiscounts, setGlobalCoachSubscriptionDiscount } from '../../../lib/pricing';
import { createAdminInvite, getAdminInviteAppOrigin, getAdminInviteTtlHours, revokeAdminInvite } from '../../../lib/admin-invites';
import { getPlatformPayoutProfile, isPlatformPayoutReady, setPlatformPayoutProfile } from '../../../lib/payment-settings';

const prismaClient = prisma as any;

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
}

function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

async function writeAdminAuditLog(user: any, request: Request, action: string, metadata?: Record<string, unknown>) {
  try {
    await prismaClient.adminActionAudit.create({
      data: {
        action,
        adminUserId: user.id,
        adminEmail: user.email || null,
        metadata: {
          ...(metadata || {}),
          ip: getRequestIp(request),
          userAgent: request.headers.get('user-agent') || null,
        },
      },
    });
  } catch (auditError) {
    console.error('Mobile admin audit failed:', auditError);
  }
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);
    if (!user || !isBackofficeUser(user)) {
      return response({ error: 'Yetkisiz' }, 401);
    }

    const [maintenanceMode, totalUsers, totalCoaches, totalStudents, paidTransactionsCount, coachPlans, coachPlanDiscounts, globalCoachDiscount, platformPayoutProfile, backofficeUsers, pendingInvites, acceptedInvites] = await Promise.all([
      getMaintenanceModeStatus(),
      prisma.user.count(),
      prisma.user.count({ where: { role: 'coach' } }),
      prisma.user.count({ where: { role: 'student' } }),
      prisma.paymentTransaction.count({ where: { status: 'paid' } }),
      getCoachSubscriptionPlans(),
      getCoachSubscriptionPlanDiscounts(),
      getGlobalCoachSubscriptionDiscount(),
      getPlatformPayoutProfile(),
      prisma.user.findMany({ where: { role: { in: ['admin', 'super_admin'] } }, select: { id: true, name: true, email: true, role: true, active: true }, orderBy: { createdAt: 'desc' } }),
      prismaClient.adminInvitation.findMany({ where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prismaClient.adminInvitation.findMany({ where: { acceptedAt: { not: null } }, orderBy: { acceptedAt: 'desc' }, take: 30 }),
    ]);

    return response({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      isSuperAdmin: isSuperAdmin(user),
      maintenanceMode,
      counts: { totalUsers, totalCoaches, totalStudents, paidTransactionsCount },
      coachPlans,
      coachPlanDiscounts,
      globalCoachDiscount,
      platformPayoutProfile,
      platformPayoutReady: isPlatformPayoutReady(platformPayoutProfile),
      backofficeUsers,
      pendingInvites,
      acceptedInvites,
      defaultMaintenanceMessage: DEFAULT_MAINTENANCE_MESSAGE,
      adminInviteTtlHours: getAdminInviteTtlHours(),
    });
  } catch (error: any) {
    return response({ error: 'Sunucu hatası', details: error.message }, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await getUserFromMobileRequest(request);
    if (!user || !isBackofficeUser(user)) {
      return response({ error: 'Yetkisiz' }, 401);
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const action = String(body.action || '').trim();

    if (action === 'toggle_maintenance_mode') {
      if (!isSuperAdmin(user)) {
        return response({ error: 'Bu işlemi sadece super admin yapabilir.' }, 403);
      }

      const enabled = Boolean(body.enabled);
      const message = String(body.message || '').trim() || DEFAULT_MAINTENANCE_MESSAGE;
      const maintenanceMode = await setMaintenanceModeStatus({ enabled, message, updatedBy: user.id });
      await writeAdminAuditLog(user, request, action, { enabled, message });
      return response({ success: true, maintenanceMode });
    }

    if (action === 'save_subscription_plans') {
      if (!isSuperAdmin(user)) {
        return response({ error: 'Bu işlemi sadece super admin yapabilir.' }, 403);
      }

      const monthlyPrice = Number(body.monthlyPrice);
      const yearlyPrice = Number(body.yearlyPrice);
      await setCoachSubscriptionPlanPrices({ monthlyPrice, yearlyPrice, updatedBy: user.id });
      await writeAdminAuditLog(user, request, action, { monthlyPrice, yearlyPrice });
      return response({ success: true });
    }

    if (action === 'save_subscription_plan_discounts') {
      if (!isSuperAdmin(user)) {
        return response({ error: 'Bu işlemi sadece super admin yapabilir.' }, 403);
      }

      await setCoachSubscriptionPlanDiscounts({
        monthlyEnabled: Boolean(body.monthlyEnabled),
        monthlyAmount: Number(body.monthlyAmount),
        yearlyEnabled: Boolean(body.yearlyEnabled),
        yearlyAmount: Number(body.yearlyAmount),
        updatedBy: user.id,
      });
      await writeAdminAuditLog(user, request, action, body as Record<string, unknown>);
      return response({ success: true });
    }

    if (action === 'save_global_discount') {
      if (!isSuperAdmin(user)) {
        return response({ error: 'Bu işlemi sadece super admin yapabilir.' }, 403);
      }

      await setGlobalCoachSubscriptionDiscount({
        enabled: Boolean(body.enabled),
        amount: Number(body.amount),
        updatedBy: user.id,
      });
      await writeAdminAuditLog(user, request, action, body as Record<string, unknown>);
      return response({ success: true });
    }

    if (action === 'create_admin_invite') {
      if (!isSuperAdmin(user)) {
        return response({ error: 'Bu işlemi sadece super admin yapabilir.' }, 403);
      }

      const email = String(body.email || '').trim().toLowerCase();
      const role = String(body.role || 'admin').trim();
      const ttlHours = Number(body.ttlHours || getAdminInviteTtlHours());
      const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });

      if (!existingUser) {
        return response({ error: 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.' }, 400);
      }

      const invite = await createAdminInvite({
        email,
        role,
        invitedByUserId: user.id,
        invitedByEmail: user.email,
        ttlHours,
      });

      const acceptUrl = `${getAdminInviteAppOrigin(request)}/auth/admin-invite?token=${encodeURIComponent(invite.token)}`;
      await writeAdminAuditLog(user, request, action, { email, role, ttlHours, inviteId: invite.record.id });
      return response({ success: true, invite: invite.record, token: invite.token, acceptUrl });
    }

    if (action === 'revoke_admin_invite') {
      if (!isSuperAdmin(user)) {
        return response({ error: 'Bu işlemi sadece super admin yapabilir.' }, 403);
      }

      const inviteId = String(body.inviteId || '').trim();
      const revoked = await revokeAdminInvite({ inviteId, revokedByUserId: user.id, revokedByEmail: user.email });
      await writeAdminAuditLog(user, request, action, { inviteId, revoked });
      return response({ success: revoked });
    }

    if (action === 'save_platform_payout_profile') {
      if (!isSuperAdmin(user)) {
        return response({ error: 'Bu işlemi sadece super admin yapabilir.' }, 403);
      }

      const profile = await setPlatformPayoutProfile({
        subMerchantType: body.subMerchantType as string,
        identityNumber: body.identityNumber as string,
        iban: body.iban as string,
        address: body.address as string,
        city: body.city as string,
        zipCode: body.zipCode as string,
        taxOffice: body.taxOffice as string,
        legalCompanyTitle: body.legalCompanyTitle as string,
        contactPhone: body.contactPhone as string,
        contactName: body.contactName as string,
        contactSurname: body.contactSurname as string,
        subMerchantKey: body.subMerchantKey as string,
        subMerchantExternalId: body.subMerchantExternalId as string,
        subMerchantStatus: body.subMerchantStatus as string,
        payoutReadyAt: body.payoutReadyAt as string,
        lastSyncAt: body.lastSyncAt as string,
        lastError: body.lastError as string,
        updatedBy: user.id,
      });

      await writeAdminAuditLog(user, request, action, { subMerchantType: profile.subMerchantType, subMerchantKey: Boolean(profile.subMerchantKey) });
      return response({ success: true, platformPayoutProfile: profile, platformPayoutReady: isPlatformPayoutReady(profile) });
    }

    return response({ error: 'Geçersiz işlem' }, 400);
  } catch (error: any) {
    return response({ error: 'İşlem tamamlanamadı', details: error.message }, 500);
  }
};