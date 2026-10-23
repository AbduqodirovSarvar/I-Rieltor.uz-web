import { Component, afterNextRender, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiClient } from '../../core/http/api-client';
import { I18n } from '../../core/i18n/i18n.service';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { Seo } from '../../core/seo/seo.service';

type State = 'working' | 'done' | 'failed' | 'no-token';

/**
 * The page the e-mailed link opens (`/confirm-email?token=...`; the address is fixed by the backend's setting). The token is
 * sent by POST from the browser, not read by the server: mail scanners open links to check them, and a link that confirmed
 * on a plain GET would be used up by the scanner. The token is also removed from the address bar right away.
 */
@Component({
  selector: 'app-confirm-email-page',
  imports: [RouterLink, TPipe, LinkPipe],
  templateUrl: './confirm-email-page.html',
  styleUrl: './auth-pages.scss',
})
export class ConfirmEmailPage {
  readonly token = input<string | undefined>();

  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly state = signal<State>('working');
  protected readonly isSignedIn = this.auth.isAuthenticated;

  constructor() {
    inject(Seo).set({ title: inject(I18n).t('auth.confirm.title'), noindex: true });
    afterNextRender(() => void this.confirm());
  }

  private async confirm(): Promise<void> {
    const token = this.token();
    if (!token) {
      this.state.set('no-token');
      return;
    }
    // Out of the address bar and the history before anything else happens.
    void this.router.navigate([], { queryParams: { token: null }, replaceUrl: true });
    try {
      await firstValueFrom(
        this.api.post<boolean>('api/Auth/confirm-email', { token }, { skipAuth: true }),
      );
      this.state.set('done');
      // A signed-in person's profile now has the confirmed e-mail.
      if (this.auth.isAuthenticated()) await firstValueFrom(this.auth.loadProfile());
    } catch {
      this.state.set('failed');
    }
  }
}
