import { Component, input } from '@angular/core';

/** "Nothing here" with a way forward: a title, a line of text, and (projected) a button or link. */
@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty">
      <h2>{{ title() }}</h2>
      @if (text()) {
        <p class="muted">{{ text() }}</p>
      }
      <ng-content />
    </div>
  `,
  styles: `
    .empty {
      padding: var(--s-7) var(--s-4);
      text-align: center;
      border: 1px dashed var(--c-border);
      border-radius: var(--radius-lg);
    }
    h2 {
      font-size: var(--fs-xl);
    }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly text = input<string | null>(null);
}
