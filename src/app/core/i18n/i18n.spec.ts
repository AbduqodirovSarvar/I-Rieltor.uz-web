import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { I18n, langOfUrl, stripLang } from './i18n.service';
import { pluralForm } from './plural';
import { ru } from './ru';
import { uz } from './uz';
import { cyrillicDictionary } from './cyrillic';
import { en } from './en';

@Component({ template: '' })
class Blank {}

describe('dictionaries', () => {
  const others = { ru, en };

  for (const [name, dictionary] of Object.entries(others)) {
    it(`${name} has exactly the keys of Uzbek, none empty`, () => {
      expect(Object.keys(dictionary).sort()).toEqual(Object.keys(uz).sort());
      for (const [key, value] of Object.entries(dictionary)) expect(value, key).not.toBe('');
    });

    it(`${name} keeps the same {placeholders} as Uzbek`, () => {
      const names = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
      for (const key of Object.keys(uz) as (keyof typeof uz)[])
        expect(names(dictionary[key]), key).toEqual(names(uz[key]));
    });
  }

  it('English texts are English, not left in Uzbek (a few checks)', () => {
    expect(en['nav.catalog']).toBe('Catalog');
    expect(en['site.tagline']).toBe('Real estate auctions');
  });

  it('the Cyrillic dictionary has the same keys and placeholders, and no Latin letters in plain Uzbek words', () => {
    const cyrl = cyrillicDictionary(uz);
    expect(Object.keys(cyrl).sort()).toEqual(Object.keys(uz).sort());
    expect(cyrl['nav.catalog']).toBe('Каталог');
    for (const key of Object.keys(uz) as (keyof typeof uz)[]) {
      const names = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
      expect(names(cyrl[key]), key).toEqual(names(uz[key]));
    }
  });
});

describe('languages in addresses', () => {
  it('reads the language from the prefix, and strips it', () => {
    expect(langOfUrl('/katalog')).toBe('uz');
    expect(langOfUrl('/ru/katalog')).toBe('ru');
    expect(langOfUrl('/en')).toBe('en');
    expect(langOfUrl('/cyrl/obyekt/1?x=1')).toBe('cyrl');
    expect(langOfUrl('/english')).toBe('uz');
    expect(stripLang('/en/katalog?page=2')).toBe('/katalog?page=2');
    expect(stripLang('/cyrl')).toBe('/');
    expect(stripLang('/ru/')).toBe('/');
  });
});

describe('plural forms', () => {
  it('English has two forms, Uzbek and Cyrillic one', () => {
    expect([0, 1, 2, 5].map((n) => pluralForm('room|rooms', n, 'en'))).toEqual([
      'rooms',
      'room',
      'rooms',
      'rooms',
    ]);
    expect(pluralForm('xona', 3, 'uz')).toBe('xona');
    expect(pluralForm('xona', 3, 'cyrl')).toBe('xona');
  });

  const rooms = 'комната|комнаты|комнат';

  it('picks the Russian form by the number', () => {
    expect(
      [1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111].map((n) => pluralForm(rooms, n, 'ru')),
    ).toEqual([
      'комната',
      'комнаты',
      'комнаты',
      'комнат',
      'комнат',
      'комнат',
      'комнат',
      'комната',
      'комнаты',
      'комнат',
      'комната',
      'комнат',
    ]);
  });

  it('never changes the Uzbek word', () => {
    expect(pluralForm('xona', 5, 'uz')).toBe('xona');
  });
});

describe('addresses and language', () => {
  it('reads the language of an address and strips it', () => {
    expect(langOfUrl('/ru')).toBe('ru');
    expect(langOfUrl('/ru/katalog?page=2')).toBe('ru');
    expect(langOfUrl('/katalog')).toBe('uz');
    expect(langOfUrl('/rubric')).toBe('uz');
    expect(stripLang('/ru/katalog?page=2')).toBe('/katalog?page=2');
    expect(stripLang('/ru')).toBe('/');
    expect(stripLang('/katalog')).toBe('/katalog');
  });

  describe('I18n', () => {
    let i18n: I18n;
    let router: Router;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideRouter([{ path: '**', component: Blank }])],
      });
      i18n = TestBed.inject(I18n);
      router = TestBed.inject(Router);
    });

    it('follows the address: Uzbek by default, Russian under /ru, and sets <html lang>', async () => {
      await router.navigateByUrl('/katalog');
      TestBed.tick();
      expect(i18n.lang()).toBe('uz');
      expect(i18n.t('nav.home')).toBe('Bosh sahifa');
      expect(document.documentElement.lang).toBe('uz');

      await router.navigateByUrl('/ru/katalog');
      TestBed.tick();
      expect(i18n.lang()).toBe('ru');
      expect(i18n.t('nav.home')).toBe('Главная');
      expect(document.documentElement.lang).toBe('ru');
    });

    it('writes links inside the current language', async () => {
      expect(i18n.link('/katalog')).toBe('/katalog');
      await router.navigateByUrl('/ru');
      expect(i18n.link('/katalog')).toBe('/ru/katalog');
      expect(i18n.link('/')).toBe('/ru');
      expect(i18n.linkIn('uz', '/katalog')).toBe('/katalog');
    });

    it('fills placeholders, names enums, and shows a missing key as it is', () => {
      expect(i18n.t('card.lot', { number: '14' })).toBe('Lot 14');
      expect(i18n.enumLabel('AuctionStatus', 'ONGOING')).toBe('Savdo ketmoqda');
      expect(i18n.enumLabel('AuctionStatus', 'NEW_ONE')).toBe('NEW_ONE');
      expect(i18n.enumLabel('AuctionStatus', null)).toBe('');
      expect(i18n.t('nope.missing' as never)).toBe('nope.missing');
      expect(i18n.has('nav.home')).toBe(true);
      expect(i18n.has('Some title')).toBe(false);
    });
  });
});
