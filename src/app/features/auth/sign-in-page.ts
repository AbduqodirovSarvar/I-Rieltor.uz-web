import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { safeReturnUrl } from '../../core/auth/return-url';
import { TokenResponse } from '../../core/auth/session';
import { fieldError } from '../../core/forms/field-error';
import { ApiClient } from '../../core/http/api-client';
import { ApiError } from '../../core/http/api-error';
import { I18n } from '../../core/i18n/i18n.service';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { Notify } from '../../core/notify/notify.service';
import { Seo } from '../../core/seo/seo.service';
import { FormField } from '../../shared/ui/form-field';
import { EimzoSignIn } from './eimzo-sign-in';
import { PasswordInput } from '../../shared/ui/password-input';

/**
 * Sign in with login (or e-mail) and password. A wrong login and a wrong password get the same message, so the page does
 * not tell anyone which logins exist. After too many tries the server asks to wait: the button waits too.
 */
@Component({
  selector: 'app-sign-in-page',
  imports: [
    EimzoSignIn,
    FormField,
    PasswordInput,
    ReactiveFormsModule,
    RouterLink,
    TPipe,
    LinkPipe,
  ],
  templateUrl: './sign-in-page.html',
  styleUrl: './auth-pages.scss',
})
export class SignInPage {
  /** From the address (`?returnUrl=`): where to go after signing in. Checked by {@link safeReturnUrl}. */
  readonly returnUrl = input<string | undefined>();
  /** `?reason=expired`: the session ended while the person was on a page. */
  readonly reason = input<string | undefined>();

  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);
  private readonly notify = inject(Notify);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = new FormGroup({
    login: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(128)],
    }),
  });

  protected readonly tab = signal<'password' | 'eimzo'>('password');
  protected readonly submitting = signal(false);
  protected readonly invalid = signal(false);
  /** Seconds the person still has to wait (after a 429). */
  protected readonly wait = signal(0);
  protected readonly canSubmit = computed(() => !this.submitting() && this.wait() === 0);

  constructor() {
    inject(Seo).set({ title: this.i18n.t('auth.signIn.title'), noindex: true });
  }

  /** The arrow keys move between the two tabs, as in any tab list. */
  protected onTabKey(event: KeyboardEvent): void {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next = this.tab() === 'password' ? 'eimzo' : 'password';
    this.tab.set(next);
    (event.currentTarget as HTMLElement).parentElement
      ?.querySelector<HTMLElement>(`[data-tab=${next}]`)
      ?.focus();
  }

  protected error(name: 'login'): string | null {
    return fieldError(this.form.controls[name], this.i18n);
  }

  protected async submit(): Promise<void> {
    this.invalid.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Pressing twice must not send two sign-ins.
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    try {
      const { login, password } = this.form.getRawValue();
      const token = await firstValueFrom(
        this.api.post<TokenResponse>(
          'api/Auth/sign-in',
          { login: login.trim(), password },
          { skipAuth: true },
        ),
      );
      this.auth.startSession(token);
      await firstValueFrom(this.auth.loadProfile());
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl(), this.i18n.link('/kabinet')));
    } catch (error) {
      this.fail(error);
    } finally {
      this.submitting.set(false);
    }
  }

  private fail(error: unknown): void {
    if (error instanceof ApiError && error.status === 429) {
      this.startWait(error.retryAfter ?? 30);
    } else if (error instanceof ApiError && [400, 401, 403].includes(error.status)) {
      this.invalid.set(true);
      this.form.controls.password.reset('');
    } else {
      this.notify.error(error);
    }
  }

  private startWait(seconds: number): void {
    this.wait.set(Math.max(1, Math.min(seconds, 600)));
    const timer = setInterval(() => {
      this.wait.update((n) => n - 1);
      if (this.wait() <= 0) clearInterval(timer);
    }, 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }
}
