import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { safeReturnUrl } from '../../core/auth/return-url';
import { TokenResponse } from '../../core/auth/session';
import { fieldError } from '../../core/forms/field-error';
import { applyServerErrors } from '../../core/forms/server-errors';
import {
  loginValidator,
  matchesValidator,
  passwordValidator,
  phoneValidator,
} from '../../core/forms/validators';
import { ApiClient } from '../../core/http/api-client';
import { ApiError } from '../../core/http/api-error';
import { I18n } from '../../core/i18n/i18n.service';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { Notify } from '../../core/notify/notify.service';
import { Seo } from '../../core/seo/seo.service';
import { FormField } from '../../shared/ui/form-field';
import { PasswordInput } from '../../shared/ui/password-input';

type Field = 'firstName' | 'lastName' | 'middleName' | 'login' | 'phone' | 'email';

/**
 * Create an account with a password. The backend answers only "created"; the page then signs the person in with the same
 * e-mail and password so they land in the cabinet (where a note asks them to confirm the e-mail). A newly made account
 * is a plain one: the identity (PINFL) and the right to apply come only from E-IMZO, later.
 */
@Component({
  selector: 'app-sign-up-page',
  imports: [FormField, PasswordInput, ReactiveFormsModule, RouterLink, TPipe, LinkPipe],
  templateUrl: './sign-up-page.html',
  styleUrl: './auth-pages.scss',
})
export class SignUpPage {
  readonly returnUrl = input<string | undefined>();

  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);
  private readonly notify = inject(Notify);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = new FormGroup(
    {
      firstName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      lastName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      middleName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(100)],
      }),
      login: new FormControl('', { nonNullable: true, validators: [loginValidator] }),
      phone: new FormControl('', { nonNullable: true, validators: [phoneValidator] }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email, Validators.maxLength(150)],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, passwordValidator, Validators.maxLength(128)],
      }),
      confirm: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: [matchesValidator('password', 'confirm')] },
  );

  protected readonly submitting = signal(false);
  protected readonly conflict = signal(false);
  protected readonly problems = signal<string[]>([]);
  protected readonly wait = signal(0);
  protected readonly canSubmit = computed(() => !this.submitting() && this.wait() === 0);

  constructor() {
    inject(Seo).set({ title: this.i18n.t('auth.signUp.title'), noindex: true });
  }

  protected error(name: Field): string | null {
    return fieldError(this.form.controls[name], this.i18n);
  }

  protected async submit(): Promise<void> {
    this.conflict.set(false);
    this.problems.set([]);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    const value = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.api.post<boolean>(
          'api/Auth/sign-up',
          {
            firstName: value.firstName.trim(),
            lastName: value.lastName.trim(),
            email: value.email.trim(),
            password: value.password,
            // Optional values are left out when empty, not sent as empty text.
            ...(value.middleName.trim() ? { middleName: value.middleName.trim() } : {}),
            ...(value.login.trim() ? { login: value.login.trim() } : {}),
            ...(value.phone.trim() ? { phone: value.phone.trim() } : {}),
          },
          { skipAuth: true },
        ),
      );
    } catch (error) {
      this.fail(error);
      this.submitting.set(false);
      return;
    }

    // The account exists. Signing in is a convenience: if it fails the person simply signs in by hand.
    try {
      const token = await firstValueFrom(
        this.api.post<TokenResponse>(
          'api/Auth/sign-in',
          { login: value.email.trim(), password: value.password },
          { skipAuth: true },
        ),
      );
      this.auth.startSession(token);
      await firstValueFrom(this.auth.loadProfile());
      this.notify.success(this.i18n.t('auth.signUp.welcome'));
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl(), this.i18n.link('/kabinet')));
    } catch {
      await this.router.navigateByUrl(this.i18n.link('/kirish'));
    } finally {
      this.submitting.set(false);
    }
  }

  private fail(error: unknown): void {
    if (!(error instanceof ApiError)) return void this.notify.error(error);
    if (error.status === 409) {
      this.conflict.set(true);
    } else if (error.status === 400) {
      this.problems.set(applyServerErrors(this.form, error));
    } else if (error.status === 429) {
      this.startWait(error.retryAfter ?? 30);
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
