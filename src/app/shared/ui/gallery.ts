import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { TPipe } from '../../core/i18n/t.pipe';

export interface GalleryItem {
  url: string;
  alt: string;
  kind: 'image' | 'video';
}

/** A swipe shorter than this is a tap. */
const SWIPE_PX = 50;

/**
 * The photos and videos of an object: one large item, a strip of small ones, and a full-screen view (a native modal
 * `<dialog>`: focus stays inside, Escape closes). Left and right arrow keys and a swipe move between items.
 */
@Component({
  selector: 'app-gallery',
  imports: [TPipe],
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss',
})
export class Gallery {
  readonly items = input.required<GalleryItem[]>();

  protected readonly index = signal(0);
  protected readonly zoomed = signal(false);
  protected readonly current = computed(() => this.items()[this.index()] ?? null);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private touchStartX: number | null = null;

  constructor() {
    effect(() => {
      const element = this.dialog()?.nativeElement;
      if (!element) return;
      if (this.zoomed() && !element.open) element.showModal?.();
      if (!this.zoomed() && element.open) element.close?.();
    });
    // A new list of items starts again from the first.
    effect(() => {
      this.items();
      this.index.set(0);
    });
  }

  protected select(i: number): void {
    this.index.set(i);
  }

  protected step(direction: 1 | -1): void {
    const count = this.items().length;
    if (count > 0) this.index.set((this.index() + direction + count) % count);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKey(event: KeyboardEvent): void {
    if (!this.zoomed()) return;
    if (event.key === 'ArrowRight') this.step(1);
    else if (event.key === 'ArrowLeft') this.step(-1);
  }

  protected onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0]?.clientX ?? null;
  }

  protected onTouchEnd(event: TouchEvent): void {
    const start = this.touchStartX;
    this.touchStartX = null;
    if (start === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) >= SWIPE_PX) this.step(delta < 0 ? 1 : -1);
  }

  /** The dialog was closed by Escape or the backdrop: keep our state in line. */
  protected onClose(): void {
    this.zoomed.set(false);
  }
}
