import prisma from './prisma';

type DiscountConfig = {
  enabled: boolean;
  amount: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

type DiscountWriteInput = {
  enabled: boolean;
  amount: number;
  updatedBy?: string | null;
};

const prismaClient = prisma as any;

const GLOBAL_COACH_SUBSCRIPTION_DISCOUNT_KEY = 'pricing.discount.global.coach_subscription';
const coachStudentPackageDiscountKey = (coachId: string) => `pricing.discount.coach.${coachId}.student_package`;

const EMPTY_DISCOUNT: DiscountConfig = {
  enabled: false,
  amount: 0,
  updatedAt: null,
  updatedBy: null,
};

function sanitizeDiscountAmount(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number.parseInt(String(value || '0'), 10);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.round(numeric));
}

function normalizeDiscount(rawValue: unknown): DiscountConfig {
  if (!rawValue || typeof rawValue !== 'object') {
    return { ...EMPTY_DISCOUNT };
  }

  const value = rawValue as Record<string, unknown>;
  return {
    enabled: Boolean(value.enabled),
    amount: sanitizeDiscountAmount(value.amount),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
    updatedBy: typeof value.updatedBy === 'string' ? value.updatedBy : null,
  };
}

async function getDiscountFromSetting(key: string): Promise<DiscountConfig> {
  try {
    const setting = await prismaClient.systemSetting.findUnique({
      where: { key },
      select: { value: true },
    });

    if (!setting) {
      return { ...EMPTY_DISCOUNT };
    }

    return normalizeDiscount(setting.value);
  } catch (error) {
    console.error('Sistem indirimi okunamadi:', error);
    return { ...EMPTY_DISCOUNT };
  }
}

async function setDiscountSetting(key: string, input: DiscountWriteInput): Promise<void> {
  const normalized: DiscountConfig = {
    enabled: Boolean(input.enabled),
    amount: sanitizeDiscountAmount(input.amount),
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy || null,
  };

  await prismaClient.systemSetting.upsert({
    where: { key },
    create: {
      key,
      value: normalized,
    },
    update: {
      value: normalized,
    },
  });
}

export async function getGlobalCoachSubscriptionDiscount(): Promise<DiscountConfig> {
  return getDiscountFromSetting(GLOBAL_COACH_SUBSCRIPTION_DISCOUNT_KEY);
}

export async function setGlobalCoachSubscriptionDiscount(input: DiscountWriteInput): Promise<void> {
  await setDiscountSetting(GLOBAL_COACH_SUBSCRIPTION_DISCOUNT_KEY, input);
}

export async function getCoachStudentPackageDiscount(coachId?: string | null): Promise<DiscountConfig> {
  if (!coachId) {
    return { ...EMPTY_DISCOUNT };
  }

  return getDiscountFromSetting(coachStudentPackageDiscountKey(coachId));
}

export async function setCoachStudentPackageDiscount(coachId: string, input: DiscountWriteInput): Promise<void> {
  await setDiscountSetting(coachStudentPackageDiscountKey(coachId), input);
}

export function calculateDiscountedAmount(baseAmount: number, requestedDiscountAmount: number): {
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
} {
  const normalizedBaseAmount = Math.max(1, Math.round(baseAmount));
  const normalizedDiscountAmount = sanitizeDiscountAmount(requestedDiscountAmount);

  if (normalizedDiscountAmount <= 0) {
    return {
      baseAmount: normalizedBaseAmount,
      discountAmount: 0,
      finalAmount: normalizedBaseAmount,
    };
  }

  const maxDiscountAmount = Math.max(0, normalizedBaseAmount - 1);
  const appliedDiscountAmount = Math.min(normalizedDiscountAmount, maxDiscountAmount);

  return {
    baseAmount: normalizedBaseAmount,
    discountAmount: appliedDiscountAmount,
    finalAmount: normalizedBaseAmount - appliedDiscountAmount,
  };
}
