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
