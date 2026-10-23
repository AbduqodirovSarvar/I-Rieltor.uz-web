import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../core/auth/auth.service';
import { TokenStore } from '../../core/auth/token-store';
import { I18n } from '../../core/i18n/i18n.service';
import { Notify } from '../../core/notify/notify.service';
import { failure, ok, tick } from '../../testing/http-helpers';
import { ConfirmEmailPage } from './confirm-email-page';
import { SignInPage } from './sign-in-page';
import { SignUpPage } from './sign-up-page';

@Component({ template: 'blank' })
class Blank {}

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
const tokens = () => ({
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  accessTokenExpiration: inMinutes(30),
  refreshTokenExpiration: inMinutes(60 * 24),
  userId: 'u1',
});

describe('auth pages', () => {
  let backend: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'kirish', component: SignInPage },
            { path: 'royxatdan-otish', component: SignUpPage },
            { path: 'confirm-email', component: ConfirmEmailPage },
            { path: '**', component: Blank },
          ],
          withComponentInputBinding(),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    TestBed.inject(I18n);
  });

  afterEach(() => vi.useRealTimers());

  const type = (el: HTMLElement, selector: string, value: string) => {
    const input = el.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };
  const submit = async (harness: RouterTestingHarness) => {
    (harness.routeNativeElement?.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await tick();
    harness.detectChanges();
  };

  describe('sign-in', () => {
    beforeEach(() => (shared = null));
    let shared: RouterTestingHarness | null = null;
    async function open(url = '/kirish') {
      const harness = (shared ??= await RouterTestingHarness.create());
      await harness.navigateByUrl(url);
      harness.detectChanges();
      return harness;
    }
    const fill = (harness: RouterTestingHarness, login = 'ali', password = 'Strong@123') => {
      const el = harness.routeNativeElement as HTMLElement;
      type(el, '#si-login', login);
      type(el, '#si-password', password);
    };

    it('does not send an empty form and says what is missing', async () => {
      const harness = await open();
      await submit(harness);
      backend.expectNone('/api/Auth/sign-in');
      expect(harness.routeNativeElement?.textContent).toContain('Majburiy maydon');
    });

    it('signs in, keeps the session, loads the profile and goes to the page the person came from', async () => {
      const harness = await open('/kirish?returnUrl=%2Fkabinet%2Fhujjatlar');
      fill(harness, ' ali ');
      await submit(harness);

      const request = backend.expectOne('/api/Auth/sign-in');
      expect(request.request.body).toEqual({ login: 'ali', password: 'Strong@123' });
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush(ok(tokens()));
      await tick();
      backend.expectOne('/api/Auth/me').flush(ok({ id: 'u1', type: 'NONE', fullName: 'Ali' }));
      await tick();
      await tick();

      expect(TestBed.inject(TokenStore).session()?.accessToken).toBe('access-1');
      expect(TestBed.inject(AuthService).currentUser()?.fullName).toBe('Ali');
      expect(router.url).toBe('/kabinet/hujjatlar');
    });

    it('never follows a returnUrl that leads to another site', async () => {
      for (const evil of [
        'https://evil.example',
        '//evil.example',
        '/\\evil.example',
        'javascript:alert(1)',
      ]) {
        TestBed.inject(TokenStore).clear();
        const harness = await open(`/kirish?returnUrl=${encodeURIComponent(evil)}`);
        fill(harness);
        await submit(harness);
        backend.expectOne('/api/Auth/sign-in').flush(ok(tokens()));
        await tick();
        backend.expectOne('/api/Auth/me').flush(ok({ id: 'u1', type: 'NONE' }));
        await tick();
        await tick();
        expect(router.url, evil).toBe('/kabinet');
      }
    });

    it('a wrong login and a wrong password get the same message, and the password is cleared', async () => {
      const harness = await open();
      fill(harness);
      await submit(harness);
      backend.expectOne('/api/Auth/sign-in').flush(failure(401, 'Invalid login or password.'), {
        status: 401,
        statusText: 'Unauthorized',
      });
      await tick();
      harness.detectChanges();
      const el = harness.routeNativeElement as HTMLElement;
      expect(el.textContent).toContain('Login yoki parol noto‘g‘ri.');
      expect((el.querySelector('#si-password') as HTMLInputElement).value).toBe('');
      expect(TestBed.inject(TokenStore).session()).toBeNull();
      expect(el.textContent).not.toContain('Invalid login');
    });

    it('after too many tries the button waits for the seconds the server asked', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      const harness = await open();
      fill(harness);
      await submit(harness);
      backend.expectOne('/api/Auth/sign-in').flush(failure(429, 'Too many'), {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Retry-After': '3' },
      });
      await tick();
      harness.detectChanges();
      const el = harness.routeNativeElement as HTMLElement;
      const button = el.querySelector('button[type=submit]') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(el.textContent).toContain('3 soniya');

      await vi.advanceTimersByTimeAsync(3100);
      harness.detectChanges();
      expect(button.disabled).toBe(false);
    });

    it('pressing twice sends one request', async () => {
      const harness = await open();
      fill(harness);
      await submit(harness);
      await submit(harness);
      expect(backend.match('/api/Auth/sign-in').length).toBe(1);
    });

    it('says why the person was sent here when the session ended', async () => {
      const harness = await open('/kirish?reason=expired');
      expect(harness.routeNativeElement?.textContent).toContain('Sessiya tugadi');
    });

    it('a failure that is not a login problem is reported, not shown as a wrong password', async () => {
      const harness = await open();
      fill(harness);
      await submit(harness);
      backend
        .expectOne('/api/Auth/sign-in')
        .flush(failure(500, 'boom'), { status: 500, statusText: 'Error' });
      await tick();
      harness.detectChanges();
      expect(harness.routeNativeElement?.textContent).not.toContain('Login yoki parol noto‘g‘ri.');
      expect(TestBed.inject(Notify).toasts().length).toBe(1);
    });
  });

  describe('sign-up', () => {
    async function open(url = '/royxatdan-otish') {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(url);
      harness.detectChanges();
      return harness;
    }
    const fillAll = (harness: RouterTestingHarness, over: Record<string, string> = {}) => {
      const el = harness.routeNativeElement as HTMLElement;
      const values: Record<string, string> = {
        '#su-first': 'Ali',
        '#su-last': 'Valiyev',
        '#su-email': 'ali@example.uz',
        '#su-password': 'Strong@123',
        '#su-confirm': 'Strong@123',
        ...over,
      };
      for (const [selector, value] of Object.entries(values)) type(el, selector, value);
    };

    it('checks every field before sending: required, e-mail, phone, login, password rule and the repeat', async () => {
      const harness = await open();
      fillAll(harness, {
        '#su-first': '',
        '#su-email': 'nope',
        '#su-phone': '12345',
        '#su-login': '1x',
        '#su-password': 'weak',
        '#su-confirm': 'other',
      });
      await submit(harness);
      backend.expectNone('/api/Auth/sign-up');
      const text = harness.routeNativeElement?.textContent ?? '';
      for (const message of [
        'Majburiy maydon',
        'Elektron pochta manzili noto‘g‘ri',
        'xalqaro formatda',
        'Harf bilan boshlanishi',
        'kamida 8 belgi',
        'Parollar bir xil emas',
      ]) {
        expect(text.toLowerCase(), message).toContain(message.toLowerCase());
      }
    });

    it('sends only what was filled, signs in with the e-mail and goes to the cabinet', async () => {
      const harness = await open();
      fillAll(harness, { '#su-phone': '+998901234567' });
      await submit(harness);

      const signUp = backend.expectOne('/api/Auth/sign-up');
      expect(signUp.request.body).toEqual({
        firstName: 'Ali',
        lastName: 'Valiyev',
        email: 'ali@example.uz',
        password: 'Strong@123',
        phone: '+998901234567',
      });
      signUp.flush(ok(true));
      await tick();
      const signIn = backend.expectOne('/api/Auth/sign-in');
      expect(signIn.request.body).toEqual({ login: 'ali@example.uz', password: 'Strong@123' });
      signIn.flush(ok(tokens()));
      await tick();
      backend.expectOne('/api/Auth/me').flush(ok({ id: 'u1', type: 'NONE' }));
      await tick();
      await tick();
      expect(router.url).toBe('/kabinet');
      expect(TestBed.inject(Notify).toasts()[0].message).toContain('Hisob yaratildi');
    });

    it('a taken login, e-mail or phone says so in plain words', async () => {
      const harness = await open();
      fillAll(harness);
      await submit(harness);
      backend
        .expectOne('/api/Auth/sign-up')
        .flush(failure(409, 'exists'), { status: 409, statusText: 'Conflict' });
      await tick();
      harness.detectChanges();
      expect(harness.routeNativeElement?.textContent).toContain('allaqachon mavjud');
      expect(backend.match('/api/Auth/sign-in').length).toBe(0);
    });

    it('puts the backend’s field errors under the fields they belong to', async () => {
      const harness = await open();
      fillAll(harness);
      await submit(harness);
      backend
        .expectOne('/api/Auth/sign-up')
        .flush(failure(400, 'Validation', ['Email: Email is not valid', 'Other: something']), {
          status: 400,
          statusText: 'Bad Request',
        });
      await tick();
      harness.detectChanges();
      const el = harness.routeNativeElement as HTMLElement;
      expect(el.querySelector('#su-email-error')?.textContent).toContain('Email is not valid');
      expect(el.textContent).toContain('Other: something');
    });

    it('if the account was made but signing in fails, the person is sent to the sign-in page', async () => {
      const harness = await open();
      fillAll(harness);
      await submit(harness);
      backend.expectOne('/api/Auth/sign-up').flush(ok(true));
      await tick();
      backend
        .expectOne('/api/Auth/sign-in')
        .flush(failure(500, 'x'), { status: 500, statusText: 'Error' });
      await tick();
      await tick();
      expect(router.url).toBe('/kirish');
    });

    it('does not claim to be a verified person: it asks for no identifier and says E-IMZO comes later', async () => {
      const harness = await open();
      const el = harness.routeNativeElement as HTMLElement;
      expect(el.querySelector('input[id*="pinfl" i], input[id*="inn" i]')).toBeNull();
      expect(el.textContent).toContain('E-IMZO');
    });
  });

  describe('confirm-email', () => {
    async function open(url: string) {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(url);
      harness.detectChanges();
      await tick();
      harness.detectChanges();
      return harness;
    }

    it('posts the token from the browser, takes it out of the address, and confirms', async () => {
      const harness = await open('/confirm-email?token=abc.def');
      const request = backend.expectOne('/api/Auth/confirm-email');
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ token: 'abc.def' });
      request.flush(ok(true));
      await tick();
      harness.detectChanges();
      expect(router.url).toBe('/confirm-email');
      expect(harness.routeNativeElement?.textContent).toContain('tasdiqlandi');
      expect(harness.routeNativeElement?.querySelector('a')?.getAttribute('href')).toBe('/kirish');
    });

    it('an expired or used link says so and points to the cabinet for a new one', async () => {
      const harness = await open('/confirm-email?token=old');
      backend
        .expectOne('/api/Auth/confirm-email')
        .flush(failure(400, 'expired'), { status: 400, statusText: 'Bad Request' });
      await tick();
      harness.detectChanges();
      expect(harness.routeNativeElement?.textContent).toContain('yaroqsiz yoki muddati tugagan');
      expect(harness.routeNativeElement?.querySelector('[role=alert]')).toBeTruthy();
    });

    it('a link without a token sends nothing', async () => {
      const harness = await open('/confirm-email');
      backend.expectNone('/api/Auth/confirm-email');
      expect(harness.routeNativeElement?.textContent).toContain('kaliti yo‘q');
    });

    it('a signed-in person is offered the cabinet and gets the updated profile', async () => {
      TestBed.inject(TokenStore).set({ ...tokens(), userId: 'u1' });
      const harness = await open('/confirm-email?token=ok');
      backend.expectOne('/api/Auth/confirm-email').flush(ok(true));
      await tick();
      backend
        .expectOne('/api/Auth/me')
        .flush(ok({ id: 'u1', type: 'NONE', emailConfirmedAt: inMinutes(0) }));
      await tick();
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('a')?.getAttribute('href')).toBe('/kabinet');
      expect(TestBed.inject(AuthService).currentUser()?.emailConfirmedAt).toBeTruthy();
    });
  });
});
