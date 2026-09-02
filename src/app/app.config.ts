import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { environment } from '../environments/environment';
import {
  APKsService,
  AutenticacinService,
  DispositivosService,
  LocalesService,
  SeccionesService,
  MapeoDeRedService,
  ProvinciasService,
  RdenesService,
  TiposDeLocalService,
  BASE_PATH,
} from './generated-api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
      },
    }),
    { provide: BASE_PATH, useValue: environment.apiBaseUrl },
    MessageService,
    APKsService,
    AutenticacinService,
    DispositivosService,
    LocalesService,
    SeccionesService,
    MapeoDeRedService,
    ProvinciasService,
    RdenesService,
    TiposDeLocalService,
  ],
};
