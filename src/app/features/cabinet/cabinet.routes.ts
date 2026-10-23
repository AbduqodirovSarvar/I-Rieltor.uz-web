import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guards';

/**
 * The personal cabinet: signed-in people only, rendered in the browser (see `app.routes.server.ts`). Pages for applications
 * and payments are added in the next stages.
 */
export const cabinetRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./cabinet-layout').then((m) => m.CabinetLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'profil' },
      {
        path: 'profil',
        loadComponent: () => import('./profile-page').then((m) => m.ProfilePage),
      },
      {
        path: 'hujjatlar',
        loadComponent: () => import('./documents-page').then((m) => m.DocumentsPage),
      },
      {
        path: 'xavfsizlik',
        loadComponent: () => import('./security-page').then((m) => m.SecurityPage),
      },
    ],
  },
];
