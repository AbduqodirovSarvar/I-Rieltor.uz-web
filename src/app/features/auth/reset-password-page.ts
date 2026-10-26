import { Component, afterNextRender, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { applyServerErrors } from '../../core/forms/server-errors';
import { matchesValidator, passwordValidator } from '../../core/forms/validators';
import { ApiClient } from '../../core/http/api-client';
import { ApiError } from '../../core/http/api-error';
import { I18n } from '../../core/i18n/i18n.service';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { Notify } from '../../core/notify/notify.service';
import { Seo } from '../../core/seo/seo.service';
import { PasswordInput } from '../../shared/ui/password-input';

/**
 * The page the e-mailed reset link opens (`/parolni-tiklash?token=...`). The token is taken into memory and removed from the
 * address bar and the history at once; it is sent only with the new password. A link that is wrong, old or already used
 * says so and offers to ask for a new one.
 */
@Component({
  selector: 'app-reset-password-page',
  imports: [PasswordInput, ReactiveFormsModule, RouterLink, TPipe, LinkPipe],
  templateUrl: './reset-password-page.html',
  styleUrl: './auth-pages.scss',
})
export class ResetPasswordPage {
  readonly token = input<string | undefined>();

  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);
  private readonly notify = inject(Notify);

  protected readonly form = new FormGroup(
    {
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, passwordValidator, Validators.maxLength(128)],
      }),
      confirm: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: [matchesValidator('password', 'confirm')] },
  );

  protected readonly kept = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly linkBad = signal(false);
  protected readonly problems = signal<string[]>([]);

  constructor() {
    inject(Seo).set({ title: this.i18n.t('auth.reset.title'), noindex: true });
    afterNextRender(() => {
      const token = this.token();
      if (!token) return;
      this.kept.set(token);
      void this.router.navigate([], { queryParams: { token: null }, replaceUrl: true });
    });
  }

  protected async submit(): Promise<void> {
    this.problems.set([]);
    const token = this.kept();
    if (!token || this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const value = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.api.post<boolean>(
          'api/Auth/reset-password',
          { token, newPassword: value.password, confirmPassword: value.confirm },
          { skipAuth: true },
        ),
      );
      this.notify.success(this.i18n.t('auth.reset.done'));
      await this.router.navigateByUrl(this.i18n.link('/kirish'));
    } catch (error) {
      this.fail(error);
    } finally {
      this.submitting.set(false);
    }
  }

  private fail(error: unknown): void {
    if (!(error instanceof ApiError)) return void this.notify.error(error);
    if (error.status === 400) {
      // A 400 with field lines is a password rule; one without them means the link itself is no good.
      if (Object.keys(error.fieldErrors()).length === 0) this.linkBad.set(true);
      else this.problems.set(applyServerErrors(this.form, error, { newPassword: 'password' }));
    } else {
      this.notify.error(error);
    }
  }
}
