# Coach Workspace

Bu repo artik tek komutla tum stack'i ayaga kaldiracak sekilde dockerize edildi.

Servisler:

- astro-app: Astro + Prisma web uygulamasi
- python-service: FastAPI + MediaPipe analiz servisi
- postgres: PostgreSQL veritabani
- redis: Rate-limit ve cache icin Redis

## Gelistirme akisi (rebuildsiz)

Ilk acilista image'lari bir kez build et:

```powershell
docker compose up --build
```

Sonraki gelistirme dongulerinde sadece su komutu calistir:

```powershell
docker compose up
```

Npm script karsiligi:

```powershell
npm run docker:up
```

Bu modda `docker-compose.override.yml` otomatik devreye girer ve kaynak kod klasorleri container icine mount edilir:

- `astro-app` degisiklikleri Astro dev server ile aninda yansir.
- `python-service` degisiklikleri Uvicorn `--reload` ile aninda yansir.
- Her kod degisikliginde `docker build` gerekmez.

Bu komutlar su islemleri otomatik yapar:

1. Postgres container'ini baslatir.
2. Python analiz servisini baslatir.
3. Redis servisini baslatir.
4. Web container icinde Prisma generate + db push calistirir.
5. Astro uygulamasini 0.0.0.0:4321 uzerinden acik hale getirir.

## Erişim adresleri

- Web: http://localhost:4321
- Python health: http://localhost:8000/health
- Astro analysis health: http://localhost:4321/api/analysis/health
- Postgres host port: 5433

## Web + Mobile ortak backend

Web uygulamasi ve mobil uygulama ayni backend API'yi ve ayni PostgreSQL veritabanini kullanir. Mobil taraf sadece backend URL'ye istek atar; DB'ye dogrudan baglanmaz.

Yerel gelistirme icin mobile API base URL mobile klasorundeki `.env` dosyasindan okunur:

- `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4321`

Android emulator yerine fiziksel cihaz kullanirsan bu degeri kendi makine IP adresin veya local tunnel/domain ile degistir.

Tek komutla her iki uygulamayi birlikte calistirmak icin root klasorde:

```powershell
npm run dev:all
```

Tek tek calistirmak istersen:

- `npm run dev:web`
- `npm run dev:mobile`

## Tam sifirdan build (gerektiginde)

Tum servisleri sifirdan, dev override olmadan base compose ile build etmek icin:

```powershell
docker compose -f docker-compose.yml up --build
```

Npm script karsiligi:

- npm run docker:up:base

Dev override ile ama image'lari tekrar build ederek acmak icin:

- npm run docker:up:build

## Durdurma ve log

```powershell
docker compose down
docker compose logs -f
```

Npm script karsiliklari:

- npm run docker:down
- npm run docker:logs
- npm run docker:up
- npm run docker:up:build
- npm run docker:up:base

## Ortam degiskenleri

Web servisi env degerlerini astro-app/.env dosyasindan alir. Docker icindeki ag adresleri compose tarafindan override edilir:

- DATABASE_URL => postgres container adresi
- PYTHON_API_URL => python-service container adresi
- PUBLIC_APP_URL => http://localhost:4321
- TRUSTED_ORIGINS => (opsiyonel) CSRF icin ek origin allowlist, virgulle ayrilir
- RATE_LIMIT_REDIS_URL => (opsiyonel) dagitik rate-limit icin Redis baglanti adresi
- RATE_LIMIT_REDIS_PREFIX => (opsiyonel) Redis rate-limit key prefix'i
- CONTACT_WEBHOOK_URL => (opsiyonel) /api/contact form mesajlarini iletmek icin webhook adresi
- ADMIN_INVITE_TTL_HOURS => (opsiyonel) admin davetlerinin varsayilan gecerlilik suresi (saat)
- PAYMENT_LINK_SECRET => (onerilir) odeme token imzasi icin ayri gizli anahtar
- IYZICO_API_KEY => IyziCo API anahtari (zorunlu, canli/sandbox hesaba gore)
- IYZICO_SECRET_KEY => IyziCo gizli anahtar (zorunlu)
- IYZICO_BASE_URL => IyziCo API endpoint'i (ornek: https://sandbox-api.iyzipay.com)
- IYZICO_PLATFORM_SUBMERCHANT_KEY => (opsiyonel) platform alt uye isyeri anahtari icin env fallback
- IYZICO_WEBHOOK_SECRET => (onerilir) IyziCo callback URL imzasi icin HMAC anahtari; bos ise PAYMENT_LINK_SECRET, o da bos ise IYZICO_SECRET_KEY kullanilir
- IYZICO_WEBHOOK_TRUSTED_IPS => (opsiyonel) IyziCo callback kaynak IP allowlist'i, virgulle ayrilir
- IYZICO_WEBHOOK_TRUSTED_IPS_FILE => (onerilir-prod) allowlist'i dosyadan okur (satir veya virgulle ayrilmis)
- IYZICO_MOCK_MODE => (opsiyonel) `1` oldugunda IyziCo cagirilari lokal mock ile calisir (contract test icin)

Not: Iyzico gibi gizli anahtarlar astro-app/.env icinde tutulmaya devam eder.
Not: Odeme erisim token omru guvenlik nedeniyle 1 saat olarak sinirlandirildi.
Not: Checkout endpoint odeme tokenini sadece httpOnly cookie uzerinden kabul eder (request body tokeni reddedilir).
Not: IyziCo webhook callback'leri host dogrulamasina ek olarak HMAC imza dogrulamasindan gecer; istenirse kaynak IP allowlist'i de zorunlu tutulabilir.
Not: `IYZICO_WEBHOOK_TRUSTED_IPS_FILE` tanimliysa ve dosya okunamazsa webhook korumasi fail-closed calisir (istekler reddedilir).

## Prod'da IYZICO_WEBHOOK_TRUSTED_IPS guvenli set etme

Bu repo icine prod IP degerlerini yazma. Bunun yerine secret dosya + compose prod overlay kullan:

1. Sunucuda secret dosyasini olustur:

```powershell
mkdir secrets -ErrorAction SilentlyContinue
@"
# IyziCo callback source IP allowlist
34.XXX.XXX.XXX
52.XXX.XXX.XXX
"@ | Set-Content -Encoding utf8 .\secrets\iyzico_webhook_trusted_ips.txt
```

2. Prod stack'i overlay ile ayaga kaldir:

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

3. Opsiyonel: ek olarak env uzerinden de IP tanimlamak istersen `IYZICO_WEBHOOK_TRUSTED_IPS` kullanabilirsin.
Kod her iki kaynagi birlestirir.

## Iyzico platform baglama (super admin)

Sistem iki farkli onboarding kullanir:

1. Egitmen onboarding: egitmen kendi hesabindan `/settings?tab=account` uzerinden IBAN girer ve kendi alt uye isyeri acilir.
2. Platform onboarding: `super_admin` hesabiyla `/admin/payments` sayfasinda "Platform Iyzico Hesabi" formu doldurulur.

Platform onboarding sonucu olusan `subMerchantKey` artik `system_settings` icinde tutulur ve checkout akisi bu anahtari kullanir.
Eger panelde kayit yoksa sistem `IYZICO_PLATFORM_SUBMERCHANT_KEY` env degerini fallback olarak kullanir.

Onemli: API key/secret panelden yazilmaz. Bu degerler guvenlik nedeniyle deployment ortamindan verilir (`astro-app/.env`, container env veya secret manager).

## Admin yetki sistemi

Backoffice erisimi yalnizca veritabanindaki role alanina bakar:

- `admin`
- `super_admin`

Kullanici kendi rolunu panelden yukseltemez (self-escalation kapali).

Yeni kurulumda ilk kayit olan hesap otomatik olarak `super_admin` atanir ve dogrudan backoffice oturumu acilir.

Acil durum (tum admin rollerinin kaybolmasi) icin manuel kurtarma komutu:

```powershell
npm run admin:bootstrap -- kullanici@mail.com
```

Sonraki admin atamalari davet akisi ile yonetilir:

1. `super_admin` hesabiyla `/admin/security` sayfasina gir.
2. Kayitli bir kullaniciya admin/super admin daveti olustur.
3. Uretilen tek seferlik link ile kullanici `/auth/admin-invite` uzerinden daveti kabul eder.

Not: Davet islemleri `admin_action_audits` tablosuna kaydedilir.

## Guvenlik smoke testleri

Stack ayaktayken temel guvenlik regresyonlarini tek komutla calistir:

```powershell
npm run security:smoke
```

Bu script su kontrolleri yapar:

1. Unauth admin erisimi redirect ediyor mu?
2. Unauth mesaj API cagrisi 401 donuyor mu?
3. Cookie ile gelen API write isteginde CSRF korumasi 403 veriyor mu?
4. Odeme endpointinde bozuk kimlik formati 400 ile engelleniyor mu?
5. Checkout endpoint rate-limit 429 uretiyor mu?
6. Temel security header'lari (CSP, X-Frame-Options) mevcut mu?

CI tarafinda ayni kontroller `.github/workflows/security-smoke.yml` workflow'u ile otomatik kosar.

## Full guvenlik audit gate

Tum endpoint'ler icin zorunlu guvenlik coverage kontrolunu calistirmak icin:

```powershell
npm run security:audit
npm run security:policy
```

Bu iki komut su kurallari enforce eder:

1. API route'larindaki her endpoint/method kombinasyonu audit kapsaminda olmalidir.
2. Full audit sonucunda hicbir case fail olmamalidir.

CI tarafinda ayni gate `.github/workflows/security-audit.yml` workflow'u ile PR ve main push uzerinde zorunlu calisir.

Detayli kural seti: `astro-app/docs/security-testing-rules.md`

## Quality gate (guvenlik disi)

Kritik business akislarini dogrulayan minimum entegrasyon testlerini calistirmak icin:

```powershell
npm run quality:smoke
npm run payments:contract
```

Toplu calistirmak icin:

```powershell
npm run quality:gate
```

Bu komutlar su alanlari dogrular:

1. Program/diyet olusturma-guncelleme-silme pozitif akislarinin calismasi
2. Mesajlasma ve profil guncelleme gibi temel business endpointlerinin calismasi
3. Odeme callback success/fail/retry sozlesmelerinin deterministik sekilde dogrulanmasi

CI tarafinda ayni kalite gate `.github/workflows/quality-gate.yml` workflow'u ile PR ve main push uzerinde otomatik kosar.
Workflow, odeme contract testleri icin stack'i `IYZICO_MOCK_MODE=1` ile kaldirir ve dis saglayiciya bagimliligi kaldirir.

## Ilk acilista beklenenler

- Python image'i (mediapipe/opencv nedeniyle) ilk seferde nispeten uzun surede build olabilir.
- Web servisi baslamadan once Prisma db push calisir.
- system_settings dahil Prisma tablolari otomatik olusur.
- Admin denetim loglari icin admin_action_audits tablosu olusur.
- Admin davetleri icin admin_invitations tablosu olusur.

## Hata durumlari

### Port cakismasi

Asagidaki portlar bos olmali: 4321, 5433, 8000.

### Temiz baslangic

Tam sifirdan yeniden olusturmak icin:

```powershell
docker compose down -v
docker compose -f docker-compose.yml up --build
```
