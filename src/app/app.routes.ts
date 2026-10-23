import { Routes } from '@angular/router';
import { environment } from '../environments/environment';

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
