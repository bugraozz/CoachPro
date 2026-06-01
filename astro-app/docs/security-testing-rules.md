# Security Testing Rules

Bu dokuman, projeye eklenecek her yeni API ozelligi icin zorunlu guvenlik test kurallarini tanimlar.

## Zorunlu Kurallar

1. Her yeni API endpoint/method kombinasyonu icin `npm run security:audit` icine en az bir test case eklenmelidir.
2. Her endpoint icin en az bir olumsuz senaryo bulunmalidir.
3. Yazma endpoint'lerinde (POST/PUT/PATCH/DELETE) en az bir yetki veya dogrulama reddi senaryosu tanimlanmalidir.
4. Testler deterministik olmali; calisma ortamina bagli rastgele fixture bagimliliklari kullanilmamalidir.
5. `security-full-audit-results.json` icinde hicbir case `pass: false` olarak kalmamalidir.

## Pipeline Kurali

CI tarafinda su adimlar zorunludur:

1. `npm run security:smoke`
2. `npm run security:audit`
3. `npm run security:policy`

`security:policy` scripti su kontrolleri yapar:

- API route dosyalarinda tanimli tum endpoint/method kombinasyonlarinin audit coverage'i var mi?
- Full audit sonucunda basarisiz case var mi?

Bu kontrollerden biri bile kalirsa PR merge edilmemelidir.

## Yeni Ozellik Ekleme Checklist

1. Endpoint kodunu yaz.
2. Negatif ve pozitif security senaryolarini `astro-app/scripts/full-security-audit.mjs` dosyasina ekle.
3. Lokal stack uzerinde testleri calistir:
   - `npm run security:smoke`
   - `npm run security:audit`
   - `npm run security:policy`
4. Sonuclarin tamaminin gectigini dogrula ve sonra PR ac.
