import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { authGuard } from './core/auth/auth.guard';
import { pendingChangesGuard } from './core/pending-changes.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout').then((m) => m.Layout),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'devices',
        loadComponent: () => import('./features/devices/device-list/device-list').then((m) => m.DeviceList),
      },
      {
        path: 'devices/:androidId',
        loadComponent: () =>
          import('./features/devices/device-detail/device-detail').then((m) => m.DeviceDetail),
        canDeactivate: [pendingChangesGuard],
      },
      {
        path: 'alertas',
        loadComponent: () => import('./features/alerts/alerts').then((m) => m.Alerts),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/admin').then((m) => m.Admin),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
