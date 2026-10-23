import { Component, computed, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { fieldError } from '../../core/forms/field-error';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';

/**
 * A password field with a show/hide button. The error appears under it, tied to the field for screen readers. The
 * `autocomplete` value tells the browser's password manager what the field is (`current-password` or `new-password`).
 */
@Component({
  selector: 'app-password-input',
  imports: [ReactiveFormsModule, TPipe],
  templateUrl: './password-input.html',
  styleUrl: './password-input.scss',
})
export class PasswordInput {
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly control = input.required<FormControl<string>>();
  readonly hint = input<string | null>(null);
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');

  private readonly i18n = inject(I18n);
  protected readonly shown = signal(false);

  /** Re-evaluated on every change detection: the control's state is not a signal. */
  protected error(): string | null {
    return fieldError(this.control(), this.i18n);
  }

  protected readonly describedBy = computed(
    () => `${this.hint() ? this.controlId() + '-hint ' : ''}${this.controlId()}-error`,
  );
}
