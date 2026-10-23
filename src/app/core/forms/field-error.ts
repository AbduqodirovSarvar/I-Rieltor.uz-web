import { AbstractControl } from '@angular/forms';
import { I18n } from '../i18n/i18n.service';

/**
 * The message to show under a field, in the person's language, or `null` while there is nothing to say. Errors appear after
 * the person has touched the field (or tried to submit), not while they are still typing the first character.
 */
export function fieldError(control: AbstractControl | null, i18n: I18n): string | null {
  if (!control || !control.errors || !(control.touched || control.dirty)) return null;
  const errors = control.errors;
  if (errors['required']) return i18n.t('auth.err.required');
  if (errors['email']) return i18n.t('auth.err.email');
  if (errors['login']) return i18n.t('auth.err.login');
  if (errors['phone']) return i18n.t('auth.err.phone');
  if (errors['password']) return i18n.t('auth.err.password');
  if (errors['mismatch']) return i18n.t('auth.err.mismatch');
  if (errors['same']) return i18n.t('auth.err.same');
  if (errors['maxlength']) return i18n.t('auth.err.max');
  const server = errors['server'];
  return Array.isArray(server) && typeof server[0] === 'string' ? server[0] : null;
}
