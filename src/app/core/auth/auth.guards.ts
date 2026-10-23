import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenStore } from './token-store';

/**
 * Only for a signed-in user; others go to the sign-in page and come back afterwards (`returnUrl`). The session lives in the
 * browser, so on the server the check is skipped: the personal routes are rendered in the browser only (see
 * `app.routes.server.ts`) and the browser runs this guard.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  if (!inject(DOCUMENT).defaultView) return true;
  const router = inject(Router);
  return inject(TokenStore).session()
    ? true
    : router.createUrlTree(['/kirish'], { queryParams: { returnUrl: state.url } });
};

/** For pages a signed-in user has no reason to see (sign-in, sign-up). */
export const guestGuard: CanActivateFn = () => {
  if (!inject(DOCUMENT).defaultView) return true;
  return inject(TokenStore).session() ? inject(Router).createUrlTree(['/kabinet']) : true;
};

/**
 * Applying to an auction needs an account bound to an E-IMZO key. A signed-in account that is not bound is taken to the page
 * that explains how; a guest goes to sign in.
 */
export const verifiedGuard: CanActivateFn = async (_route, state) => {
  if (!inject(DOCUMENT).defaultView) return true;
  const router = inject(Router);
  if (!inject(TokenStore).session())
    return router.createUrlTree(['/kirish'], { queryParams: { returnUrl: state.url } });
  const auth = inject(AuthService);
  if (!auth.currentUser()) await firstValueFrom(auth.loadProfile());
  return auth.isVerified()
    ? true
    : router.createUrlTree(['/kabinet/e-imzo'], { queryParams: { returnUrl: state.url } });
};
