import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const empty = (value: unknown) => value === null || value === undefined || value === '';

/** The backend's phone rule: `+`, then 10–14 digits, the first not 0. */
export const phoneValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  empty(control.value) || /^\+[1-9]\d{9,13}$/.test(String(control.value)) ? null : { phone: true };

/** The backend's password rule: 8+ characters with an uppercase letter, a digit and a symbol. */
export const passwordValidator: ValidatorFn = (control) => {
  const value = String(control.value ?? '');
  if (empty(control.value)) return null;
  return value.length >= 8 && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value)
    ? null
    : { password: true };
};

/** The backend's login rule: a letter first, then 2–49 letters, digits, `_` or `.` (so it never looks like an e-mail). */
export const loginValidator: ValidatorFn = (control) =>
  empty(control.value) || /^[A-Za-z][A-Za-z0-9_.]{2,49}$/.test(String(control.value))
    ? null
    : { login: true };

/** The two controls must hold the same value (password and its repeat). Put it on the group; the error lands on `other`. */
export function matchesValidator(name: string, other: string): ValidatorFn {
  return (group) => {
    const first = group.get(name);
    const second = group.get(other);
    if (!first || !second) return null;
    const mismatch = first.value !== second.value;
    const errors = second.errors ?? {};
    if (mismatch) second.setErrors({ ...errors, mismatch: true });
    else if (errors['mismatch']) {
      const rest = { ...errors };
      delete rest['mismatch'];
      second.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  };
}
