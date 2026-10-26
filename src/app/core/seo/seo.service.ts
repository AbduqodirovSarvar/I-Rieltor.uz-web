import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { I18n, stripLang } from '../i18n/i18n.service';
import { LANGS } from '../i18n/plural';

export interface PageMeta {
  /** The page's own title; the site name is added after it. Empty for the home page (the site name alone). */
  title: string;
  description?: string | null;
  /** Absolute or site-relative address of the picture a link preview shows. */
  image?: string | null;
  type?: 'website' | 'article';
  /** Keeps the page out of search results (private and filtered pages). */
  noindex?: boolean;
  /** The one address search engines should index for this content (the catalog without its filters, for example). */
  canonicalPath?: string;
  /** The address being shown, when the router has not published it yet (the title strategy runs during navigation). */
  currentUrl?: string;
  /** Structured data (schema.org) of the page. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/** Shown in link previews when a page has no picture of its own. */
export const DEFAULT_SHARE_IMAGE = '/og-default.png';

const LOCALES = { uz: 'uz_UZ', ru: 'ru_RU' } as const;

/**
 * Everything a search engine or a link preview reads from the page head: title, description, canonical address, the same
 * page in the other language (`hreflang`), Open Graph and Twitter cards, and JSON-LD. It runs on the server too, so the
 * HTML a crawler receives already has all of it.
 */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);

  /** `https://i-rieltor.uz` + path. */
  absolute(path: string): string {
    return /^https?:\/\//i.test(path) ? path : `${environment.siteUrl}${path}`;
  }

  set(page: PageMeta): void {
    const name = this.i18n.t('site.name');
    const full = page.title ? `${page.title} | ${name}` : `${name}: ${this.i18n.t('site.tagline')}`;
    const description = page.description || this.i18n.t('site.description');
    const type = page.type ?? 'website';
    const lang = this.i18n.lang();
    const neutralPath = this.neutralPath(page.canonicalPath, page.currentUrl);
    const url = this.absolute(this.i18n.link(neutralPath));

    this.title.setTitle(full);
    this.setName('description', description);
    this.setName('robots', page.noindex ? 'noindex, nofollow' : 'index, follow');
    this.setProperty('og:title', full);
    this.setProperty('og:description', description);
    this.setProperty('og:type', type);
    this.setProperty('og:url', url);
    this.setProperty('og:site_name', name);
    this.setProperty('og:locale', LOCALES[lang]);
    const image = this.absolute(page.image || DEFAULT_SHARE_IMAGE);
    this.setName('twitter:card', 'summary_large_image');
    this.setName('twitter:title', full);
    this.setName('twitter:description', description);
    this.setProperty('og:image', image);
    this.setName('twitter:image', image);

    this.setLink('canonical', url);
    this.setAlternates(neutralPath);
    this.setJsonLd(page.jsonLd);
  }

  /** The page's address without the language prefix and without the query string. */
  private neutralPath(override?: string, currentUrl?: string): string {
    const path = override ?? stripLang(currentUrl ?? this.router.url).split(/[?#]/)[0];
    return path || '/';
  }

  private setAlternates(neutralPath: string): void {
    this.removeAll('link[rel="alternate"][hreflang]');
    for (const lang of LANGS) {
      this.addLink('alternate', this.absolute(this.i18n.linkIn(lang, neutralPath)), lang);
    }
    this.addLink('alternate', this.absolute(this.i18n.linkIn('uz', neutralPath)), 'x-default');
  }

  private setJsonLd(data: PageMeta['jsonLd']): void {
    this.removeAll('script[data-seo-jsonld]');
    if (!data) return;
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-jsonld', '');
    // `<` is escaped so that no text in the data can close the script element.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    this.document.head.appendChild(script);
  }

  private setName(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private setProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content });
  }

  private setLink(rel: string, href: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', rel);
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private addLink(rel: string, href: string, hreflang: string): void {
    const link = this.document.createElement('link');
    link.setAttribute('rel', rel);
    link.setAttribute('hreflang', hreflang);
    link.setAttribute('href', href);
    this.document.head.appendChild(link);
  }

  private removeAll(selector: string): void {
    this.document.head.querySelectorAll(selector).forEach((element) => element.remove());
  }
}
