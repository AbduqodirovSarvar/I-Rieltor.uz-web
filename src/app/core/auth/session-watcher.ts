import { DOCUMENT } from '@angular/common';
import { effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { I18n, stripLang } from '../i18n/i18n.service';
import { AuthService } from './auth.service';
import { TokenStore } from './token-store';

/** The pages that need a signed-in person. */
export function isPersonalPath(url: string): boolean {
  const path = stripLang(url).split(/[?#]/)[0];
  return path === '/kabinet' || path.startsWith('/kabinet/');
}

/**
 * Call once from the root component. When the session disappears while a personal page is open (the refresh token was
 * refused, or the person signed out in another tab) they are taken to the sign-in page with a note, and come back to the
 * same page afterwards. A sign-out the person chose themself is handled where it happens, and public pages stay as they
 * are: nothing there needs a session.
 */
export function watchSession(): void {
  const store = inject(TokenStore);
  const router = inject(Router);
  const auth = inject(AuthService);
  const i18n = inject(I18n);
  const inBrowser = !!inject(DOCUMENT).defaultView;
  effect(() => {
    if (!inBrowser || store.session()) return;
    if (auth.isLeaving || !router.navigated || !isPersonalPath(router.url)) return;
    void router.navigate([i18n.link('/kirish')], {
      queryParams: { returnUrl: router.url, reason: 'expired' },
    });
  });
}
