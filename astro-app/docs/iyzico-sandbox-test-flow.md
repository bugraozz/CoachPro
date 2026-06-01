# Iyzico Sandbox Test Akisi

Bu dokuman, odeme akisinin 1-2-3 sirasinda test edilmesi icin hazirlandi.

## 1) Sandbox Hazirlik ve Temel Odeme Akisi

### 1.1 Ortam dogrulama
- `.env` icinde su alanlarin dolu oldugunu kontrol et:
  - `PUBLIC_APP_URL`
  - `IYZICO_API_KEY`
  - `IYZICO_SECRET_KEY`
  - `IYZICO_BASE_URL`
  - `IYZICO_WEBHOOK_SECRET` (onerilir, bos ise `PAYMENT_LINK_SECRET`, o da bos ise `IYZICO_SECRET_KEY` fallback kullanilir)
  - `IYZICO_WEBHOOK_TRUSTED_IPS` (opsiyonel, callback kaynak IP allowlist)
  - `IYZICO_WEBHOOK_TRUSTED_IPS_FILE` (onerilir-prod, allowlist dosyasi)
  - `IYZICO_PLATFORM_SUBMERCHANT_KEY` (opsiyonel fallback)
- Uygulamayi baslat:
  - `pnpm dev`
  - veya workspace kokunden: `npm run dev` / `npm run dev:host`

### 1.3 Otomatik sandbox e2e scripti
- Script:
  - `scripts/sandbox-e2e-checkout.mjs`
- Calistir:
  - `node scripts/sandbox-e2e-checkout.mjs`

Beklenen:
- Coach ve Student checkout istekleri 200 donebilir.
- `payment_transactions` tablosunda `pending` kayitlar olusur.
- Student odemesi strict marketplace akisindadir; egitmen payout profili (`iyzicoSubMerchantKey` + `iyzicoPayoutReadyAt`) yoksa checkout 400 ile reddedilir.

### 1.5 Super admin platform payout onboarding
- `super_admin` rolune sahip bir hesapla `http://localhost:4321/admin/payments` sayfasina gir.
- "Platform Iyzico Hesabi" formunu doldurup senkronize et.

Beklenen:
- Platform `subMerchantKey` panel ayari olarak saklanir (`system_settings`).
- Egitmen abonelik checkout akisinda platform marketplace routing bu anahtari kullanir.
- Panel ayari yoksa sistem `IYZICO_PLATFORM_SUBMERCHANT_KEY` env degerine fallback yapar.

### 1.4 Deterministik contract e2e (mock IyziCo)
- Script:
  - `scripts/payments-contract-e2e.mjs`
- Calistir:
  - `npm run payments:contract`

Beklenen:
- Success callback sonrasi transaction `paid` olur.
- Fail callback sonrasi transaction `failed` olur.
- Retry akisinda yeni transaction metadata alaninda `retryOfTransactionId`/`retryAttempt` bulunur.
- Onceki failed transaction metadata alaninda `retriedAt` ve `lastRetryTransactionId` guncellenir.

### 1.2 Kayit ve odeme baslatma
1. `http://localhost:4321/auth/register` sayfasina git.
2. Coach veya Student hesabi olustur.
3. Kayit sonrasi odeme sayfasina yonlenmelisin:
   - `http://localhost:4321/auth/payment?userId=...`
4. Butona basinca Iyzico odeme sayfasina yonlenme olmasi gerekir.

Beklenen:
- `/api/payments/create-checkout-session` 200 doner.
- `payment_transactions` tablosunda `status=pending` kaydi olusur.
- `provider=iyzico` olur.

## 2) Guvenlik Testleri (Callback + Dogrulama)

Bu adim callback guvenligini dogrular.

### 2.1 Otomatik hizli test (PowerShell)
- Script:
  - `scripts/test-webhook-security.ps1`
- Calistir:
  - `powershell -ExecutionPolicy Bypass -File .\\scripts\\test-webhook-security.ps1`

Beklenen:
- `http://localhost:4321/api/payments/webhook` istegi token olmadigi icin `400` doner.
- `http://127.0.0.1:4321/api/payments/webhook` host uyusmadigi icin `403` doner.

### 2.2 Callback dogrulama davranisi
Iyzico callback geldiginde sistem su kontrolleri yapar:
- host dogrulamasi (`PUBLIC_APP_URL` host ile eslesme)
- callback URL HMAC imza dogrulamasi (`sig` query param)
- (opsiyonel) kaynak IP allowlist dogrulamasi (`IYZICO_WEBHOOK_TRUSTED_IPS`)
- (opsiyonel) kaynak IP allowlist dosyasi (`IYZICO_WEBHOOK_TRUSTED_IPS_FILE`)
- `conversationId` / `basketId` -> transaction id eslesmesi
- para birimi (`TRY`) kontrolu
- tutar kontrolu (`paidPrice` vs transaction amount)

Beklenen:
- Kontroller gecerse islem `paid` olur.
- Herhangi biri fail olursa islem `failed` olur ve `metadata.failureReason` yazilir.

## 3) Retry + Raporlama Testleri

### 3.1 Failed odemeyi retry etme
1. Odeme basarisiz olacak sekilde bir deneme yap.
2. Ayni kullanici ile odeme sayfasina geri don.
3. Yeniden odeme baslat.

Beklenen:
- Yeni transaction olusur.
- Yeni transaction metadata alaninda:
  - `retryOfTransactionId`
  - `retryAttempt`
- Onceki failed transaction metadata alaninda:
  - `retriedAt`
  - `lastRetryTransactionId`

### 3.2 UI raporlama
- `http://localhost:4321/settings?tab=account`
- Odeme ozeti kartlarini kontrol et:
  - Toplam Islem
  - Basarili
  - Basarisiz
  - Bekleyen
  - Retry Sayisi
  - Toplam Tahsilat
  - En Sik Hata Nedenleri

### 3.5 Backoffice izleme
- `admin` veya `super_admin` rolune sahip bir hesapla giris yap.
- `http://localhost:4321/settings?tab=backoffice`

Beklenen:
- Payout onboarding ozet kartlari gorunur.
- Egitmen bazli `iyzicoPayoutReadyAt`, `iyzicoSubMerchantKey`, `iyzicoLastError` alanlari listelenir.
- Son basarisiz ogrenci odeme denemeleri hata nedenleriyle gorunur.

Not:
- Backoffice erisimi sadece `admin` veya `super_admin` rolune verilir.
- Ilk yetkili hesap icin `npm run admin:bootstrap -- <email>` komutu kullanilir.

### 3.3 API raporlama
- Endpoint: `GET /api/payments/report`
- Yetkili session ile cagrilir.

Beklenen JSON:
- `summary`
- `topFailureReasons`
- `recentFailures`

### 3.4 Otomatik report testi (PowerShell)
- Script:
  - `scripts/test-payments-report.ps1`
- Calistir:
  - `powershell -ExecutionPolicy Bypass -File .\\scripts\\test-payments-report.ps1 -Email "kullanici@mail.com" -Password "sifre"`

Script sirasi:
1. `/auth/login` ile session alir.
2. `/api/payments/history` cagirir.
3. `/api/payments/report` cagirir.
4. Ozeti terminalde basar.

## Sorun Giderme

- 401 aliyorsan: login/session yoktur.
- 403 webhook aliyorsan: callback host `PUBLIC_APP_URL` ile uyusmuyordur.
- 403 webhook aliyorsan: callback `sig` imzasi gecersizdir veya `IYZICO_WEBHOOK_TRUSTED_IPS` allowlist'i istegi blokluyordur.
- 400 webhook aliyorsan: token eksik veya dogrulama mismatch olabilir.
- Iyzico sayfasi acilmiyorsa: `.env` anahtarlari ve `IYZICO_BASE_URL` degerini kontrol et.
- Super admin API key sorusu icin: `IYZICO_API_KEY` ve `IYZICO_SECRET_KEY` degerleri guvenlik nedeniyle panelden degil env/secret manager uzerinden verilir.
- Student checkout `subMerchantKey` hatasi aliyorsan: egitmenin payout profili eksik olabilir; once `/settings?tab=account` uzerinden onboarding tamamlanmalidir.
