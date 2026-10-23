import { Component, computed, input } from '@angular/core';
import { TPipe } from '../../core/i18n/t.pipe';

/**
 * Grey placeholders in the shape of cards while a list loads: the page does not jump when the real cards arrive.
 * Screen readers hear "Loading…" once instead of a pile of empty boxes.
 */
@Component({
  selector: 'app-skeleton-cards',
  imports: [TPipe],
  template: `
    <p class="visually-hidden" role="status">{{ 'common.loading' | t }}</p>
    <div class="grid" aria-hidden="true">
      @for (n of slots(); track n) {
        <div class="card">
          <div class="block image"></div>
          <div class="card-body">
            <div class="block line wide"></div>
            <div class="block line"></div>
            <div class="block line short"></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .block {
      background: var(--c-surface-2);
      border-radius: var(--radius);
      animation: pulse 1.4s ease-in-out infinite;
    }
    .image {
      aspect-ratio: 4 / 3;
      border-radius: 0;
    }
    .line {
      height: 1rem;
      margin-bottom: var(--s-2);
    }
    .wide {
      width: 85%;
    }
    .short {
      width: 45%;
    }
    @keyframes pulse {
      50% {
        opacity: 0.55;
      }
    }
  `,
})
export class SkeletonCards {
  readonly count = input(6);
  protected readonly slots = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
