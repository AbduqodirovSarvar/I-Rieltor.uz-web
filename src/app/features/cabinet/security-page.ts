import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { TokenResponse } from '../../core/auth/session';
import { fieldError } from '../../core/forms/field-error';
import { applyServerErrors } from '../../core/forms/server-errors';
import { matchesValidator, passwordValidator } from '../../core/forms/validators';
import { ApiClient } from '../../core/http/api-client';
import { ApiError } from '../../core/http/api-error';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { Notify } from '../../core/notify/notify.service';
import { Seo } from '../../core/seo/seo.service';
import { FormField } from '../../shared/ui/form-field';
import { PasswordInput } from '../../shared/ui/password-input';

/**
 * Password and e-mail. Both need the person to prove it is them (the current password, or a link sent to the new address),
 * so a stolen session alone cannot take the account over. A password change signs every other device out; this one gets
 * the new tokens and stays signed in.
 */
@Component({
  selector: 'app-security-page',
  imports: [FormField, PasswordInput, ReactiveFormsModule, TPipe],
  templateUrl: './security-page.html',
  styleUrl: './cabinet-pages.scss',
})
export class SecurityPage {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18n);
  private readonly notify = inject(Notify);

  protected readonly passwordForm = new FormGroup(
    {
      current: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(128)],
      }),
      next: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, passwordValidator, Validators.maxLength(128)],
      }),
      confirm: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: [matchesValidator('next', 'confirm')] },
  );
  protected readonly emailForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(150)],
    }),
  });

  protected readonly changingPassword = signal(false);
  protected readonly wrongCurrent = signal(false);
  protected readonly passwordProblems = signal<string[]>([]);
  protected readonly sendingEmail = signal(false);

  constructor() {
    inject(Seo).set({ title: this.i18n.t('security.title'), noindex: true });
  }

  protected emailError(): string | null {
    return fieldError(this.emailForm.controls.email, this.i18n);
  }

  protected async changePassword(): Promise<void> {
    this.wrongCurrent.set(false);
    this.passwordProblems.set([]);
    const form = this.passwordForm;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const { current, next } = form.getRawValue();
    if (current === next) {
      form.controls.next.setErrors({ same: true });
      form.controls.next.markAsTouched();
      return;
    }
    if (this.changingPassword()) return;
    this.changingPassword.set(true);
    try {
      const token = await firstValueFrom(
        this.api.put<TokenResponse>('api/Auth/me/password', {
          currentPassword: current,
          newPassword: next,
        }),
      );
      // The old refresh token was revoked with the other sessions: keep the new pair, or this device is signed out too.
      this.auth.startSession(token);
      form.reset();
      this.notify.success(this.i18n.t('security.changed'));
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        if (/current password/i.test(error.message)) this.wrongCurrent.set(true);
        else this.passwordProblems.set(applyServerErrors(form, error, { NewPassword: 'next' }));
      } else {
        this.notify.error(error);
      }
    } finally {
      this.changingPassword.set(false);
    }
  }

  protected async changeEmail(): Promise<void> {
    const form = this.emailForm;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    if (this.sendingEmail()) return;
    this.sendingEmail.set(true);
    try {
      await firstValueFrom(
        this.api.put<boolean>('api/Auth/me/email', { email: form.getRawValue().email.trim() }),
      );
      this.notify.success(this.i18n.t('security.emailSent'));
      form.reset();
      await firstValueFrom(this.auth.loadProfile());
    } catch (error) {
      this.notify.error(error);
    } finally {
      this.sendingEmail.set(false);
    }
  }
}
