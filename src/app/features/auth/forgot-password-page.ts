import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { fieldError } from '../../core/forms/field-error';
import { ApiClient } from '../../core/http/api-client';
import { ApiError } from '../../core/http/api-error';
import { I18n } from '../../core/i18n/i18n.service';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { Notify } from '../../core/notify/notify.service';
import { Seo } from '../../core/seo/seo.service';
import { EimzoReset } from './eimzo-reset';
import { FormField } from '../../shared/ui/form-field';

/**
 * Asks for a password-reset link by e-mail. The page says the same thing whether or not the address has an account (so does
 * the backend): it never reveals who is registered. Accounts made with E-IMZO only have no password to reset here.
 */
@Component({
  selector: 'app-forgot-password-page',
  imports: [EimzoReset, FormField, ReactiveFormsModule, RouterLink, TPipe, LinkPipe],
  templateUrl: './forgot-password-page.html',
  styleUrl: './auth-pages.scss',
})
export class ForgotPasswordPage {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18n);
  private readonly notify = inject(Notify);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(150)],
    }),
  });
  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly wait = signal(0);
  protected readonly canSubmit = computed(() => !this.submitting() && this.wait() === 0);

  constructor() {
    inject(Seo).set({ title: this.i18n.t('auth.forgot.title'), noindex: true });
  }

  protected error(): string | null {
    return fieldError(this.form.controls.email, this.i18n);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    try {
      await firstValueFrom(
        this.api.post<boolean>(
          'api/Auth/forgot-password',
          { email: this.form.controls.email.value.trim() },
          { skipAuth: true },
        ),
      );
      this.sent.set(true);
      // Asking again at once would only be refused: the next request waits a little.
      this.startWait(60);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) this.startWait(error.retryAfter ?? 30);
      else this.notify.error(error);
    } finally {
      this.submitting.set(false);
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
