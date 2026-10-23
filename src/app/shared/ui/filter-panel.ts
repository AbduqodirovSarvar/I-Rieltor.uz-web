import { Component, input, output, signal } from '@angular/core';
import { TPipe } from '../../core/i18n/t.pipe';

/**
 * The frame of a filter form. On a wide screen it is always open; on a phone it hides behind a button (with the number of
 * active filters) so the list is not pushed off the screen. The filter controls themselves are projected.
 */
@Component({
  selector: 'app-filter-panel',
  imports: [TPipe],
  templateUrl: './filter-panel.html',
  styleUrl: './filter-panel.scss',
})
export class FilterPanel {
  readonly title = input.required<string>();
  /** How many filters are set (0 hides the clear button). */
  readonly active = input(0);
  readonly clear = output<void>();

  protected readonly open = signal(false);
}
