import { Component, input } from '@angular/core';
import { MoneyPipe } from '../../core/format/format';

/** A labelled amount: a small caption over a large number. */
@Component({
  selector: 'app-price',
  imports: [MoneyPipe],
  template: `
    <span class="caption muted">{{ label() }}</span>
    <strong class="amount num" [class.large]="large()">{{ amount() | money }}</strong>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
    }
    .caption {
      font-size: var(--fs-sm);
    }
    .amount {
      font-size: var(--fs-md);
      font-weight: 700;
    }
    .amount.large {
      font-size: var(--fs-2xl);
    }
  `,
})
export class Price {
  readonly label = input.required<string>();
  readonly amount = input.required<number | null | undefined>();
  readonly large = input(false);
}
