# Coach Workspace

Bu repo artik tek komutla tum stack'i ayaga kaldiracak sekilde dockerize edildi.

Servisler:

- astro-app: Astro + Prisma web uygulamasi
- python-service: FastAPI + MediaPipe analiz servisi
- postgres: PostgreSQL veritabani

## Tek komutla calistirma

Repo kokunde sadece su komutu calistir:

```powershell
docker compose up --build
```

Alternatif olarak npm script ile:

```powershell
npm run docker:up
```

Bu komut su islemleri otomatik yapar:

1. Postgres container'ini baslatir.
2. Python analiz servisini baslatir.
3. Web container icinde Prisma generate + db push calistirir.
4. Astro uygulamasini 0.0.0.0:4321 uzerinden acik hale getirir.

## Erişim adresleri

- Web: http://localhost:4321
- Python health: http://localhost:8000/health
- Astro analysis health: http://localhost:4321/api/analysis/health
- Postgres host port: 5433

## Durdurma ve log

```powershell
docker compose down
docker compose logs -f
```

Npm script karsiliklari:

- npm run docker:down
- npm run docker:logs

## Ortam degiskenleri

Web servisi env degerlerini astro-app/.env dosyasindan alir. Docker icindeki ag adresleri compose tarafindan override edilir:

- DATABASE_URL => postgres container adresi
- PYTHON_API_URL => python-service container adresi
- PUBLIC_APP_URL => http://localhost:4321

Not: Iyzico gibi gizli anahtarlar astro-app/.env icinde tutulmaya devam eder.

## Ilk acilista beklenenler

- Python image'i (mediapipe/opencv nedeniyle) ilk seferde nispeten uzun surede build olabilir.
- Web servisi baslamadan once Prisma db push calisir.
- system_settings dahil Prisma tablolari otomatik olusur.

## Hata durumlari

### Port cakismasi

Asagidaki portlar bos olmali: 4321, 5433, 8000.

### Temiz baslangic

Tam sifirdan yeniden olusturmak icin:

```powershell
docker compose down -v
docker compose up --build
```
