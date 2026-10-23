import { DOCUMENT } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { TPipe } from '../../core/i18n/t.pipe';

/** A button that appears after scrolling down a screen and brings the page back to the top. */
@Component({
  selector: 'app-back-to-top',
  imports: [TPipe],
  template: `
    @if (visible()) {
      <button
        type="button"
        class="btn btn-icon top"
        [attr.aria-label]="'nav.top' | t"
        (click)="toTop()"
      >
        <span aria-hidden="true">↑</span>
      </button>
    }
  `,
  styles: `
    .top {
      position: fixed;
      right: var(--s-4);
      bottom: var(--s-4);
      z-index: var(--z-header);
      box-shadow: var(--shadow-2);
    }
  `,
})
export class BackToTop {
  private readonly window = inject(DOCUMENT).defaultView;
  protected readonly visible = signal(false);

  @HostListener('window:scroll')
  protected onScroll(): void {
    this.visible.set((this.window?.scrollY ?? 0) > 600);
  }

  protected toTop(): void {
    this.window?.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
