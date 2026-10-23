import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { I18n, langOfUrl, stripLang } from './i18n.service';
import { pluralForm } from './plural';
import { ru } from './ru';
import { uz } from './uz';

@Component({ template: '' })
class Blank {}

describe('dictionaries', () => {
  it('Russian has exactly the keys of Uzbek, none empty', () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(uz).sort());
    for (const [key, value] of Object.entries({ ...uz, ...ru })) expect(value, key).not.toBe('');
  });

  it('keeps the same {placeholders} in both languages', () => {
    const names = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(uz) as (keyof typeof uz)[])
      expect(names(ru[key]), key).toEqual(names(uz[key]));
  });
});

describe('plural forms', () => {
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
