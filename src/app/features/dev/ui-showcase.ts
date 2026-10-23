import { Component, signal } from '@angular/core';

/** A page that shows every shared style in one place (development only: the route does not exist in the production build). */
@Component({
  selector: 'app-ui-showcase',
  templateUrl: './ui-showcase.html',
  styleUrl: './ui-showcase.scss',
})
export class UiShowcase {
  protected readonly theme = signal<'system' | 'light' | 'dark'>('system');

  protected setTheme(theme: 'system' | 'light' | 'dark'): void {
    this.theme.set(theme);
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }
}
