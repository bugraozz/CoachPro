/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly PYTHON_API_URL: string;
  readonly PUBLIC_APP_URL?: string;
  readonly TRUSTED_ORIGINS?: string;
  readonly PAYMENT_LINK_SECRET?: string;
  readonly IYZICO_API_KEY?: string;
  readonly IYZICO_SECRET_KEY?: string;
  readonly IYZICO_BASE_URL?: string;
  readonly IYZICO_MOCK_MODE?: string;
  readonly IYZICO_WEBHOOK_SECRET?: string;
  readonly IYZICO_WEBHOOK_TRUSTED_IPS?: string;
  readonly IYZICO_WEBHOOK_TRUSTED_IPS_FILE?: string;
  readonly IYZICO_DEFAULT_IDENTITY_NUMBER?: string;
  readonly IYZICO_PLATFORM_SUBMERCHANT_KEY?: string;
  readonly RATE_LIMIT_REDIS_URL?: string;
  readonly RATE_LIMIT_REDIS_PREFIX?: string;
  readonly REDIS_URL?: string;
  readonly CONTACT_WEBHOOK_URL?: string;
  readonly ADMIN_INVITE_TTL_HOURS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    cspNonce?: string;
  }
}

declare module 'iyzipay';
