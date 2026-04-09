# Iyzico Sandbox Test Akisi

Bu dokuman, odeme akisinin 1-2-3 sirasinda test edilmesi icin hazirlandi.

## 1) Sandbox Hazirlik ve Temel Odeme Akisi

### 1.1 Ortam dogrulama
- `.env` icinde su alanlarin dolu oldugunu kontrol et:
  - `PUBLIC_APP_URL`
  - `IYZICO_API_KEY`
  - `IYZICO_SECRET_KEY`
  - `IYZICO_BASE_URL`
  - `ADMIN_EMAILS` (Backoffice sekmesini gorecek kullanicilar icin, virgul ile ayrilmis)
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
- Student odemesinde marketplace parametresi sandbox hesabinda reddedilirse sistem otomatik olarak `platform_fallback` ile checkout olusturur.

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
- `ADMIN_EMAILS` ortam degiskeninde bulunan bir hesapla giris yap.
- `http://localhost:4321/settings?tab=backoffice`

Beklenen:
- Payout onboarding ozet kartlari gorunur.
- Egitmen bazli `iyzicoPayoutReadyAt`, `iyzicoSubMerchantKey`, `iyzicoLastError` alanlari listelenir.
- Son basarisiz ogrenci odeme denemeleri hata nedenleriyle gorunur.

Not:
- `ADMIN_EMAILS` bos ise, local development ortaminda coach kullanicilar backoffice sekmesini gorebilir.
- Uretimde sadece `ADMIN_EMAILS` veya `admin` rolundeki hesaplar erisim alir.

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
- 400 webhook aliyorsan: token eksik veya dogrulama mismatch olabilir.
- Iyzico sayfasi acilmiyorsa: `.env` anahtarlari ve `IYZICO_BASE_URL` degerini kontrol et.
- Student checkout `subMerchantKey` hatasi aliyorsa: Iyzico hesabin standard olabilir; sistem `platform_fallback` ile devam eder.
