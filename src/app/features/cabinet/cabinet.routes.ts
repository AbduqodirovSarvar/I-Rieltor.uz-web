import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/auth.guards';

/** The personal cabinet: signed-in users only, rendered in the browser (see `app.routes.server.ts`). */
export const cabinetRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./cabinet-home').then((m) => m.CabinetHome),
  },
];
