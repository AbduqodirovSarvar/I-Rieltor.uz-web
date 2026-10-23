import { DOCUMENT } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { tick } from '../../testing/http-helpers';
import { Session } from './session';
import { TokenRefresher } from './token-refresher';
import { TokenStore } from './token-store';

const KEY = 'irieltor.web.session';
const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

const session = (suffix: string): Session => ({
  accessToken: `access-${suffix}`,
  refreshToken: `refresh-${suffix}`,
  accessTokenExpiration: inMinutes(0),
  refreshTokenExpiration: inMinutes(60 * 24),
  userId: 'u1',
});

/** Two browser tabs share one Web Locks manager and one localStorage; each has its own services. */
function openTab(parent: Injector, locks: LockManager): Injector {
  const fakeWindow = { navigator: { locks }, localStorage, addEventListener: () => undefined };
  return Injector.create({
    parent,
    providers: [
      { provide: DOCUMENT, useValue: { defaultView: fakeWindow } },
      { provide: TokenStore, useClass: TokenStore },
      { provide: TokenRefresher, useClass: TokenRefresher },
    ],
  });
}

/** Runs lock requests one after another, like the browser does for the same lock name. */
function fakeLocks(): LockManager {
  let chain: Promise<unknown> = Promise.resolve();
  return {
    request: (_name: string, callback: () => Promise<unknown>) => {
      const run = chain.then(callback);
      chain = run.catch(() => undefined);
      return run;
    },
  } as unknown as LockManager;
}

describe('TokenRefresher across tabs', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('two tabs that need a new token at the same moment send ONE refresh request', async () => {
    localStorage.setItem(KEY, JSON.stringify(session('1')));
    const locks = fakeLocks();
    const tabA = openTab(TestBed.inject(Injector), locks);
    const tabB = openTab(TestBed.inject(Injector), locks);

    const results: Session[] = [];
    tabA
      .get(TokenRefresher)
      .refresh('refresh-1')
      .subscribe((s) => results.push(s));
    tabB
      .get(TokenRefresher)
      .refresh('refresh-1')
      .subscribe((s) => results.push(s));
    await tick();

    const requests = backend.match('/api/Auth/refresh-token');
    expect(requests.length).toBe(1);
    requests[0].flush({
      success: true,
      statusCode: 200,
      message: null,
      errors: null,
      data: {
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
        accessTokenExpiration: inMinutes(30),
        refreshTokenExpiration: inMinutes(60 * 24),
        userId: 'u1',
      },
    });
    await tick();
    await tick();

    expect(results.map((s) => s.refreshToken)).toEqual(['refresh-2', 'refresh-2']);
    expect(tabB.get(TokenStore).session()?.refreshToken).toBe('refresh-2');
  });

  it('calls in one tab share the same in-flight refresh without locks support', async () => {
    localStorage.setItem(KEY, JSON.stringify(session('1')));
    const noLocks = { navigator: {}, localStorage, addEventListener: () => undefined };
    const tab = Injector.create({
      parent: TestBed.inject(Injector),
      providers: [
        { provide: DOCUMENT, useValue: { defaultView: noLocks } },
        { provide: TokenStore, useClass: TokenStore },
        { provide: TokenRefresher, useClass: TokenRefresher },
      ],
    });
    const refresher = tab.get(TokenRefresher);
    for (let i = 0; i < 4; i++) refresher.refresh('refresh-1').subscribe();
    await tick();

    expect(backend.match('/api/Auth/refresh-token').length).toBe(1);
  });
});
