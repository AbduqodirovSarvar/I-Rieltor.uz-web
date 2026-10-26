# I-Rieltor.uz ochiq sayti (web)

Angular 22 (standalone komponentlar, signal), **SSR + hydration** (Express), o'z dizayn tizimi (SCSS tokenlari, PrimeNG yo'q).
Reja va holat: `../development/WEB_REJA.md`.

## Ishga tushirish

Backend (lokal Docker) `http://localhost:8080` da ishlab turishi kerak (`../I-Rieltor.uz-backend/deploy/local/README.md`).

```
npm install            # .npmrc: legacy-peer-deps
npm start              # http://localhost:4200 (SSR dev-server); /api /hubs /uploads /swagger backendga proksi (proxy.conf.json)
npm run api:types      # backend Swagger'idan src/app/api/schema.d.ts ni qayta yaratadi
npm run lint           # ESLint (angular-eslint + a11y qoidalari)
npm run format         # Prettier
npm test               # birlik testlari (Vitest, jsdom): ng test --watch=false
npm run build          # production build: dist/I-rieltor.uz-web/{browser,server}
npm run serve:ssr:I-rieltor.uz-web   # build'dan keyin SSR serverni ishga tushirish (PORT, API_INTERNAL_URL)
```

## Manzillar (bitta manzil sxemasi)
Brauzer saytni va API ni **bitta manzildan** ko'radi: Nginx `/api`, `/hubs`, `/uploads` ni API ga, qolganini SSR serverga yo'naltiradi.
Shuning uchun brauzerda API manzili bo'sh (`API_BASE = ''`), CORS va cookie muammosi yo'q. SSR server esa API ga ichki manzil bilan boradi:
`API_INTERNAL_URL` (standart `http://127.0.0.1:8080`, Docker'da `http://api:8080`).

## Tuzilma

```
src/app/
  core/       HTTP (ApiClient, ApiError), auth (token, refresh, guard), i18n, vaqt (Asia/Tashkent), SEO, realtime (SignalR)
  shared/     umumiy komponentlar va pipelar
  features/   sahifalar bo'limlari: har biri lazy, o'z servisi bilan
  api/        schema.d.ts (generatsiya qilingan, qo'lda o'zgartirilmaydi)
  testing/    test yordamchilari (envelope, FakeHub)
src/styles/   _tokens.scss (ranglar, o'lchamlar, qorong'i rejim), _base.scss, _components.scss
```

## Tillar (uz / ru)
O'zbek tili prefikssiz (`/katalog`), rus tili `/ru/katalog`. Til manzildan olinadi (SSR va qidiruv tizimlari uchun). Matnlar `core/i18n/uz.ts`
va `ru.ts` da (kalitlar bir xil bo'lishi kompilyator bilan tekshiriladi). Havola yozishda `[routerLink]="'/katalog' | link"`.
Yangi sahifa marshrutini `app.routes.ts` dagi `pages` ro'yxatiga qo'shing: u ikkala tilda ham ulanadi.

## SSR qoidalari
- Ochiq sahifalar serverda renderlanadi (`app.routes.server.ts`), kabinet (`kabinet/**`) faqat brauzerda.
- Sessiya `localStorage` da: serverda `TokenStore` doim bo'sh. Shuning uchun **shaxsiy holatga bog'liq ko'rinish serverda chiqmasligi** kerak,
  aks holda hydration mos kelmaydi. Guard'lar serverda hech narsa hal qilmaydi (brauzer qayta tekshiradi).
- `window`, `document`, `localStorage`, `navigator` ga to'g'ridan-to'g'ri murojaat qilmang: `DOCUMENT` / `isPlatformBrowser` orqali.
- Vaqt har doim Asia/Tashkent (`core/time/tashkent.ts`), server mintaqasiga bog'liq emas.

## Konvensiyalar
- Komponent selektori `app-` bilan; fayl nomlari `kebab-case`; har bir servis/komponent yoniga `*.spec.ts`.
- Rang, o'lcham, radius faqat `src/styles/_tokens.scss` dagi o'zgaruvchilardan; komponentda qattiq yozilgan qiymat bo'lmasin.
- Ikonli tugmaga `aria-label` majburiy; formada har maydonga `label` va xato `aria-describedby` bilan.
- Commit xabari band raqami bilan: `W1-3: refresh single-flight`.
- `src/app/api/schema.d.ts` ni backend o'zgargach `npm run api:types` bilan yangilang va commit qiling.
- `/dev/ui` sahifasi (faqat development) hamma umumiy uslublarni bir joyda ko'rsatadi.

## Server va xavfsizlik sarlavhalari

`src/server.ts` (Express) sahifalarni render qiladi va qo'shimcha manzillar beradi:

| Manzil | Nima |
|---|---|
| `/healthz` | Konteyner va monitoring uchun `ok` |
| `/robots.txt` | Shaxsiy sahifalar yopiq (`src/seo-files.ts`) |
| `/sitemap.xml` | Statik sahifalar + har bir obyekt va auksion, uz+ru, API'dan olinadi, 10 daqiqa xotirada |

- **Kesh**: ochiq sahifalar `s-maxage=60`, kabinet/kirish/to'lov va xatolar `no-store`; hashli fayllar `immutable`, qolganlari (favicon, `og-default.png`) 1 kun.
- **CSP** (`src/security-headers.ts`): inline skriptlar faqat Angular yozganlari, xesh bilan ruxsat etiladi (nonce emas: sahifa 1 daqiqa keshlanadi). Rasmlar boshqa hostdan kelsa, `CSP_IMAGE_HOSTS` muhit o'zgaruvchisiga manzillarni bo'sh joy bilan yozing. Tashqi skript (analitika va h.k.) qo'shsangiz, shu faylda ruxsat bering.
- **Muhit**: `API_INTERNAL_URL` (SSR API'ga shu manzil bilan boradi, standart `http://127.0.0.1:8080`, konteynerda `http://api:8080`), `PORT` (4000), `CSP_IMAGE_HOSTS`.
- SSR ma'lumotni sahifa ichida brauzerga uzatadi (`core/http/transfer-cache.ts`): hydration vaqtida ochiq ma'lumot ikkinchi marta so'ralmaydi. Auksion va taklif so'rovlari uzatilmaydi (soat farqi shu so'rovdan hisoblanadi).

## Konteyner va joylashtirish

- `Dockerfile` (build, keyin faqat Node server; `node_modules` kerak emas), `Dockerfile.local` (korporativ TLS sababli hostda `npx ng build` qilingan `dist` ni oladi).
- Backend papkasidagi `docker-compose.yml` da `web` xizmati bor; Nginx `/api`, `/health`, `/swagger`, `/hubs`, `/uploads` ni API ga, qolganini `web:4000` ga yuboradi. Lokal: backend papkasida `.\deploy\local\up.ps1` (web, admin va API ni quradi), keyin `http://localhost:8080/`.
- To'lov qaytish manzili: backendda `Payments__ReturnUrl=https://<domen>/tolov/natija`. Pochta havolasi: `EmailConfirmation__LinkBaseUrl=https://<domen>/confirm-email`.
- `src/environments/environment.ts` dagi `siteUrl` haqiqiy domen bo'lishi kerak (canonical, sitemap, ulashish rasmi).
- CI: `.github/workflows/ci.yml` (format, lint, test, build, keyin Docker image qurib `healthz`, `robots.txt` va CSP tekshiriladi).

## Sinovlar

- `npm test` - birlik va komponent sinovlari (Vitest, jsdom); `npm test -- --coverage` qamrov hisoboti.
- `npm run e2e` - Playwright, ishlayotgan stack ustida (backend papkasida `.\deploy\local\up.ps1`, manzil `E2E_BASE_URL`, standart `http://localhost:8080`): mehmon yo'li, hisob, SEO/SSR sarlavhalari, `axe` bilan a11y, o'lchamlar. Ro'yxatdan o'tish daqiqasiga cheklangan, sinov kutadi.
- `node scripts/load.mjs http://web:4000 50 15 / /katalog` - yuklama (Nginx emas, to'g'ridan-to'g'ri Node serveriga; Docker tarmog'i ichidan). Production'da `NG_ALLOWED_HOSTS` da domen bo'lishi shart, aks holda sayt 400 beradi.

## E-IMZO

- **Haqiqiy kutubxona**: `e-imzo.js` va `e-imzo-client.js` fayllarini `public/eimzo/` ga qo'ying, domen uchun E-IMZO bergan kalitlarni `src/environments/environment.ts` dagi `eimzoApiKeys` ga yozing (`['i-rieltor.uz', '<kalit>']`). Fayllar yo'q bo'lsa, kirish va tiklash sahifalarida E-IMZO bloki ko'rinmaydi, ulash va ariza sahifalarida "E-IMZO hali ulanmagan" deb aytiladi. Adapter: `src/app/core/eimzo/real-eimzo.ts` (kutubxonaning ochiq hujjatiga qarab yozilgan, **haqiqiy fayllar bilan hali sinalmagan**: kelganda `listAllUserKeys`, `loadKey`, `createPkcs7` chaqiruvlarini va xato matnlarini tekshiring).
- **Sinov uchun soxta E-IMZO**: backend papkasida `docker compose -f docker-compose.yml -f docker-compose.local.yml -f docker-compose.eimzo-fake.yml up -d` (soxta E-IMZO server + yuqori limitlar, faqat lokal), brauzer konsolida `localStorage.setItem('irieltor.dev.fake-eimzo','1')`. Sahifa soxta kalitlarni taklif qiladi va "sinov rejimi" deb ogohlantiradi. `E2E_EIMZO_FAKE=1 npm run e2e` E-IMZO ssenariylarini ham yuritadi.
- **E-IMZO Mobile** (QR, `e-imzo-mobile.js`) hali qilinmagan: W5-7, W7-3.

## Yangi sahifa qo'shish

1. `src/app/features/<bo'lim>/<nom>-page.ts|html|scss`: mustaqil (`standalone`) komponent, `Seo.set({title, noindex})`, matnlar `TPipe` bilan.
2. Marshrut: ochiq sahifa `src/app/app.routes.ts` dagi `pages` ga (u `/` va `/ru` ostida ikki marta ulanadi), kabinet sahifasi `features/cabinet/cabinet.routes.ts` ga.
3. Shaxsiy sahifa bo'lsa `src/app/app.routes.server.ts` ga `RenderMode.Client`, `src/seo-files.ts` dagi `CLOSED` ro'yxatiga (robots va kesh), `authGuard`.
4. Matnlar: `src/app/core/i18n/uz-*.ts` va `ru-*.ts` (kalit ikkala tilda ham bo'lishi shart, tip tekshiradi).
5. Sinov (`*.spec.ts`) va, kerak bo'lsa, `e2e/`.

## Joylashtirish (deploy) qadamlari

1. Domenni serverga yo'naltiring; backend `.env` da `SERVER_NAME`, `LETSENCRYPT_EMAIL`, `Payments__ReturnUrl`, `EmailConfirmation__LinkBaseUrl`, SMTP, `Contact__Email` ni to'ldiring.
2. `src/environments/environment.ts` da `siteUrl` ni tekshiring.
3. `docker compose up -d --build` (backend papkasi): `web`, `api`, `nginx` ko'tariladi, sertifikat 1-2 daqiqada olinadi.
4. Tekshiring: `https://<domen>/healthz`, `/robots.txt`, `/sitemap.xml`, `/health/ready`; Search Console'ga sitemap yuboring.
5. E-IMZO fayllari va kalitlari kelganda yuqoridagi bo'limga qarang.

