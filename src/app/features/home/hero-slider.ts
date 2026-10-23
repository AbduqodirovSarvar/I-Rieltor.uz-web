import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  HostListener,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicSlide } from '../../api/models';
import { injectFileUrl } from '../../core/http/file-url';
import { I18n } from '../../core/i18n/i18n.service';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';

const MIN_MS = 3000;
const MAX_MS = 30_000;

/** How long a slide stays: its own `durationMs`, kept within sensible limits (a 0 or 1 ms slide would flash by). */
export function slideDelay(durationMs: number | null | undefined): number {
  const ms = Number(durationMs);
  return Number.isFinite(ms) && ms > 0 ? Math.min(MAX_MS, Math.max(MIN_MS, ms)) : 6000;
}

/**
 * The slides on top of the home page. All slides are in the HTML (a search engine reads them), one is shown. Moving on its
 * own is optional and stoppable: it never starts for a person who asked their device for less motion, it pauses while the
 * pointer or the keyboard focus is inside, while the tab is hidden, and the pause button stops it for good.
 */
@Component({
  selector: 'app-hero-slider',
  imports: [RouterLink, TPipe, LinkPipe],
  templateUrl: './hero-slider.html',
  styleUrl: './hero-slider.scss',
})
export class HeroSlider {
  readonly slides = input.required<PublicSlide[]>();

  private readonly document = inject(DOCUMENT);
  private readonly fileUrl = injectFileUrl();
  private readonly destroyRef = inject(DestroyRef);
  protected readonly i18n = inject(I18n);

  protected readonly index = signal(0);
  /** The visitor pressed pause (or the device asks for reduced motion). */
  protected readonly stopped = signal(false);
  private hovering = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected readonly count = computed(() => this.slides().length);
  protected readonly current = computed(() =>
    Math.min(this.index(), Math.max(0, this.count() - 1)),
  );

  constructor() {
    afterNextRender(() => {
      const reduce = this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
      if (reduce?.matches) this.stopped.set(true);
      this.schedule();
      this.destroyRef.onDestroy(() => this.clear());
    });
  }

  protected src(slide: PublicSlide): string {
    return this.fileUrl(slide.image?.url);
  }

  protected go(i: number): void {
    const count = this.count();
    if (count === 0) return;
    this.index.set((i + count) % count);
    this.schedule();
  }

  protected toggle(): void {
    this.stopped.update((v) => !v);
    this.schedule();
  }

  protected hold(value: boolean): void {
    this.hovering = value;
    this.schedule();
  }

  @HostListener('document:visibilitychange')
  protected onVisibility(): void {
    this.schedule();
  }

  /** Arrow keys inside the slider move between slides. */
  protected onKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') this.go(this.current() + 1);
    else if (event.key === 'ArrowLeft') this.go(this.current() - 1);
  }

  /** (Re)starts the timer for the slide on screen, or leaves it stopped. */
  private schedule(): void {
    this.clear();
    if (this.stopped() || this.hovering || this.document.hidden || this.count() < 2) return;
    const slide = this.slides()[this.current()];
    this.timer = setTimeout(() => this.go(this.current() + 1), slideDelay(slide?.durationMs));
  }

  private clear(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}
