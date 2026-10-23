import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService, CurrentUser } from '../../core/auth/auth.service';
import { fieldError } from '../../core/forms/field-error';
import { applyServerErrors } from '../../core/forms/server-errors';
import { phoneValidator } from '../../core/forms/validators';
import { formatPhone, maskIdentifier } from '../../core/format/format';
import { ApiClient } from '../../core/http/api-client';
import { ApiError } from '../../core/http/api-error';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { TextKey } from '../../core/i18n/uz';
import { Notify } from '../../core/notify/notify.service';
import { Seo } from '../../core/seo/seo.service';
import { FormField } from '../../shared/ui/form-field';

/** What the form sends: only the fields the person changed; an empty text clears a phone or the address. */
export function profileChanges(
  user: Pick<CurrentUser, 'fullName' | 'phone' | 'secondaryPhone' | 'address'>,
  form: { fullName: string; phone: string; secondaryPhone: string; address: string },
  canRename: boolean,
): Record<string, string> {
  const changes: Record<string, string> = {};
  const was = (v: string | null | undefined) => (v ?? '').trim();
  const now = (v: string) => v.trim();
  if (canRename && now(form.fullName) !== was(user.fullName))
    changes['fullName'] = now(form.fullName);
  if (now(form.phone) !== was(user.phone)) changes['phone'] = now(form.phone);
  if (now(form.secondaryPhone) !== was(user.secondaryPhone))
    changes['secondaryPhone'] = now(form.secondaryPhone);
  if (now(form.address) !== was(user.address)) changes['address'] = now(form.address);
  return changes;
}

const TYPE_TEXT: Record<string, TextKey> = {
  NONE: 'profile.type.NONE',
  INDIVIDUAL: 'profile.type.INDIVIDUAL',
  LEGAL: 'profile.type.LEGAL',
};

/**
 * The person's own details. The name, phones and address can be edited (the name not for an account bound to an E-IMZO key:
 * it comes from the key). The identity from the key (type, PINFL/INN, organisation) is shown, masked, and not editable.
 */
@Component({
  selector: 'app-profile-page',
  imports: [FormField, ReactiveFormsModule, TPipe],
  templateUrl: './profile-page.html',
  styleUrl: './cabinet-pages.scss',
})
export class ProfilePage {
  private readonly api = inject(ApiClient);
  protected readonly auth = inject(AuthService);
  private readonly i18n = inject(I18n);
  private readonly notify = inject(Notify);

  protected readonly form = new FormGroup({
    fullName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(300)],
    }),
    phone: new FormControl('', { nonNullable: true, validators: [phoneValidator] }),
    secondaryPhone: new FormControl('', { nonNullable: true, validators: [phoneValidator] }),
    address: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(300)] }),
  });

  protected readonly user = this.auth.currentUser;
  protected readonly submitting = signal(false);
  protected readonly problems = signal<string[]>([]);
  protected readonly canRename = computed(() => !this.auth.isVerified());
  protected readonly typeText = computed(() => TYPE_TEXT[this.user()?.type ?? 'NONE']);
  protected readonly identifier = computed(() => maskIdentifier(this.user()?.innpinfl));
  protected readonly formatPhone = formatPhone;

  constructor() {
    inject(Seo).set({ title: this.i18n.t('profile.title'), noindex: true });
    if (!this.auth.currentUser()) void firstValueFrom(this.auth.loadProfile());

    // Fill the form when the profile arrives (and again after a save).
    effect(() => {
      const user = this.user();
      if (!user) return;
      untracked(() => {
        this.form.reset({
          fullName: user.fullName ?? '',
          phone: user.phone ?? '',
          secondaryPhone: user.secondaryPhone ?? '',
          address: user.address ?? '',
        });
        if (!this.canRename()) this.form.controls.fullName.disable();
        else this.form.controls.fullName.enable();
      });
    });
  }

  protected error(name: 'fullName' | 'phone' | 'secondaryPhone' | 'address'): string | null {
    return fieldError(this.form.controls[name], this.i18n);
  }

  protected async save(): Promise<void> {
    this.problems.set([]);
    const user = this.user();
    if (!user) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const changes = profileChanges(user, this.form.getRawValue(), this.canRename());
    if (Object.keys(changes).length === 0) {
      this.notify.info(this.i18n.t('profile.nothingChanged'));
      return;
    }
    if (this.submitting()) return;
    this.submitting.set(true);
    try {
      const updated = await firstValueFrom(
        this.api.put<CurrentUser>('api/Auth/me/profile', changes),
      );
      this.auth.setUser(updated);
      this.notify.success(this.i18n.t('profile.saved'));
    } catch (error) {
      if (error instanceof ApiError && error.status === 400)
        this.problems.set(applyServerErrors(this.form, error));
      else this.notify.error(error);
    } finally {
      this.submitting.set(false);
    }
  }
}
