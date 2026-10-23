import { Component, input } from '@angular/core';
import { TPipe } from '../../core/i18n/t.pipe';

/**
 * A label, the control, a hint and an error message, tied together for assistive technology. The control is projected and
 * carries the same `id`:
 *
 * ```html
 * <app-field controlId="phone" [label]="..." [error]="phoneError()">
 *   <input id="phone" class="input" [attr.aria-invalid]="!!phoneError()" [attr.aria-describedby]="'phone-hint phone-error'" />
 * </app-field>
 * ```
 */
@Component({
  selector: 'app-field',
  imports: [TPipe],
  template: `
    <div class="field">
      <label [attr.for]="controlId()">
        {{ label() }}
        @if (optional()) {
          <span class="muted">({{ 'form.optional' | t }})</span>
        }
      </label>
      <ng-content />
      @if (hint()) {
        <span class="hint" [id]="controlId() + '-hint'">{{ hint() }}</span>
      }
      @if (error()) {
        <span class="error" [id]="controlId() + '-error'" role="alert">{{ error() }}</span>
      }
    </div>
  `,
})
export class FormField {
  /** The `id` of the projected control. */
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly optional = input(false);
}
