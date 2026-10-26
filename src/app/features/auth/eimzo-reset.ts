import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EimzoError, EimzoErrorCode, EimzoKey } from '../../core/eimzo/eimzo.provider';
import { EimzoService } from '../../core/eimzo/eimzo.service';
import { applyServerErrors } from '../../core/forms/server-errors';
import { matchesValidator, passwordValidator } from '../../core/forms/validators';
import { ApiClient } from '../../core/http/api-client';
import { ApiError } from '../../core/http/api-error';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { TextKey } from '../../core/i18n/uz';
import { Notify } from '../../core/notify/notify.service';
import { EimzoKeyPicker, eimzoErrorText } from '../../shared/ui/eimzo-key-picker';
import { PasswordInput } from '../../shared/ui/password-input';

/**
 * A new password for an account with a connected E-IMZO key, without e-mail: the person signs a one-time challenge with the
 * key and the backend finds the account by the key's identifier.
 */
@Component({
  selector: 'app-eimzo-reset',
  imports: [EimzoKeyPicker, PasswordInput, ReactiveFormsModule, TPipe],
  templateUrl: './eimzo-reset.html',
})
export class EimzoReset {
  private readonly eimzo = inject(EimzoService);
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

  protected readonly key = signal<EimzoKey | null>(null);
  /** E-IMZO is not set up on this site: the form is not shown. */
  protected readonly unavailable = signal(false);
  protected readonly working = signal(false);
  protected readonly message = signal<TextKey | null>(null);
  protected readonly problems = signal<string[]>([]);

  protected onFailed(code: EimzoErrorCode): void {
    if (code === 'library-missing') this.unavailable.set(true);
  }

  protected async submit(): Promise<void> {
    this.message.set(null);
    this.problems.set([]);
    const key = this.key();
    if (this.working()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!key) {
      this.message.set('eimzo.err.pickKey');
      return;
    }
    this.working.set(true);
    const value = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.api.post<boolean>(
          'api/Auth/reset-password-via-eimzo',
          {
            signedData: await this.eimzo.signChallenge(key),
            newPassword: value.password,
            confirmPassword: value.confirm,
          },
          { skipAuth: true },
        ),
      );
      this.notify.success(this.i18n.t('eimzo.reset.done'));
      await this.router.navigateByUrl(this.i18n.link('/kirish'));
    } catch (error) {
      this.fail(error);
    } finally {
      this.working.set(false);
    }
  }

  private fail(error: unknown): void {
    if (error instanceof EimzoError) return void this.message.set(eimzoErrorText(error));
    if (error instanceof ApiError && (error.status === 404 || error.status === 401))
      return void this.message.set('eimzo.reset.notRegistered');
    if (error instanceof ApiError && error.status === 400) {
      return void this.problems.set(
        applyServerErrors(this.form, error, {
          newPassword: 'password',
          confirmPassword: 'confirm',
        }),
      );
    }
    this.notify.error(error);
  }
}
