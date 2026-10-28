import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '../../core/auth/auth.service';
import { TokenStore } from '../../core/auth/token-store';
import { EIMZO_PROVIDER, EimzoError, EimzoProvider } from '../../core/eimzo/eimzo.provider';
import { FakeEimzoProvider } from '../../core/eimzo/fake-eimzo';
import { I18n } from '../../core/i18n/i18n.service';
import { Notify } from '../../core/notify/notify.service';
import { failure, ok, tick } from '../../testing/http-helpers';
import { ApplyPage } from '../auction/apply-page';
import { EimzoPage } from '../cabinet/eimzo-page';
import { ForgotPasswordPage } from './forgot-password-page';
import { SignInPage } from './sign-in-page';

@Component({ template: '' })
class Blank {}

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
const tokens = () => ({
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  accessTokenExpiration: inMinutes(30),
  refreshTokenExpiration: inMinutes(60 * 24),
  userId: 'u1',
});

describe('E-IMZO pages', () => {
  let backend: HttpTestingController;
  let router: Router;
  let provider: EimzoProvider;

  function setup(custom?: EimzoProvider) {
    provider = custom ?? new FakeEimzoProvider();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'kirish', component: SignInPage },
            { path: 'parolni-unutdim', component: ForgotPasswordPage },
            { path: 'kabinet/e-imzo', component: EimzoPage },
            { path: 'auksion/:id/ariza', component: ApplyPage },
            { path: '**', component: Blank },
          ],
          withComponentInputBinding(),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EIMZO_PROVIDER, useValue: provider },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    TestBed.inject(I18n);
  }
  afterEach(() => localStorage.clear());

  const el = (h: RouterTestingHarness) => h.routeNativeElement as HTMLElement;
  const settle = async (h: RouterTestingHarness) => {
    await tick();
    h.detectChanges();
    await tick();
    h.detectChanges();
  };
  async function open(url: string) {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    harness.detectChanges();
    await settle(harness);
    return harness;
  }
  const button = (h: RouterTestingHarness, label: string) =>
    Array.from(el(h).querySelectorAll('button')).find((b) =>
      b.textContent?.includes(label),
    ) as HTMLButtonElement;
  const press = async (h: RouterTestingHarness, label: string) => {
    button(h, label).click();
    await settle(h);
  };
  const challenge = (value: string) =>
    backend.expectOne('/api/Auth/eimzo/challenge').flush(ok({ challenge: value, ttl: 120 }));

  describe('sign-in', () => {
    it('lists the keys of this computer and says it is a stand-in', async () => {
      setup();
      const h = await open('/kirish');
      expect(el(h).querySelectorAll('input[name="eimzo-signin-key"]')).toHaveLength(2);
      expect(el(h).textContent).toContain('Sinov rejimi');
    });

    it('signs a challenge with the key, sends it, keeps the session and goes to the cabinet', async () => {
      setup();
      const h = await open('/kirish');
      await press(h, 'E-IMZO bilan kirish');
      challenge('ch-1');
      await settle(h);
      const request = backend.expectOne('/api/Auth/sign-in-via-eimzo');
      expect(request.request.body).toEqual({ signedData: 'SIGNED|ch-1|31234567890123||' });
      request.flush(ok(tokens()));
      await settle(h);
      backend.expectOne('/api/Auth/me').flush(ok({ id: 'u1', type: 'INDIVIDUAL' }));
      await settle(h);
      await settle(h);
      expect(TestBed.inject(TokenStore).session()?.accessToken).toBe('access-1');
      expect(router.url).toBe('/kabinet');
    });

    it('never goes to another site after signing in', async () => {
      setup();
      const h = await open('/kirish?returnUrl=https%3A%2F%2Fevil.example');
      await press(h, 'E-IMZO bilan kirish');
      challenge('ch-1');
      await settle(h);
      backend.expectOne('/api/Auth/sign-in-via-eimzo').flush(ok(tokens()));
      await settle(h);
      backend.expectOne('/api/Auth/me').flush(ok({ id: 'u1' }));
      await settle(h);
      await settle(h);
      expect(router.url).toBe('/kabinet');
    });

    it('a key without an account is told so, with the way to make one', async () => {
      setup();
      const h = await open('/kirish');
      await press(h, 'E-IMZO bilan kirish');
      challenge('ch-1');
      await settle(h);
      backend
        .expectOne('/api/Auth/sign-in-via-eimzo')
        .flush(failure(401, 'User not registered.'), { status: 401, statusText: 'Unauthorized' });
      await settle(h);
      expect(el(h).textContent).toContain('hisob topilmadi');
      expect(button(h, 'E-IMZO bilan ro‘yxatdan o‘tish')).toBeTruthy();
    });

    it('signing up signs twice: once to create the account, once to sign in', async () => {
      setup();
      const h = await open('/kirish');
      await press(h, 'E-IMZO bilan ro‘yxatdan o‘tish');
      challenge('ch-up');
      await settle(h);
      backend.expectOne('/api/Auth/sign-up-via-eimzo').flush(ok(true));
      await settle(h);
      challenge('ch-in');
      await settle(h);
      expect(backend.expectOne('/api/Auth/sign-in-via-eimzo').request.body.signedData).toContain(
        '|ch-in|',
      );
    });

    it('a key that already has an account cannot sign up again, and the program failing is explained', async () => {
      setup();
      let h = await open('/kirish');
      await press(h, 'E-IMZO bilan ro‘yxatdan o‘tish');
      challenge('ch-up');
      await settle(h);
      backend
        .expectOne('/api/Auth/sign-up-via-eimzo')
        .flush(failure(409, 'exists'), { status: 409, statusText: 'Conflict' });
      await settle(h);
      expect(el(h).textContent).toContain('hisob allaqachon bor');

      TestBed.resetTestingModule();
      setup({
        kind: 'real',
        listKeys: async () => [
          { id: 'k', owner: 'A', organisation: null, validTo: null, handle: {} },
        ],
        sign: async () => {
          throw new EimzoError('cancelled');
        },
      });
      h = await open('/kirish');
      await press(h, 'E-IMZO bilan kirish');
      challenge('ch');
      await settle(h);
      expect(el(h).textContent).toContain('Imzolash bekor qilindi');
      backend.expectNone('/api/Auth/sign-in-via-eimzo');
    });

    it('without the program or keys it says so and offers to look again', async () => {
      setup({
        kind: 'real',
        listKeys: async () => {
          throw new EimzoError('not-installed');
        },
        sign: async () => '',
      });
      const h = await open('/kirish');
      expect(el(h).textContent).toContain('E-IMZO dasturi topilmadi');
      expect(button(h, 'Qayta qidirish')).toBeTruthy();
    });
  });

  describe('password reset with a key', () => {
    it('sends the signed challenge with the new password and goes to sign-in', async () => {
      setup();
      const h = await open('/parolni-unutdim');
      const type = (id: string, value: string) => {
        const input = el(h).querySelector(`#${id}`) as HTMLInputElement;
        input.value = value;
        input.dispatchEvent(new Event('input'));
      };
      type('er-password', 'Newer@12345');
      type('er-confirm', 'Newer@12345');
      await press(h, 'Imzolab, parolni yangilash');
      challenge('ch-r');
      await settle(h);
      const request = backend.expectOne('/api/Auth/reset-password-via-eimzo');
      expect(request.request.body).toEqual({
        signedData: 'SIGNED|ch-r|31234567890123||',
        newPassword: 'Newer@12345',
        confirmPassword: 'Newer@12345',
      });
      request.flush(ok(true));
      await settle(h);
      expect(router.url).toBe('/kirish');
      expect(TestBed.inject(Notify).toasts()[0].message).toContain('Parol o‘zgartirildi');
    });

    it('checks the password before signing anything', async () => {
      setup();
      const h = await open('/parolni-unutdim');
      await press(h, 'Imzolab, parolni yangilash');
      backend.expectNone('/api/Auth/eimzo/challenge');
    });
  });

  describe('connecting a key to the account', () => {
    function signedIn(profile: Record<string, unknown> = { id: 'u1', type: 'NONE' }) {
      TestBed.inject(TokenStore).set(tokens());
      TestBed.inject(AuthService).setUser(profile as never);
    }

    it('signs, sends, shows the account as verified and goes back where the person came from', async () => {
      setup();
      signedIn();
      const h = await open('/kabinet/e-imzo?returnUrl=%2Fauksion%2Fa1%2Fariza');
      await settle(h);
      await press(h, 'Kalitni ulash');
      challenge('ch-l');
      await settle(h);
      const request = backend.expectOne('/api/Auth/me/eimzo');
      expect(request.request.body.signedData).toContain('|ch-l|');
      request.flush(
        ok({ id: 'u1', type: 'INDIVIDUAL', innpinfl: '31234567890123', fullName: 'VALIYEV ALI' }),
      );
      await settle(h);
      expect(TestBed.inject(AuthService).isVerified()).toBe(true);
      expect(router.url).toBe('/auksion/a1/ariza');
    });

    it('a key that belongs to another account is refused in plain words', async () => {
      setup();
      signedIn();
      const h = await open('/kabinet/e-imzo');
      await settle(h);
      await press(h, 'Kalitni ulash');
      challenge('ch-l');
      await settle(h);
      backend
        .expectOne('/api/Auth/me/eimzo')
        .flush(failure(409, 'taken'), { status: 409, statusText: 'Conflict' });
      await settle(h);
      expect(el(h).textContent).toContain('boshqa hisobga ulangan');
    });

    it('a verified account sees who it is, with the identifier masked', async () => {
      setup();
      signedIn({
        id: 'u1',
        type: 'INDIVIDUAL',
        innpinfl: '31234567890123',
        fullName: 'VALIYEV ALI',
      });
      const h = await open('/kabinet/e-imzo');
      await settle(h);
      expect(el(h).textContent).toContain('Tasdiqlangan: VALIYEV ALI');
      expect(el(h).textContent).not.toContain('31234567890123');
      expect(button(h, 'Kalitni ulash')).toBeUndefined();
    });
  });

  describe('applying for an auction', () => {
    const applicationText = ok({
      text: 'Men shartlarga roziman.',
      textBase64: 'TWVuIHNoYXJ0bGFyZ2Egcm96aW1hbi4=',
      applicationDeadline: inMinutes(600),
    });

    async function openApply() {
      setup();
      TestBed.inject(TokenStore).set(tokens());
      TestBed.inject(AuthService).setUser({
        id: 'u1',
        type: 'INDIVIDUAL',
        innpinfl: '31234567890123',
      } as never);
      const h = await open('/auksion/a1/ariza');
      backend
        .expectOne((r) => r.url === '/api/Participation/application-text')
        .flush(applicationText);
      await settle(h);
      return h;
    }

    it('shows the text, wants agreement first, then signs exactly that text and sends it', async () => {
      const h = await openApply();
      expect(el(h).querySelector('pre.text')?.textContent).toContain('Men shartlarga roziman.');

      await press(h, 'Imzolab, ariza berish');
      expect(el(h).textContent).toContain('rozilikni belgilang');
      backend.expectNone('/api/Participation/apply');

      const box = el(h).querySelector('input[type=checkbox]') as HTMLInputElement;
      box.checked = true;
      box.dispatchEvent(new Event('change'));
      await press(h, 'Imzolab, ariza berish');
      const request = backend.expectOne('/api/Participation/apply');
      expect(request.request.body).toEqual({
        auctionId: 'a1',
        signedData: 'ATT|TWVuIHNoYXJ0bGFyZ2Egcm96aW1hbi4=|31234567890123|',
      });
      request.flush(ok({}));
      await settle(h);
      expect(router.url).toBe('/kabinet/arizalar');
    });

    it('explains a refusal: already applied or too late (409), another person’s key (403), a changed text (400)', async () => {
      const h = await openApply();
      const box = el(h).querySelector('input[type=checkbox]') as HTMLInputElement;
      box.checked = true;
      box.dispatchEvent(new Event('change'));

      for (const [status, words] of [
        [409, 'allaqachon ariza bergansiz'],
        [403, 'boshqa shaxsga tegishli'],
        [400, 'Ariza matni o‘zgargan'],
      ] as const) {
        await press(h, 'Imzolab, ariza berish');
        backend
          .expectOne('/api/Participation/apply')
          .flush(failure(status, 'no'), { status, statusText: 'x' });
        await settle(h);
        expect(el(h).textContent, String(status)).toContain(words);
        if (status === 400)
          backend
            .expectOne((r) => r.url === '/api/Participation/application-text')
            .flush(applicationText);
        await settle(h);
      }
    });

    it('an account without a key is sent to connect one, and comes back here', async () => {
      setup();
      TestBed.inject(TokenStore).set(tokens());
      const h = await open('/auksion/a1/ariza');
      backend
        .expectOne((r) => r.url === '/api/Participation/application-text')
        .flush(applicationText);
      await settle(h);
      expect(el(h).querySelector('pre.text')).toBeNull();
      const link = el(h).querySelector('a[href^="/kabinet/e-imzo"]') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toContain('returnUrl=%2Fauksion%2Fa1%2Fariza');
    });
  });
});
