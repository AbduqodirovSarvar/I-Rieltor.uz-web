import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { I18n, stripLang } from '../../core/i18n/i18n.service';
import { HTML_LANG, LANGS, LANG_NAME } from '../../core/i18n/plural';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { Hydrated } from '../../core/layout/hydrated';
import { Theme, ThemeMode } from '../../core/layout/theme.service';
import { TextKey } from '../../core/i18n/uz';

const THEME_KEYS: Record<ThemeMode, TextKey> = {
  light: 'theme.light',
  dark: 'theme.dark',
};

/** Logo, main menu, language, theme and the sign-in / cabinet area. On a phone the menu opens from a button. */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, TPipe, LinkPipe],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})
export class SiteHeader {
  protected readonly i18n = inject(I18n);
  protected readonly theme = inject(Theme);
  private readonly document = inject(DOCUMENT);
  protected readonly auth = inject(AuthService);
  protected readonly hydrated = inject(Hydrated);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** The same page in each language (the current one included, it is the selected entry of the list). */
  protected readonly languages = computed(() =>
    LANGS.map((lang) => ({
      code: HTML_LANG[lang],
      name: LANG_NAME[lang],
      selected: lang === this.i18n.lang(),
      href: this.i18n.linkIn(lang, stripLang(this.url())),
    })),
  );

  /** A language is a different address, so choosing one loads that page. */
  protected changeLanguage(select: HTMLSelectElement): void {
    if (select.value) this.document.defaultView?.location.assign(select.value);
  }

  protected readonly themeKey = computed<TextKey>(() => THEME_KEYS[this.theme.mode()]);

  protected readonly links = [
    { path: '/', text: 'nav.home' as const, exact: true },
    { path: '/katalog', text: 'nav.catalog' as const, exact: false },
    { path: '/biz-haqida', text: 'nav.about' as const, exact: false },
  ];

  constructor() {
    // A tap on a link (or any navigation) closes the phone menu.
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  /** The header search opens the catalog with the words typed; an empty search opens the plain catalog. */
  protected search(event: Event, input: HTMLInputElement): void {
    event.preventDefault();
    const q = input.value.trim();
    void this.router.navigate([this.i18n.link('/katalog')], { queryParams: q ? { q } : {} });
    input.value = '';
    this.menuOpen.set(false);
  }

  protected signOut(): void {
    this.auth.signOut().subscribe(() => void this.router.navigateByUrl(this.i18n.link('/')));
  }
}
