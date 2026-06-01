import prisma from './prisma';

const prismaClient = prisma as any;

const PLATFORM_PAYOUT_PROFILE_KEY = 'payments.iyzico.platform_payout_profile';
const ACTIVE_SUB_MERCHANT_STATUSES = new Set(['active', 'approved', 'success']);

export type PlatformPayoutProfile = {
  subMerchantType: 'PERSONAL' | 'PRIVATE_COMPANY';
  identityNumber: string | null;
  iban: string | null;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  taxOffice: string | null;
  legalCompanyTitle: string | null;
  contactPhone: string | null;
  contactName: string | null;
  contactSurname: string | null;
  subMerchantKey: string | null;
  subMerchantExternalId: string | null;
  subMerchantStatus: string | null;
  payoutReadyAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type PlatformPayoutProfileWriteInput = {
  subMerchantType?: 'PERSONAL' | 'PRIVATE_COMPANY' | string | null;
  identityNumber?: string | null;
  iban?: string | null;
  address?: string | null;
  city?: string | null;
  zipCode?: string | null;
  taxOffice?: string | null;
  legalCompanyTitle?: string | null;
  contactPhone?: string | null;
  contactName?: string | null;
  contactSurname?: string | null;
  subMerchantKey?: string | null;
  subMerchantExternalId?: string | null;
  subMerchantStatus?: string | null;
  payoutReadyAt?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
  updatedBy?: string | null;
};

const EMPTY_PLATFORM_PAYOUT_PROFILE: PlatformPayoutProfile = {
  subMerchantType: 'PERSONAL',
  identityNumber: null,
  iban: null,
  address: null,
  city: null,
  zipCode: null,
  taxOffice: null,
  legalCompanyTitle: null,
  contactPhone: null,
  contactName: null,
  contactSurname: null,
  subMerchantKey: null,
  subMerchantExternalId: null,
  subMerchantStatus: null,
  payoutReadyAt: null,
  lastSyncAt: null,
  lastError: null,
  updatedAt: null,
  updatedBy: null,
};

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeSubMerchantType(value: unknown): 'PERSONAL' | 'PRIVATE_COMPANY' {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized === 'PRIVATE_COMPANY' ? 'PRIVATE_COMPANY' : 'PERSONAL';
}

function normalizePlatformPayoutProfile(rawValue: unknown): PlatformPayoutProfile {
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    return { ...EMPTY_PLATFORM_PAYOUT_PROFILE };
  }

  const value = rawValue as Record<string, unknown>;

  return {
    subMerchantType: normalizeSubMerchantType(value.subMerchantType),
    identityNumber: normalizeOptionalString(value.identityNumber),
    iban: normalizeOptionalString(value.iban),
    address: normalizeOptionalString(value.address),
    city: normalizeOptionalString(value.city),
    zipCode: normalizeOptionalString(value.zipCode),
    taxOffice: normalizeOptionalString(value.taxOffice),
    legalCompanyTitle: normalizeOptionalString(value.legalCompanyTitle),
    contactPhone: normalizeOptionalString(value.contactPhone),
    contactName: normalizeOptionalString(value.contactName),
    contactSurname: normalizeOptionalString(value.contactSurname),
    subMerchantKey: normalizeOptionalString(value.subMerchantKey),
    subMerchantExternalId: normalizeOptionalString(value.subMerchantExternalId),
    subMerchantStatus: normalizeOptionalString(value.subMerchantStatus),
    payoutReadyAt: normalizeOptionalString(value.payoutReadyAt),
    lastSyncAt: normalizeOptionalString(value.lastSyncAt),
    lastError: normalizeOptionalString(value.lastError),
    updatedAt: normalizeOptionalString(value.updatedAt),
    updatedBy: normalizeOptionalString(value.updatedBy),
  };
}

export function isPlatformSubMerchantStatusActive(value: string | null | undefined): boolean {
  const normalized = String(value || '').trim().toLowerCase();
  return ACTIVE_SUB_MERCHANT_STATUSES.has(normalized);
}

export function isPlatformPayoutReady(profile: PlatformPayoutProfile): boolean {
  const hasSubMerchantKey = Boolean(profile.subMerchantKey && profile.subMerchantKey.trim());
  if (!hasSubMerchantKey) {
    return false;
  }

  if (profile.payoutReadyAt) {
    return true;
  }

  return isPlatformSubMerchantStatusActive(profile.subMerchantStatus);
}

export async function getPlatformPayoutProfile(): Promise<PlatformPayoutProfile> {
  try {
    const setting = await prismaClient.systemSetting.findUnique({
      where: { key: PLATFORM_PAYOUT_PROFILE_KEY },
      select: { value: true },
    });

    if (!setting) {
      return { ...EMPTY_PLATFORM_PAYOUT_PROFILE };
    }

    return normalizePlatformPayoutProfile(setting.value);
  } catch (error) {
    console.error('Platform payout profile okunamadi:', error);
    return { ...EMPTY_PLATFORM_PAYOUT_PROFILE };
  }
}

export async function setPlatformPayoutProfile(
  input: PlatformPayoutProfileWriteInput,
): Promise<PlatformPayoutProfile> {
  const current = await getPlatformPayoutProfile();

  const payload: PlatformPayoutProfile = {
    ...current,
    subMerchantType: normalizeSubMerchantType(input.subMerchantType ?? current.subMerchantType),
    identityNumber:
      input.identityNumber === undefined ? current.identityNumber : normalizeOptionalString(input.identityNumber),
    iban: input.iban === undefined ? current.iban : normalizeOptionalString(input.iban),
    address: input.address === undefined ? current.address : normalizeOptionalString(input.address),
    city: input.city === undefined ? current.city : normalizeOptionalString(input.city),
    zipCode: input.zipCode === undefined ? current.zipCode : normalizeOptionalString(input.zipCode),
    taxOffice: input.taxOffice === undefined ? current.taxOffice : normalizeOptionalString(input.taxOffice),
    legalCompanyTitle:
      input.legalCompanyTitle === undefined
        ? current.legalCompanyTitle
        : normalizeOptionalString(input.legalCompanyTitle),
    contactPhone:
      input.contactPhone === undefined ? current.contactPhone : normalizeOptionalString(input.contactPhone),
    contactName: input.contactName === undefined ? current.contactName : normalizeOptionalString(input.contactName),
    contactSurname:
      input.contactSurname === undefined ? current.contactSurname : normalizeOptionalString(input.contactSurname),
    subMerchantKey:
      input.subMerchantKey === undefined ? current.subMerchantKey : normalizeOptionalString(input.subMerchantKey),
    subMerchantExternalId:
      input.subMerchantExternalId === undefined
        ? current.subMerchantExternalId
        : normalizeOptionalString(input.subMerchantExternalId),
    subMerchantStatus:
      input.subMerchantStatus === undefined
        ? current.subMerchantStatus
        : normalizeOptionalString(input.subMerchantStatus),
    payoutReadyAt:
      input.payoutReadyAt === undefined ? current.payoutReadyAt : normalizeOptionalString(input.payoutReadyAt),
    lastSyncAt: input.lastSyncAt === undefined ? current.lastSyncAt : normalizeOptionalString(input.lastSyncAt),
    lastError: input.lastError === undefined ? current.lastError : normalizeOptionalString(input.lastError),
    updatedAt: new Date().toISOString(),
    updatedBy:
      input.updatedBy === undefined ? current.updatedBy : normalizeOptionalString(input.updatedBy),
  };

  await prismaClient.systemSetting.upsert({
    where: { key: PLATFORM_PAYOUT_PROFILE_KEY },
    create: {
      key: PLATFORM_PAYOUT_PROFILE_KEY,
      value: payload,
    },
    update: {
      value: payload,
    },
  });

  return payload;
}

export async function getPlatformSubMerchantKey(): Promise<string> {
  const profile = await getPlatformPayoutProfile();

  const profileSubMerchantKey = String(profile.subMerchantKey || '').trim();
  if (profileSubMerchantKey) {
    return profileSubMerchantKey;
  }

  return String(import.meta.env.IYZICO_PLATFORM_SUBMERCHANT_KEY || '').trim();
}
