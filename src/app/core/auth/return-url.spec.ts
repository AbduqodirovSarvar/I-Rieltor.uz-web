import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { loginValidator, passwordValidator, phoneValidator } from '../forms/validators';
import { I18n } from '../i18n/i18n.service';
import { AuthService } from './auth.service';
import { safeReturnUrl } from './return-url';
import { isPersonalPath, watchSession } from './session-watcher';
import { TokenStore } from './token-store';
import { FormControl } from '@angular/forms';

describe('safeReturnUrl', () => {
  const fallback = '/kabinet';

  it('accepts a path of this site, with query and fragment', () => {
    expect(safeReturnUrl('/auksion/1', fallback)).toBe('/auksion/1');
    expect(safeReturnUrl('/ru/katalog?q=a&page=2#x', fallback)).toBe('/ru/katalog?q=a&page=2#x');
    expect(safeReturnUrl('/', fallback)).toBe('/');
  });

  it('refuses everything that could lead to another site', () => {
    for (const bad of [
      'https://evil.example/',
      'http://evil.example',
      '//evil.example',
      '/\\evil.example',
      '\\\\evil.example',
      'javascript:alert(1)',
      'data:text/html,x',
      'evil.example',
      '/ok\\evil',
      '/ok\nhttps://evil',
      '/a\u0000b',
      '',
      null,
      undefined,
      '/' + 'a'.repeat(2100),
    ])
      expect(safeReturnUrl(bad as string, fallback), String(bad)).toBe(fallback);
  });
});

describe('validators', () => {
  const run = (validator: typeof phoneValidator, value: string) =>
    validator(new FormControl(value));

  it('phone follows the backend rule', () => {
    expect(run(phoneValidator, '+998901234567')).toBeNull();
    expect(run(phoneValidator, '')).toBeNull();
    for (const bad of [
      '998901234567',
      '+0123456789012',
      '+99890',
      '+998 90 123',
      '+99890123456789012',
    ])
      expect(run(phoneValidator, bad), bad).toEqual({ phone: true });
  });

  it('password needs 8 characters, a capital, a digit and a symbol', () => {
    for (const good of ['Strong@123', 'short1!A'])
      expect(run(passwordValidator, good), good).toBeNull();
    for (const bad of ['short1!', 'alllower1!', 'NoDigits!!', 'NoSymbol123', 'Ab1!'])
      expect(run(passwordValidator, bad), bad).toEqual({ password: true });
  });

  it('login starts with a letter and has 3–50 allowed characters', () => {
    expect(run(loginValidator, 'ali_v.1')).toBeNull();
    expect(run(loginValidator, '')).toBeNull();
    for (const bad of ['1ali', 'al', 'a b', 'ali@x.uz', 'x'.repeat(51)])
      expect(run(loginValidator, bad), bad).toEqual({ login: true });
  });
});

@Component({ template: '' })
class Blank {}

describe('watchSession', () => {
  let router: Router;
  let store: TokenStore;

  @Component({ template: '', selector: 'app-watcher' })
  class Watcher {
    constructor() {
      watchSession();
    }
  }

  const session = {
    accessToken: 'a',
    refreshToken: 'r',
    accessTokenExpiration: new Date(Date.now() + 3_600_000).toISOString(),
    refreshTokenExpiration: new Date(Date.now() + 86_400_000).toISOString(),
    userId: 'u',
  };

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: Blank }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    TestBed.inject(I18n);
    router = TestBed.inject(Router);
    store = TestBed.inject(TokenStore);
    store.set(session);
    TestBed.createComponent(Watcher);
  });

  it('knows which addresses are personal, in both languages', () => {
    expect(isPersonalPath('/kabinet')).toBe(true);
    expect(isPersonalPath('/kabinet/profil?x=1')).toBe(true);
    expect(isPersonalPath('/ru/kabinet/hujjatlar')).toBe(true);
    expect(isPersonalPath('/katalog')).toBe(false);
    expect(isPersonalPath('/kabinetim')).toBe(false);
  });

  it('sends the person to sign in, with the page to return to, when the session ends on a personal page', async () => {
    await router.navigateByUrl('/kabinet/hujjatlar');
    TestBed.tick();
    store.clear();
    TestBed.tick();
    await new Promise((r) => setTimeout(r, 0));
    expect(router.url).toBe('/kirish?returnUrl=%2Fkabinet%2Fhujjatlar&reason=expired');
  });

  it('leaves public pages alone, and a sign-out the person chose themself', async () => {
    await router.navigateByUrl('/katalog');
    TestBed.tick();
    store.clear();
    TestBed.tick();
    await new Promise((r) => setTimeout(r, 0));
    expect(router.url).toBe('/katalog');

    store.set(session);
    await router.navigateByUrl('/kabinet/profil');
    TestBed.tick();
    TestBed.inject(AuthService).signOut().subscribe();
    TestBed.tick();
    await new Promise((r) => setTimeout(r, 0));
    expect(router.url).toBe('/kabinet/profil');
  });
});
