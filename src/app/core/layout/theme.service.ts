import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'irieltor.web.theme';

/**
 * Day or night. Until a choice is made the page follows the device (the style sheet does it, so the first paint is right
 * even from the server) and the button shows what the device uses; the choice is kept in this browser.
 */
@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly document = inject(DOCUMENT);
  /** What the visitor chose; `null` until then. */
  private readonly chosen = signal<ThemeMode | null>(this.read());
  private readonly device = signal<ThemeMode>(this.deviceMode());

  readonly mode = () => this.chosen() ?? this.device();

  constructor() {
    effect(() => {
      const root = this.document.documentElement;
      const mode = this.chosen();
      if (mode === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', mode);
    });
  }

  set(mode: ThemeMode): void {
    this.chosen.set(mode);
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage blocked: the choice lasts until the page is closed.
    }
  }

  /** The other mode: day → night, night → day. */
  next(): void {
    this.set(this.mode() === 'dark' ? 'light' : 'dark');
  }

  private read(): ThemeMode | null {
    try {
      const value = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  private deviceMode(): ThemeMode {
    const query = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
    return query?.matches ? 'dark' : 'light';
  }
}
