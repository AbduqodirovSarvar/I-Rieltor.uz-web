import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { watchSession } from './core/auth/session-watcher';
import { TPipe } from './core/i18n/t.pipe';
import { ConfirmDialog } from './core/notify/confirm-dialog';
import { Toasts } from './core/notify/toasts';
import { BackToTop } from './shared/layout/back-to-top';
import { SiteFooter } from './shared/layout/site-footer';
import { SiteHeader } from './shared/layout/site-header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter, BackToTop, Toasts, ConfirmDialog, TPipe],
  templateUrl: './app.html',
})
export class App {
  constructor() {
    watchSession();
  }

  /**
   * The page has `<base href="/">`, so a plain `#main` link would leave the current page for the home page. Focus the content
   * here instead; the link stays a link for the time before the page is ready.
   */
  protected skipToContent(event: Event, main: HTMLElement): void {
    event.preventDefault();
    main.focus();
    main.scrollIntoView();
  }
}
