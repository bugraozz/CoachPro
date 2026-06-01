import { createSubMerchant, retrieveSubMerchant, updateSubMerchant } from './iyzico';

export type CoachPayoutSyncInput = {
  coachId: string;
  email: string;
  phone?: string | null;
  fullName: string;
  subMerchantType: 'PERSONAL' | 'PRIVATE_COMPANY';
  identityNumber: string;
  iban: string;
  address: string;
  city: string;
  zipCode: string;
  taxOffice?: string | null;
  legalCompanyTitle?: string | null;
  existingSubMerchantKey?: string | null;
  existingExternalId?: string | null;
};

export type CoachPayoutSyncResult = {
  ok: boolean;
  error?: string;
  subMerchantKey?: string;
  subMerchantExternalId?: string;
  subMerchantStatus?: string;
};

function splitFullName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || 'Coach';
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'User';
  return { firstName, lastName };
}

export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

export function normalizeIdentityNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizePhone(value?: string | null): string {
  if (!value) {
    return '+905000000000';
  }

  const digits = value.replace(/\D/g, '');
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

export function validateCoachPayoutInput(input: {
  subMerchantType: string;
  identityNumber: string;
  iban: string;
  address: string;
  city: string;
  zipCode: string;
  taxOffice?: string | null;
  legalCompanyTitle?: string | null;
}): string | null {
  if (input.subMerchantType !== 'PERSONAL' && input.subMerchantType !== 'PRIVATE_COMPANY') {
    return 'Gecersiz alt satici tipi.';
  }

  const identityNumber = normalizeIdentityNumber(input.identityNumber);
  if (!/^\d{11}$/.test(identityNumber)) {
    return 'T.C. kimlik numarasi 11 haneli olmalidir.';
  }

  const iban = normalizeIban(input.iban);
  if (!/^TR\d{24}$/.test(iban)) {
    return 'Gecerli bir TR IBAN giriniz.';
  }

  if (!input.address || input.address.trim().length < 10) {
    return 'Adres en az 10 karakter olmalidir.';
  }

  if (!input.city || input.city.trim().length < 2) {
    return 'Sehir bilgisi zorunludur.';
  }

  if (!input.zipCode || input.zipCode.trim().length < 4) {
    return 'Posta kodu zorunludur.';
  }

  if (input.subMerchantType === 'PRIVATE_COMPANY') {
    if (!input.taxOffice || input.taxOffice.trim().length < 2) {
      return 'Sirket tipinde vergi dairesi zorunludur.';
    }

    if (!input.legalCompanyTitle || input.legalCompanyTitle.trim().length < 2) {
      return 'Sirket tipinde unvan zorunludur.';
    }
  }

  return null;
}

function extractSubMerchantStatus(source: unknown): string | null {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const map = source as Record<string, unknown>;
  const candidates = [map.subMerchantStatus, map.status];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export async function syncCoachSubMerchant(input: CoachPayoutSyncInput): Promise<CoachPayoutSyncResult> {
  const { firstName, lastName } = splitFullName(input.fullName);
  const subMerchantExternalId = input.existingExternalId || `coach_${input.coachId}`;

  const payload: Record<string, unknown> = {
    locale: 'tr',
    conversationId: `coach-onboarding-${input.coachId}`,
    subMerchantExternalId,
    subMerchantType: input.subMerchantType,
    address: input.address,
    contactName: firstName,
    contactSurname: lastName,
    taxOffice: input.taxOffice || 'YOK',
    legalCompanyTitle: input.legalCompanyTitle || `${firstName} ${lastName}`,
    email: input.email,
    gsmNumber: normalizePhone(input.phone),
    name: firstName,
    iban: normalizeIban(input.iban),
    identityNumber: normalizeIdentityNumber(input.identityNumber),
    city: input.city,
    zipCode: input.zipCode,
    currency: 'TRY',
  };

  let response: Record<string, unknown>;

  if (input.existingSubMerchantKey) {
    response = await updateSubMerchant({
      ...payload,
      subMerchantKey: input.existingSubMerchantKey,
    });
  } else {
    response = await createSubMerchant(payload);
  }

  const status = String(response.status || '').toLowerCase();
  if (status !== 'success') {
    return {
      ok: false,
      error: String(response.errorMessage || 'Iyzico alt satici kaydi olusturulamadi.'),
    };
  }

  const subMerchantKey = String(response.subMerchantKey || input.existingSubMerchantKey || '');
  if (!subMerchantKey) {
    return {
      ok: false,
      error: 'Iyzico subMerchantKey donmedi.',
    };
  }

  const retrieved = await retrieveSubMerchant({
    locale: 'tr',
    conversationId: `coach-onboarding-check-${input.coachId}`,
    subMerchantExternalId,
  }).catch(() => null);

  const subMerchantStatus =
    extractSubMerchantStatus(retrieved) ||
    extractSubMerchantStatus(response) ||
    'active';

  return {
    ok: true,
    subMerchantKey,
    subMerchantExternalId,
    subMerchantStatus,
  };
}
