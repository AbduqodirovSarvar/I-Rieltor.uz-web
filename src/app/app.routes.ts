import { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { guestGuard } from './core/auth/auth.guards';

/**
 * The pages of the site. They are mounted twice: at the root (Uzbek) and under `/ru` (Russian), so every address exists in
 * both languages and search engines can pair them (`hreflang`).
 */
const pages: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'nav.home',
    loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage),
  },
  {
    path: 'katalog',
    title: 'nav.catalog',
    loadComponent: () => import('./features/catalog/catalog-page').then((m) => m.CatalogPage),
  },
  {
    path: 'obyekt/:id',
    loadComponent: () => import('./features/property/property-page').then((m) => m.PropertyPage),
  },
  {
    path: 'auksion/:id',
    loadComponent: () => import('./features/auction/auction-page').then((m) => m.AuctionPage),
  },
  {
    path: 'biz-haqida',
    loadComponent: () => import('./features/about/about-page').then((m) => m.AboutPage),
  },
  {
    path: 'qoidalar',
    data: { kind: 'rules' },
    loadComponent: () => import('./features/legal/legal-page').then((m) => m.LegalPage),
  },
  {
    path: 'maxfiylik',
    data: { kind: 'privacy' },
    loadComponent: () => import('./features/legal/legal-page').then((m) => m.LegalPage),
  },
  {
    path: 'kirish',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/sign-in-page').then((m) => m.SignInPage),
  },
  {
    path: 'royxatdan-otish',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/sign-up-page').then((m) => m.SignUpPage),
  },
  {
    // The address the e-mailed link opens; fixed by the backend setting EmailConfirmation__LinkBaseUrl.
    path: 'confirm-email',
    loadComponent: () =>
      import('./features/auth/confirm-email-page').then((m) => m.ConfirmEmailPage),
  },
  {
    path: 'kabinet',
    loadChildren: () => import('./features/cabinet/cabinet.routes').then((m) => m.cabinetRoutes),
  },
  ...(environment.production
    ? []
    : [
        {
          path: 'dev/ui',
          loadComponent: () => import('./features/dev/ui-showcase').then((m) => m.UiShowcase),
        },
      ]),
  {
    path: 'ruxsat-yoq',
    data: { kind: 'forbidden' },
    loadComponent: () => import('./features/errors/error-page').then((m) => m.ErrorPage),
  },
  {
    path: 'xato',
    data: { kind: 'server' },
    loadComponent: () => import('./features/errors/error-page').then((m) => m.ErrorPage),
  },
  {
    path: '**',
    data: { kind: 'not-found' },
    loadComponent: () => import('./features/errors/error-page').then((m) => m.ErrorPage),
  },
];

export const routes: Routes = [{ path: 'ru', children: pages }, ...pages];
