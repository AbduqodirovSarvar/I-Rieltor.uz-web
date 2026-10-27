import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { safeReturnUrl } from '../../core/auth/return-url';
import { TokenResponse } from '../../core/auth/session';
import { EimzoError, EimzoErrorCode, EimzoKey } from '../../core/eimzo/eimzo.provider';
import { EimzoService } from '../../core/eimzo/eimzo.service';
import { ApiClient } from '../../core/http/api-client';
import { ApiError } from '../../core/http/api-error';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { TextKey } from '../../core/i18n/uz';
import { Notify } from '../../core/notify/notify.service';
import { EimzoKeyPicker, eimzoErrorText } from '../../shared/ui/eimzo-key-picker';

type Mode = 'sign-in' | 'sign-up';

/**
 * Sign in, or create an account, with an E-IMZO key: the person picks a key, the page signs a one-time challenge from the
 * backend, the backend checks the signature. An account made this way is verified at once (name and PINFL/INN come from the
 * key). The backend answers "created" only, so after sign-up the page signs a second challenge to sign in.
 */
@Component({
  selector: 'app-eimzo-sign-in',
  imports: [EimzoKeyPicker, TPipe],
  templateUrl: './eimzo-sign-in.html',
})
export class EimzoSignIn {
  /** From the address: where to go after signing in. Checked by {@link safeReturnUrl}. */
  readonly returnUrl = input<string | undefined>();

  private readonly eimzo = inject(EimzoService);
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);
  private readonly notify = inject(Notify);

  protected readonly key = signal<EimzoKey | null>(null);
  /** E-IMZO is not set up on this site: the card is not shown, the password sign-in is all there is. */
  readonly unavailable = signal(false);
  protected readonly working = signal(false);
  protected readonly message = signal<TextKey | null>(null);

  protected onFailed(code: EimzoErrorCode): void {
    if (code === 'library-missing') this.unavailable.set(true);
  }

  protected async run(mode: Mode): Promise<void> {
    const key = this.key();
    if (this.working()) return;
    this.message.set(null);
    if (!key) {
      this.message.set('eimzo.err.pickKey');
      return;
    }
    this.working.set(true);
    try {
      if (mode === 'sign-up') {
        await firstValueFrom(
          this.api.post<boolean>(
            'api/Auth/sign-up-via-eimzo',
            { signedData: await this.eimzo.signChallenge(key) },
            { skipAuth: true },
          ),
        );
        this.notify.success(this.i18n.t('eimzo.signUp.done'));
      }
      const token = await firstValueFrom(
        this.api.post<TokenResponse>(
          'api/Auth/sign-in-via-eimzo',
          { signedData: await this.eimzo.signChallenge(key) },
          { skipAuth: true },
        ),
      );
      this.auth.startSession(token);
      await firstValueFrom(this.auth.loadProfile());
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl(), this.i18n.link('/kabinet')));
    } catch (error) {
      this.fail(error, mode);
    } finally {
      this.working.set(false);
    }
  }

  private fail(error: unknown, mode: Mode): void {
    if (error instanceof EimzoError) return void this.message.set(eimzoErrorText(error));
    // The backend answers 401 "User not registered" for a key without an account (404 is accepted too).
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 404) &&
      mode === 'sign-in'
    )
      return void this.message.set('eimzo.signIn.notRegistered');
    if (error instanceof ApiError && error.status === 409 && mode === 'sign-up')
      return void this.message.set('eimzo.signIn.taken');
    this.notify.error(error);
  }
}
