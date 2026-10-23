import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Session } from '../../core/auth/session';
import { TokenStore } from '../../core/auth/token-store';
import { Hydrated } from '../../core/layout/hydrated';
import { ServerClock } from '../../core/time/server-clock';
import { ok, tick } from '../../testing/http-helpers';
import { ApplyCta, applyState } from './apply-cta';
import { ShareBar, shareLinks } from './share-bar';

const base = {
  status: 'SCHEDULED',
  deadlineMs: 1000,
  nowMs: 0,
  authenticated: false,
  verified: false,
};

describe('applyState', () => {
  it('a guest signs in, an unverified account connects E-IMZO, a verified one applies', () => {
    expect(applyState(base)).toBe('sign-in');
    expect(applyState({ ...base, authenticated: true })).toBe('verify');
    expect(applyState({ ...base, authenticated: true, verified: true })).toBe('apply');
  });

  it('after the deadline only a note is left, whoever the visitor is', () => {
    for (const who of [{}, { authenticated: true }, { authenticated: true, verified: true }])
      expect(applyState({ ...base, ...who, nowMs: 1000 })).toBe('deadline-passed');
  });

  it('a finished, failed or cancelled auction takes no applications', () => {
    for (const status of ['FINISHED', 'FAILED', 'CANCELLED', 'DRAFT'])
      expect(applyState({ ...base, status, authenticated: true, verified: true })).toBe('closed');
  });

  it('an ongoing auction after its deadline says the deadline passed', () => {
    expect(applyState({ ...base, status: 'ONGOING', nowMs: 5000 })).toBe('deadline-passed');
  });
});

describe('ApplyCta', () => {
  let backend: HttpTestingController;
  const session: Session = {
    accessToken: 'a',
    refreshToken: 'r',
    accessTokenExpiration: new Date(Date.now() + 3_600_000).toISOString(),
    refreshTokenExpiration: new Date(Date.now() + 86_400_000).toISOString(),
    userId: 'u1',
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  function render(deadlineInHours: number) {
    const fixture = TestBed.createComponent(ApplyCta);
    fixture.componentRef.setInput('auctionId', 'a1');
    fixture.componentRef.setInput('status', 'SCHEDULED');
    fixture.componentRef.setInput(
      'deadline',
      new Date(Date.now() + deadlineInHours * 3_600_000).toISOString(),
    );
    fixture.detectChanges();
    return fixture;
  }
  const settle = async (fixture: { detectChanges(): void }) => {
    await tick();
    fixture.detectChanges();
    fixture.detectChanges();
  };

  it('draws nothing before the browser has taken over, so the server HTML matches', () => {
    backend.verify();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.overrideProvider(Hydrated, { useValue: { ready: signal(false) } });
    const fixture = render(5);
    expect(fixture.nativeElement.querySelector('a, p')).toBeNull();
  });

  it('a guest gets a sign-in link that returns to the auction', async () => {
    const fixture = render(5);
    await settle(fixture);
    const link = fixture.nativeElement.querySelector('a.btn') as HTMLAnchorElement;
    expect(link.textContent).toContain('Ariza berish uchun kiring');
    expect(link.getAttribute('href')).toBe('/kirish?returnUrl=%2Fauksion%2Fa1');
  });

  it('an account without E-IMZO is sent to connect it, and a verified one to the application', async () => {
    TestBed.inject(TokenStore).set(session);
    const auth = TestBed.inject(AuthService);
    auth.loadProfile().subscribe();
    backend.expectOne('/api/Auth/me').flush(ok({ id: 'u1', type: 'NONE' }));
    const fixture = render(5);
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('a.btn')?.getAttribute('href')).toBe(
      '/kabinet/e-imzo?returnUrl=%2Fauksion%2Fa1',
    );

    auth.loadProfile().subscribe();
    backend.expectOne('/api/Auth/me').flush(ok({ id: 'u1', type: 'INDIVIDUAL' }));
    await settle(fixture);
    expect(fixture.nativeElement.querySelector('a.btn')?.getAttribute('href')).toBe(
      '/auksion/a1/ariza',
    );
  });

  it('judges the deadline by the SERVER clock, not the visitor’s', async () => {
    // The visitor's clock says the deadline is still 30 minutes away; the server is an hour ahead.
    TestBed.inject(ServerClock).learn(new Date(Date.now() + 3_600_000).toUTCString());
    const fixture = render(0.5);
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Ariza qabul qilish muddati tugagan.');
    expect(fixture.nativeElement.querySelector('a.btn')).toBeNull();
  });
});

describe('ShareBar', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('encodes the address and the title in the chat links', () => {
    const links = shareLinks('https://i-rieltor.uz/obyekt/1?a=b&c=d', 'Uy "A" & B');
    expect(links.telegram).toBe(
      'https://t.me/share/url?url=https%3A%2F%2Fi-rieltor.uz%2Fobyekt%2F1%3Fa%3Db%26c%3Dd&text=Uy%20%22A%22%20%26%20B',
    );
    expect(links.whatsapp.startsWith('https://wa.me/?text=')).toBe(true);
    expect(links.whatsapp).not.toContain('&c=d');
  });

  it('opens other sites safely and copies the link, telling the person', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: write },
      configurable: true,
    });
    const fixture = TestBed.createComponent(ShareBar);
    fixture.componentRef.setInput('url', 'https://i-rieltor.uz/obyekt/1');
    fixture.componentRef.setInput('title', 'Uy');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    for (const a of Array.from(el.querySelectorAll('a'))) {
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
      expect(a.getAttribute('target')).toBe('_blank');
    }
    el.querySelector('button')?.click();
    await tick();
    expect(write).toHaveBeenCalledWith('https://i-rieltor.uz/obyekt/1');
  });

  it('says so when the clipboard is not available', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    const fixture = TestBed.createComponent(ShareBar);
    fixture.componentRef.setInput('url', 'https://x/y');
    fixture.componentRef.setInput('title', 'T');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    await tick();
    const { Notify } = await import('../../core/notify/notify.service');
    expect(TestBed.inject(Notify).toasts()[0].message).toContain('Nusxalab bo‘lmadi');
  });
});
