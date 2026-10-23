import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/auth/auth.interceptor';
import { I18n } from './core/i18n/i18n.service';
import { GlobalErrorHandler } from './core/notify/global-error-handler';
import { AppTitleStrategy } from './core/seo/title-strategy';
import { clockInterceptor } from './core/time/server-clock';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([clockInterceptor, authInterceptor])),
    { provide: TitleStrategy, useExisting: AppTitleStrategy },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // The language comes from the address; the service must exist before the first navigation starts.
    provideAppInitializer(() => void inject(I18n)),
    // Picks up a stored session (renews a dying token, loads the profile). Without a session it returns at once.
    provideAppInitializer(() => inject(AuthService).restore()),
  ],
};
