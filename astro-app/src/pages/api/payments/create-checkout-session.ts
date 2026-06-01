import type { APIRoute } from 'astro';
import { createHmac } from 'crypto';
import prisma from '../../../lib/prisma';
import { getPaymentAccessToken, getUserFromRequest, syncMembershipAccessState, verifyPaymentAccessToken } from '../../../lib/auth';
import { initializeCheckoutForm } from '../../../lib/iyzico';
import { getPlatformSubMerchantKey } from '../../../lib/payment-settings';
import {
  calculateDiscountedAmount,
  getCoachSubscriptionPlan,
  getCoachSubscriptionPlanDiscounts,
  getCoachStudentPackageDiscount,
  getGlobalCoachSubscriptionDiscount,
  resolveCoachSubscriptionDiscountAmount,
} from '../../../lib/pricing';

const prismaClient = prisma as any;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;
const SAFE_PLAN_ID_PATTERN = /^[a-z0-9_-]{2,32}$/i;
const ACTIVE_SUB_MERCHANT_STATUSES = new Set(['active', 'approved', 'success']);

function asPrice(value: number): string {
  return value.toFixed(2);
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return '127.0.0.1';
}

function splitFullName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || 'CoachPro';
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'User';

  return { firstName, lastName };
}

function normalizePhone(phone?: string | null): string {
  if (!phone) {
    return '+905000000000';
  }

  const digits = phone.replace(/\D/g, '');
  if (!digits) {
    return '+905000000000';
  }

  if (digits.startsWith('90')) {
    return `+${digits}`;
  }

  if (digits.startsWith('0')) {
    return `+9${digits}`;
  }

  return `+90${digits}`;
}

function getBuyerIdentityNumber(): string {
  const rawValue = String(import.meta.env.IYZICO_DEFAULT_IDENTITY_NUMBER || '').replace(/\D/g, '');
  return rawValue.length === 11 ? rawValue : '11111111111';
}

function getAppOrigin(request: Request): string {
  const envOrigin = String(import.meta.env.PUBLIC_APP_URL || '').trim();
  if (envOrigin && /^https?:\/\//.test(envOrigin)) {
    return envOrigin.replace(/\/+$/, '');
  }

  if (import.meta.env.PROD) {
    throw new Error('PUBLIC_APP_URL must be configured in production');
  }

  const requestUrl = new URL(request.url);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

function getWebhookSigningSecret(): string {
  return String(
    import.meta.env.IYZICO_WEBHOOK_SECRET ||
      import.meta.env.PAYMENT_LINK_SECRET ||
      import.meta.env.IYZICO_SECRET_KEY ||
      '',
  ).trim();
}

function createWebhookSignature(transactionId: string, userId: string, secret: string): string {
  return createHmac('sha256', secret).update(`${transactionId}:${userId}`).digest('hex');
}

function requiresMarketplaceSubMerchant(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('marketplace') && normalized.includes('submerchantkey');
}

function isActiveSubMerchantStatus(value: unknown): boolean {
  const normalized = String(value || '').trim().toLowerCase();
  return ACTIVE_SUB_MERCHANT_STATUSES.has(normalized);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json().catch(() => null) as {
      userId?: string;
      paymentToken?: string;
      packageId?: string;
      subscriptionPlanId?: string;
      retryOfTransactionId?: string;
    } | null;

    const userId = (payload?.userId || '').trim();
    const requestPaymentToken = (payload?.paymentToken || '').trim();
    const paymentToken = (getPaymentAccessToken(request.headers.get('cookie')) || '').trim();
    const packageId = (payload?.packageId || '').trim();
    const subscriptionPlanId = (payload?.subscriptionPlanId || '').trim().toLowerCase();
    const retryOfTransactionId = (payload?.retryOfTransactionId || '').trim();

    if (requestPaymentToken) {
      return new Response(JSON.stringify({ error: 'Odeme tokeni sadece cookie uzerinden gonderilebilir.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Kullanici bulunamadi.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!SAFE_ID_PATTERN.test(userId)) {
      return new Response(JSON.stringify({ error: 'Kullanici kimligi gecersiz.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (packageId && !SAFE_ID_PATTERN.test(packageId)) {
      return new Response(JSON.stringify({ error: 'Paket kimligi gecersiz.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (retryOfTransactionId && !SAFE_ID_PATTERN.test(retryOfTransactionId)) {
      return new Response(JSON.stringify({ error: 'Tekrar odeme kimligi gecersiz.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (subscriptionPlanId && !SAFE_PLAN_ID_PATTERN.test(subscriptionPlanId)) {
      return new Response(JSON.stringify({ error: 'Abonelik plani gecersiz.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!paymentToken || !verifyPaymentAccessToken(paymentToken, userId)) {
      return new Response(JSON.stringify({ error: 'Odeme oturumu gecersiz.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const authUser = await getUserFromRequest(request);
    if (authUser && authUser.id !== userId) {
      return new Response(JSON.stringify({ error: 'Yetkisiz istek.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        coach: true,
      },
    });

    if (!dbUser) {
      return new Response(JSON.stringify({ error: 'Kullanici bulunamadi.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await syncMembershipAccessState(dbUser);

    const isCoachFlow = user.role === 'coach' && user.subscriptionStatus === 'pending';
    const isStudentFlow = user.role === 'student' && user.studentPaymentStatus !== 'paid';
    const linkedCoach = user.coach as any;

    if (!isCoachFlow && !isStudentFlow) {
      return new Response(JSON.stringify({ error: 'Odeme adimi gecerli degil.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const appOrigin = getAppOrigin(request);
    const platformSubMerchantKey = await getPlatformSubMerchantKey();

    let amount = 0;
    let transactionType = '';
    let coachSubscriptionPlan: {
      id: string;
      label: string;
      months: number;
      price: number;
    } | null = null;
    let packageRecord: { id: string; name: string; durationWeeks: number; coachId: string; price: number } | null = null;
    let description = '';
    let retryOfTransaction: {
      id: string;
      status: string;
      type: string;
      packageId: string | null;
      metadata: unknown;
    } | null = null;
    let retryAttempt = 0;
    let pricingSnapshot: Record<string, unknown> = {
      source: 'none',
      baseAmount: 0,
      discountAmount: 0,
      finalAmount: 0,
    };

    if (isCoachFlow) {
      coachSubscriptionPlan = await getCoachSubscriptionPlan(subscriptionPlanId || 'monthly');

      const [globalCoachDiscount, coachPlanDiscounts] = await Promise.all([
        getGlobalCoachSubscriptionDiscount(),
        getCoachSubscriptionPlanDiscounts(),
      ]);
      const coachDiscountAmount = resolveCoachSubscriptionDiscountAmount({
        planId: coachSubscriptionPlan.id,
        planDiscounts: coachPlanDiscounts,
        globalDiscount: globalCoachDiscount,
      });

      const pricing = calculateDiscountedAmount(
        coachSubscriptionPlan.price,
        coachDiscountAmount,
      );

      amount = pricing.finalAmount;
      transactionType = 'coach_subscription';
      description = `${coachSubscriptionPlan.label} koç abonelik odemesi`;
      pricingSnapshot = {
        source: 'coach_subscription_plan_discount',
        planId: coachSubscriptionPlan.id,
        planLabel: coachSubscriptionPlan.label,
        billingPeriodMonths: coachSubscriptionPlan.months,
        appliedDiscountAmount: coachDiscountAmount,
        globalFallbackDiscountEnabled: Boolean(globalCoachDiscount.enabled),
        globalFallbackDiscountAmount: globalCoachDiscount.amount,
        planDiscountsSnapshot: {
          monthly: coachPlanDiscounts.monthly,
          yearly: coachPlanDiscounts.yearly,
        },
        baseAmount: pricing.baseAmount,
        discountAmount: pricing.discountAmount,
        finalAmount: pricing.finalAmount,
      };
    } else {
      if (!user.coachId) {
        return new Response(JSON.stringify({ error: 'Egitmen baglantisi bulunamadi.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (!packageId) {
        return new Response(JSON.stringify({ error: 'Lutfen bir paket secin.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      packageRecord = await prisma.coachPackage.findFirst({
        where: {
          id: packageId,
          coachId: user.coachId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          durationWeeks: true,
          coachId: true,
          price: true,
        },
      });

      if (!packageRecord) {
        return new Response(JSON.stringify({ error: 'Secilen paket gecersiz.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const coachPackageDiscount = await getCoachStudentPackageDiscount(user.coachId);
      const pricing = calculateDiscountedAmount(
        packageRecord.price,
        coachPackageDiscount.enabled ? coachPackageDiscount.amount : 0,
      );

      amount = pricing.finalAmount;
      transactionType = 'student_package';
      description = `${packageRecord.name} paket odemesi`;
      pricingSnapshot = {
        source: 'coach_student_package_discount',
        baseAmount: pricing.baseAmount,
        discountAmount: pricing.discountAmount,
        finalAmount: pricing.finalAmount,
      };

      if (amount <= 0) {
        return new Response(JSON.stringify({ error: 'Paket ucreti gecersiz.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const coachSubMerchantKey = String(linkedCoach?.iyzicoSubMerchantKey || '').trim();
      const coachSubMerchantStatus = String(linkedCoach?.iyzicoSubMerchantStatus || '').trim();
      const coachPayoutReady = Boolean(
        linkedCoach?.iyzicoPayoutReadyAt &&
        coachSubMerchantKey &&
        isActiveSubMerchantStatus(coachSubMerchantStatus),
      );

      if (!coachPayoutReady) {
        return new Response(JSON.stringify({
          error: 'Bu egitmenin odeme hesabi aktif degil. Lutfen egitmen onboarding durumunu kontrol edin.',
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (retryOfTransactionId) {
      retryOfTransaction = await prismaClient.paymentTransaction.findFirst({
        where: {
          id: retryOfTransactionId,
          payerId: user.id,
        },
        select: {
          id: true,
          status: true,
          type: true,
          packageId: true,
          metadata: true,
        },
      });

      if (!retryOfTransaction) {
        return new Response(JSON.stringify({ error: 'Tekrar denenecek odeme kaydi bulunamadi.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (retryOfTransaction.status === 'paid') {
        return new Response(JSON.stringify({ error: 'Bu odeme zaten basarili.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (retryOfTransaction.type !== transactionType) {
        return new Response(JSON.stringify({ error: 'Tekrar deneme odeme tipi gecersiz.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (transactionType === 'student_package' && retryOfTransaction.packageId && retryOfTransaction.packageId !== (packageRecord?.id || null)) {
        return new Response(JSON.stringify({ error: 'Tekrar deneme secilen paket ile uyusmuyor.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const previousAttempt =
        typeof retryOfTransaction.metadata === 'object' &&
        retryOfTransaction.metadata &&
        typeof (retryOfTransaction.metadata as any).retryAttempt === 'number'
          ? Number((retryOfTransaction.metadata as any).retryAttempt)
          : 0;

      retryAttempt = previousAttempt + 1;
      description = `${description} (Tekrar deneme #${retryAttempt})`;
    }

    const transactionMetadata: Record<string, unknown> = {
      role: user.role,
      email: user.email,
      pricing: pricingSnapshot,
    };

    if (coachSubscriptionPlan) {
      transactionMetadata.subscriptionPlanId = coachSubscriptionPlan.id;
      transactionMetadata.subscriptionPlanLabel = coachSubscriptionPlan.label;
      transactionMetadata.subscriptionPlanMonths = coachSubscriptionPlan.months;
    }

    if (retryOfTransaction) {
      transactionMetadata.retryOfTransactionId = retryOfTransaction.id;
      transactionMetadata.retryAttempt = retryAttempt;
    }

    const transaction = await prismaClient.paymentTransaction.create({
      data: {
        payerId: user.id,
        coachId: isCoachFlow ? user.id : (user.coachId || null),
        studentId: isStudentFlow ? user.id : null,
        packageId: packageRecord?.id || null,
        type: transactionType,
        provider: 'iyzico',
        status: 'pending',
        amount,
        currency: 'try',
        description,
        metadata: transactionMetadata,
      },
    });

    if (retryOfTransaction) {
      await prismaClient.paymentTransaction.update({
        where: { id: retryOfTransaction.id },
        data: {
          metadata: {
            ...(typeof retryOfTransaction.metadata === 'object' && retryOfTransaction.metadata ? retryOfTransaction.metadata as object : {}),
            retriedAt: new Date().toISOString(),
            lastRetryTransactionId: transaction.id,
          },
        },
      });
    }

    await prismaClient.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        externalPaymentId: transaction.id,
      },
    });

    const lineItemName = isCoachFlow
      ? `CoachPro ${coachSubscriptionPlan?.label || 'Aylik Plan'} Abonelik`
      : `${packageRecord?.name || 'Koc Paketi'} (${packageRecord?.durationWeeks || 4} hafta)`;

    const amountPrice = asPrice(amount);
    const { firstName, lastName } = splitFullName(user.name);
    const callbackUrlObject = new URL('/api/payments/webhook', appOrigin);
    callbackUrlObject.searchParams.set('transactionId', transaction.id);
    callbackUrlObject.searchParams.set('userId', user.id);

    const webhookSigningSecret = getWebhookSigningSecret();
    if (webhookSigningSecret) {
      callbackUrlObject.searchParams.set('sig', createWebhookSignature(transaction.id, user.id, webhookSigningSecret));
    }

    const callbackUrl = callbackUrlObject.toString();

    const buildBasketItem = (
      useStudentMarketplaceRouting: boolean,
      useCoachMarketplaceRouting: boolean,
    ): Record<string, unknown> => {
      const basketItem: Record<string, unknown> = {
        id: packageRecord?.id || 'coach-subscription',
        name: lineItemName,
        category1: isCoachFlow ? 'Subscription' : 'Package',
        itemType: 'VIRTUAL',
        price: amountPrice,
      };

      if (isStudentFlow && useStudentMarketplaceRouting) {
        basketItem.subMerchantKey = String(linkedCoach?.iyzicoSubMerchantKey || '');
        basketItem.subMerchantPrice = amountPrice;
      }

      if (isCoachFlow && useCoachMarketplaceRouting) {
        basketItem.subMerchantKey = platformSubMerchantKey;
        basketItem.subMerchantPrice = amountPrice;
      }

      return basketItem;
    };

    let useCoachMarketplaceRouting = isCoachFlow && Boolean(platformSubMerchantKey);

    if (isStudentFlow) {
      transactionMetadata.payoutModel = 'marketplace';
      transactionMetadata.payoutTarget = String(linkedCoach?.iyzicoSubMerchantKey || '');
      transactionMetadata.platformCommission = 0;
    } else {
      transactionMetadata.payoutModel = useCoachMarketplaceRouting ? 'marketplace_platform' : 'platform';
      if (useCoachMarketplaceRouting) {
        transactionMetadata.payoutTarget = platformSubMerchantKey;
      }
      transactionMetadata.platformCommission = 100;
    }

    const checkoutRequestBase = {
      locale: 'tr',
      conversationId: transaction.id,
      price: amountPrice,
      paidPrice: amountPrice,
      currency: 'TRY',
      basketId: transaction.id,
      paymentGroup: 'PRODUCT',
      callbackUrl,
      enabledInstallments: [1],
      buyer: {
        id: user.id,
        name: firstName,
        surname: lastName,
        gsmNumber: normalizePhone(user.phone),
        email: user.email,
        identityNumber: getBuyerIdentityNumber(),
        registrationAddress: 'CoachPro',
        ip: getClientIp(request),
        city: 'Istanbul',
        country: 'Turkey',
        zipCode: '34000',
      },
      shippingAddress: {
        contactName: `${firstName} ${lastName}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'CoachPro',
        zipCode: '34000',
      },
      billingAddress: {
        contactName: `${firstName} ${lastName}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'CoachPro',
        zipCode: '34000',
      },
    };

    let useStudentMarketplaceRouting = isStudentFlow;
    let checkoutInit = await initializeCheckoutForm({
      ...checkoutRequestBase,
      basketItems: [buildBasketItem(useStudentMarketplaceRouting, useCoachMarketplaceRouting)],
    });

    let checkoutStatus = String(checkoutInit.status || '').toLowerCase();
    let paymentPageUrl = String(checkoutInit.paymentPageUrl || '');
    let checkoutToken = String(checkoutInit.token || '');
    let checkoutErrorMessage = String(checkoutInit.errorMessage || 'Iyzico odeme sayfasi olusturulamadi.');

    if ((checkoutStatus !== 'success' || !paymentPageUrl) && isCoachFlow && !useCoachMarketplaceRouting) {
      const marketplaceRequiresSubMerchant = requiresMarketplaceSubMerchant(checkoutErrorMessage);

      if (marketplaceRequiresSubMerchant && platformSubMerchantKey) {
        useCoachMarketplaceRouting = true;
        transactionMetadata.payoutModel = 'marketplace_platform';
        transactionMetadata.payoutTarget = platformSubMerchantKey;

        checkoutInit = await initializeCheckoutForm({
          ...checkoutRequestBase,
          basketItems: [buildBasketItem(useStudentMarketplaceRouting, useCoachMarketplaceRouting)],
        });

        checkoutStatus = String(checkoutInit.status || '').toLowerCase();
        paymentPageUrl = String(checkoutInit.paymentPageUrl || '');
        checkoutToken = String(checkoutInit.token || '');
        checkoutErrorMessage = String(checkoutInit.errorMessage || 'Iyzico odeme sayfasi olusturulamadi.');
      } else if (marketplaceRequiresSubMerchant && !platformSubMerchantKey) {
        checkoutErrorMessage = 'Marketplace hesabi icin koc abonelik odemelerinde IYZICO_PLATFORM_SUBMERCHANT_KEY tanimlanmalidir.';
      }
    }

    if (checkoutStatus !== 'success' || !paymentPageUrl) {
      await prismaClient.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'failed',
          failedAt: new Date(),
          metadata: {
            ...transactionMetadata,
            checkoutStatus,
            checkoutError: checkoutErrorMessage,
            failureReason: checkoutErrorMessage,
          },
        },
      });

      return new Response(JSON.stringify({ error: checkoutErrorMessage }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await prismaClient.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        metadata: {
          ...transactionMetadata,
          checkoutToken,
          callbackUrl,
            marketplaceRoutingEnabled: useStudentMarketplaceRouting || useCoachMarketplaceRouting,
        },
      },
    });

    return new Response(JSON.stringify({
      url: paymentPageUrl,
      sessionId: transaction.id,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Checkout session olusturulamadi:', error);

    return new Response(JSON.stringify({ error: 'Odeme baslatilamadi.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
