import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'irieltor.web.theme';
const ORDER: ThemeMode[] = ['system', 'light', 'dark'];

/**
 * Light, dark, or whatever the device uses. The choice is kept in this browser; the server cannot know it, so the first paint
 * follows the device and the saved choice is applied as soon as the page runs.
 */
@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly document = inject(DOCUMENT);
  private readonly state = signal<ThemeMode>(this.read());

  readonly mode = this.state.asReadonly();

  constructor() {
    effect(() => {
      const root = this.document.documentElement;
      const mode = this.state();
      if (mode === 'system') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', mode);
    });
  }

  set(mode: ThemeMode): void {
    this.state.set(mode);
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage blocked: the choice lasts until the page is closed.
    }
  }

  /** The next mode in the order system → light → dark. */
  next(): void {
    this.set(ORDER[(ORDER.indexOf(this.state()) + 1) % ORDER.length]);
  }

  private read(): ThemeMode {
    try {
      const value = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : 'system';
    } catch {
      return 'system';
    }
  }
}
