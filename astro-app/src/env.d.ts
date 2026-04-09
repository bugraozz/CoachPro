/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly PYTHON_API_URL: string;
  readonly PUBLIC_APP_URL?: string;
  readonly IYZICO_API_KEY?: string;
  readonly IYZICO_SECRET_KEY?: string;
  readonly IYZICO_BASE_URL?: string;
  readonly IYZICO_DEFAULT_IDENTITY_NUMBER?: string;
  readonly IYZICO_PLATFORM_SUBMERCHANT_KEY?: string;
  readonly ADMIN_EMAILS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'iyzipay';
