import { Injectable, Injector, inject } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18n } from '../i18n/i18n.service';
import { Seo } from './seo.service';

/**
 * A route that says `title: 'nav.catalog'` gets its title (in the language of the page), description and the rest of the
 * head from one place. Pages with data of their own (an object, an auction) set their head with {@link Seo} instead.
 */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  // The router creates this strategy, and Seo and I18n need the router: they are looked up when a navigation ends, not now.
  private readonly injector = inject(Injector);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    if (title === undefined) return;
    const i18n = this.injector.get(I18n);
    const seo = this.injector.get(Seo);
    const text = i18n.has(title) ? i18n.t(title) : title;
    // The home page's title is the site name alone.
    const isHome = i18n.has(title) && title === 'nav.home';
    seo.set({ title: isHome ? '' : text, currentUrl: snapshot.url });
  }
}
