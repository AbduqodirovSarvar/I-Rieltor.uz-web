import { Routes } from '@angular/router';
import { environment } from '../environments/environment';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
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
];
