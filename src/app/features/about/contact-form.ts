import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { fieldError } from '../../core/forms/field-error';
import { applyServerErrors } from '../../core/forms/server-errors';
import { phoneValidator } from '../../core/forms/validators';
import { ApiClient } from '../../core/http/api-client';
import { ApiError } from '../../core/http/api-error';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { Notify } from '../../core/notify/notify.service';
import { FormField } from '../../shared/ui/form-field';

type Field = 'name' | 'phone' | 'email' | 'message';

/** A way to answer is needed: a phone number or an e-mail, at least one. */
function contactNeeded(group: AbstractControl): ValidationErrors | null {
  const value = group.value as { phone: string; email: string };
  return value.phone.trim() || value.email.trim() ? null : { contact: true };
}

/**
 * The contact form: name, a phone or an e-mail, the message. It carries one more field that people never see (a trap for
 * robots): if it is filled in, the server pretends all is well and sends nothing.
 */
@Component({
  selector: 'app-contact-form',
  imports: [FormField, ReactiveFormsModule, TPipe],
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.scss',
})
export class ContactForm {
  private readonly api = inject(ApiClient);
  private readonly i18n = inject(I18n);
  private readonly notify = inject(Notify);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = new FormGroup(
    {
      name: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      phone: new FormControl('', { nonNullable: true, validators: [phoneValidator] }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.email, Validators.maxLength(150)],
      }),
      message: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(10), Validators.maxLength(2000)],
      }),
      website: new FormControl('', { nonNullable: true }),
    },
    { validators: [contactNeeded] },
  );

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly needContact = signal(false);
  protected readonly wait = signal(0);
  protected readonly canSubmit = computed(() => !this.submitting() && this.wait() === 0);

  protected error(name: Field): string | null {
    return fieldError(this.form.controls[name], this.i18n);
  }

  protected async submit(): Promise<void> {
    this.sent.set(false);
    this.needContact.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.needContact.set(!!this.form.errors?.['contact']);
      return;
    }
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    const value = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.api.post<boolean>(
          'api/Contact',
          {
            name: value.name.trim(),
            message: value.message.trim(),
            website: value.website,
            // Optional values are left out when empty, not sent as empty text.
            ...(value.phone.trim() ? { phone: value.phone.trim() } : {}),
            ...(value.email.trim() ? { email: value.email.trim() } : {}),
          },
          { skipAuth: true },
        ),
      );
      this.sent.set(true);
      this.form.reset();
    } catch (error) {
      this.fail(error);
    } finally {
      this.submitting.set(false);
    }
  }

  private fail(error: unknown): void {
    if (!(error instanceof ApiError)) return void this.notify.error(error);
    if (error.status === 429) {
      this.startWait(error.retryAfter ?? 60);
    } else if (error.status === 400) {
      const rest = applyServerErrors(this.form, error);
      if (rest.length) this.notify.error(error);
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
