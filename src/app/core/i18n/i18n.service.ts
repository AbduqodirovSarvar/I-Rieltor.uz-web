import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { cyrillicDictionary } from './cyrillic';
import { en } from './en';
import { HTML_LANG, LANGS, LANG_PREFIX, Lang, pluralForm } from './plural';
import { ru } from './ru';
import { Dictionary, TextKey, uz } from './uz';

/** Uzbek in Cyrillic is made from the Latin text (see `cyrillic.ts`), so the two scripts cannot drift apart. */
const DICTIONARIES: Record<Lang, Dictionary> = { uz, ru, en, cyrl: cyrillicDictionary(uz) };

/** The other languages live under their prefix (`/ru`, `/en`, `/cyrl`); Uzbek (the main language) has none. */
const PREFIXED = LANGS.filter((lang) => LANG_PREFIX[lang] !== '');

/** The language a URL is written in. */
export function langOfUrl(url: string): Lang {
  const path = url.split(/[?#]/)[0];
  return (
    PREFIXED.find(
      (lang) => path === LANG_PREFIX[lang] || path.startsWith(`${LANG_PREFIX[lang]}/`),
    ) ?? 'uz'
  );
}

/** `/ru/katalog?page=2` → `/katalog?page=2`. */
export function stripLang(url: string): string {
  const lang = langOfUrl(url);
  if (lang === 'uz') return url;
  return url.slice(LANG_PREFIX[lang].length) || '/';
}

/**
 * The language of the page comes from the address (so a search engine and a shared link both get the same language and
 * the server renders the right one). Texts are looked up in the dictionary of that language; links are written with
 * {@link link} so they stay inside it.
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  private readonly current = signal<Lang>('uz');
  readonly lang = this.current.asReadonly();
  readonly languages = LANGS;

  constructor() {
    // The language is set when navigation starts, so the new page is built in it from its first render.
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) this.current.set(langOfUrl(event.url));
    });
    effect(() => this.document.documentElement.setAttribute('lang', HTML_LANG[this.current()]));
  }

  /** A text of the current language; `{name}` placeholders are filled from `params`. A missing key shows itself. */
  t(key: TextKey, params?: Record<string, string | number>): string {
    return fill(DICTIONARIES[this.current()][key] ?? key, params);
  }

  /** A text whose word depends on a number (`unit.rooms` for 3 → "комнаты"). */
  plural(key: TextKey, n: number): string {
    return pluralForm(DICTIONARIES[this.current()][key] ?? key, n, this.current());
  }

  /** True when the key is a text of the dictionary (a route title may be a key or already a finished title). */
  has(key: string): key is TextKey {
    return key in uz;
  }

  /** The label of a backend enum value; an unknown value is shown as it is. */
  enumLabel(name: string, value: string | null | undefined): string {
    if (!value) return '';
    const key = `enum.${name}.${value}`;
    const text = (DICTIONARIES[this.current()] as Record<string, string>)[key];
    return text ?? value;
  }

  /** An internal path in the current language: `/katalog` → `/ru/katalog` on the Russian side, `/en/katalog` on the English one. */
  link(path: string): string {
    return this.linkIn(this.current(), path);
  }

  linkIn(lang: Lang, path: string): string {
    const clean = path.startsWith('/') ? path : `/${path}`;
    const prefix = LANG_PREFIX[lang];
    if (!prefix) return clean;
    return clean === '/' ? prefix : `${prefix}${clean}`;
  }
}

function fill(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
