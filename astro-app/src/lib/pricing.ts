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

export type CoachSubscriptionPlan = {
  id: 'monthly' | 'yearly';
  label: string;
  months: number;
  price: number;
  description: string;
  recommended: boolean;
};

type CoachSubscriptionPlanDiscountEntry = {
  enabled: boolean;
  amount: number;
};

export type CoachSubscriptionPlanDiscounts = {
  monthly: CoachSubscriptionPlanDiscountEntry;
  yearly: CoachSubscriptionPlanDiscountEntry;
  updatedAt: string | null;
  updatedBy: string | null;
};

type CoachSubscriptionPlanPrices = {
  monthlyPrice: number;
  yearlyPrice: number;
  updatedAt: string | null;
  updatedBy: string | null;
};

type CoachSubscriptionPlanWriteInput = {
  monthlyPrice: number;
  yearlyPrice: number;
  updatedBy?: string | null;
};

type CoachSubscriptionPlanDiscountWriteInput = {
  monthlyEnabled: boolean;
  monthlyAmount: number;
  yearlyEnabled: boolean;
  yearlyAmount: number;
  updatedBy?: string | null;
};

const prismaClient = prisma as any;

const GLOBAL_COACH_SUBSCRIPTION_DISCOUNT_KEY = 'pricing.discount.global.coach_subscription';
const COACH_SUBSCRIPTION_PLAN_PRICES_KEY = 'pricing.coach_subscription.plan_prices';
const COACH_SUBSCRIPTION_PLAN_DISCOUNTS_KEY = 'pricing.discount.coach_subscription.plan_discounts';
const coachStudentPackageDiscountKey = (coachId: string) => `pricing.discount.coach.${coachId}.student_package`;

const DEFAULT_MONTHLY_COACH_SUBSCRIPTION_PRICE = 299;
const DEFAULT_YEARLY_COACH_SUBSCRIPTION_PRICE = 2990;

const EMPTY_DISCOUNT: DiscountConfig = {
  enabled: false,
  amount: 0,
  updatedAt: null,
  updatedBy: null,
};

const EMPTY_COACH_PLAN_PRICES: CoachSubscriptionPlanPrices = {
  monthlyPrice: DEFAULT_MONTHLY_COACH_SUBSCRIPTION_PRICE,
  yearlyPrice: DEFAULT_YEARLY_COACH_SUBSCRIPTION_PRICE,
  updatedAt: null,
  updatedBy: null,
};

const EMPTY_COACH_PLAN_DISCOUNTS: CoachSubscriptionPlanDiscounts = {
  monthly: {
    enabled: false,
    amount: 0,
  },
  yearly: {
    enabled: false,
    amount: 0,
  },
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

function sanitizePlanPrice(value: unknown, fallbackValue: number): number {
  const numeric = typeof value === 'number' ? value : Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(numeric)) {
    return fallbackValue;
  }

  return Math.max(1, Math.round(numeric));
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

function normalizeCoachSubscriptionPlanPrices(rawValue: unknown): CoachSubscriptionPlanPrices {
  if (!rawValue || typeof rawValue !== 'object') {
    return { ...EMPTY_COACH_PLAN_PRICES };
  }

  const value = rawValue as Record<string, unknown>;
  return {
    monthlyPrice: sanitizePlanPrice(value.monthlyPrice, DEFAULT_MONTHLY_COACH_SUBSCRIPTION_PRICE),
    yearlyPrice: sanitizePlanPrice(value.yearlyPrice, DEFAULT_YEARLY_COACH_SUBSCRIPTION_PRICE),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
    updatedBy: typeof value.updatedBy === 'string' ? value.updatedBy : null,
  };
}

function normalizeCoachSubscriptionPlanDiscounts(rawValue: unknown): CoachSubscriptionPlanDiscounts {
  if (!rawValue || typeof rawValue !== 'object') {
    return { ...EMPTY_COACH_PLAN_DISCOUNTS };
  }

  const value = rawValue as Record<string, unknown>;

  const monthlyRaw =
    value.monthly && typeof value.monthly === 'object'
      ? (value.monthly as Record<string, unknown>)
      : {};

  const yearlyRaw =
    value.yearly && typeof value.yearly === 'object'
      ? (value.yearly as Record<string, unknown>)
      : {};

  return {
    monthly: {
      enabled: Boolean(monthlyRaw.enabled),
      amount: sanitizeDiscountAmount(monthlyRaw.amount),
    },
    yearly: {
      enabled: Boolean(yearlyRaw.enabled),
      amount: sanitizeDiscountAmount(yearlyRaw.amount),
    },
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : null,
    updatedBy: typeof value.updatedBy === 'string' ? value.updatedBy : null,
  };
}

function getCoachPlanDiscountEntry(
  planId: string | null | undefined,
  planDiscounts: CoachSubscriptionPlanDiscounts,
): CoachSubscriptionPlanDiscountEntry {
  const normalizedPlanId = String(planId || '').trim().toLowerCase();

  if (normalizedPlanId === 'yearly') {
    return planDiscounts.yearly;
  }

  return planDiscounts.monthly;
}

function toCoachSubscriptionPlans(prices: CoachSubscriptionPlanPrices): CoachSubscriptionPlan[] {
  return [
    {
      id: 'monthly',
      label: 'Aylik Plan',
      months: 1,
      price: prices.monthlyPrice,
      description: 'Aylik yenilenen esnek egitmen plani',
      recommended: false,
    },
    {
      id: 'yearly',
      label: 'Yillik Plan',
      months: 12,
      price: prices.yearlyPrice,
      description: '12 ay erisim saglayan yillik egitmen plani',
      recommended: true,
    },
  ];
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

export async function getCoachSubscriptionPlans(): Promise<CoachSubscriptionPlan[]> {
  try {
    const setting = await prismaClient.systemSetting.findUnique({
      where: { key: COACH_SUBSCRIPTION_PLAN_PRICES_KEY },
      select: { value: true },
    });

    const prices = setting
      ? normalizeCoachSubscriptionPlanPrices(setting.value)
      : { ...EMPTY_COACH_PLAN_PRICES };

    return toCoachSubscriptionPlans(prices);
  } catch (error) {
    console.error('Coach subscription planlari okunamadi:', error);
    return toCoachSubscriptionPlans({ ...EMPTY_COACH_PLAN_PRICES });
  }
}

export async function getCoachSubscriptionPlan(planId?: string | null): Promise<CoachSubscriptionPlan> {
  const normalizedPlanId = String(planId || '').trim().toLowerCase();
  const plans = await getCoachSubscriptionPlans();

  return (
    plans.find((plan) => plan.id === normalizedPlanId) ||
    plans.find((plan) => plan.recommended) ||
    plans[0]
  );
}

export async function setCoachSubscriptionPlanPrices(input: CoachSubscriptionPlanWriteInput): Promise<void> {
  const payload: CoachSubscriptionPlanPrices = {
    monthlyPrice: sanitizePlanPrice(input.monthlyPrice, DEFAULT_MONTHLY_COACH_SUBSCRIPTION_PRICE),
    yearlyPrice: sanitizePlanPrice(input.yearlyPrice, DEFAULT_YEARLY_COACH_SUBSCRIPTION_PRICE),
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy || null,
  };

  await prismaClient.systemSetting.upsert({
    where: { key: COACH_SUBSCRIPTION_PLAN_PRICES_KEY },
    create: {
      key: COACH_SUBSCRIPTION_PLAN_PRICES_KEY,
      value: payload,
    },
    update: {
      value: payload,
    },
  });
}

export async function getCoachSubscriptionPlanDiscounts(): Promise<CoachSubscriptionPlanDiscounts> {
  try {
    const setting = await prismaClient.systemSetting.findUnique({
      where: { key: COACH_SUBSCRIPTION_PLAN_DISCOUNTS_KEY },
      select: { value: true },
    });

    if (!setting) {
      return { ...EMPTY_COACH_PLAN_DISCOUNTS };
    }

    return normalizeCoachSubscriptionPlanDiscounts(setting.value);
  } catch (error) {
    console.error('Coach subscription plan indirimleri okunamadi:', error);
    return { ...EMPTY_COACH_PLAN_DISCOUNTS };
  }
}

export async function setCoachSubscriptionPlanDiscounts(
  input: CoachSubscriptionPlanDiscountWriteInput,
): Promise<void> {
  const payload: CoachSubscriptionPlanDiscounts = {
    monthly: {
      enabled: Boolean(input.monthlyEnabled),
      amount: sanitizeDiscountAmount(input.monthlyAmount),
    },
    yearly: {
      enabled: Boolean(input.yearlyEnabled),
      amount: sanitizeDiscountAmount(input.yearlyAmount),
    },
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy || null,
  };

  await prismaClient.systemSetting.upsert({
    where: { key: COACH_SUBSCRIPTION_PLAN_DISCOUNTS_KEY },
    create: {
      key: COACH_SUBSCRIPTION_PLAN_DISCOUNTS_KEY,
      value: payload,
    },
    update: {
      value: payload,
    },
  });
}

export function resolveCoachSubscriptionDiscountAmount(params: {
  planId?: string | null;
  planDiscounts?: CoachSubscriptionPlanDiscounts | null;
  globalDiscount?: DiscountConfig | null;
}): number {
  const planDiscounts = params.planDiscounts || EMPTY_COACH_PLAN_DISCOUNTS;
  const planEntry = getCoachPlanDiscountEntry(params.planId, planDiscounts);

  if (planEntry.enabled && planEntry.amount > 0) {
    return planEntry.amount;
  }

  if (params.globalDiscount?.enabled && params.globalDiscount.amount > 0) {
    return params.globalDiscount.amount;
  }

  return 0;
}

export function calculateDiscountedAmount(baseAmount: number, requestedDiscountPercentage: number): {
  baseAmount: number;
  discountAmount: number;
  finalAmount: number;
} {
  const normalizedBaseAmount = Math.max(1, Math.round(baseAmount));
  const percentage = Math.min(100, Math.max(0, requestedDiscountPercentage));

  if (percentage <= 0) {
    return {
      baseAmount: normalizedBaseAmount,
      discountAmount: 0,
      finalAmount: normalizedBaseAmount,
    };
  }

  const discountAmount = Math.round((normalizedBaseAmount * percentage) / 100);
  const finalAmount = Math.max(1, normalizedBaseAmount - discountAmount);

  return {
    baseAmount: normalizedBaseAmount,
    discountAmount: discountAmount,
    finalAmount: finalAmount,
  };
}
