import { DOCUMENT } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { ok, tick } from '../../testing/http-helpers';
import { AuthService } from './auth.service';
import { authGuard, guestGuard, verifiedGuard } from './auth.guards';
import { Session } from './session';
import { TokenStore } from './token-store';

const session: Session = {
  accessToken: 'a',
  refreshToken: 'r',
  accessTokenExpiration: new Date(Date.now() + 3_600_000).toISOString(),
  refreshTokenExpiration: new Date(Date.now() + 86_400_000).toISOString(),
  userId: 'u1',
};

const route = {} as ActivatedRouteSnapshot;
const state = (url: string) => ({ url }) as RouterStateSnapshot;

describe('route guards', () => {
  let backend: HttpTestingController;

  const run = (guard: CanActivateFn, url = '/kabinet/arizalar') =>
    TestBed.runInInjectionContext(() => guard(route, state(url)));
  const asString = (value: unknown) => (value instanceof UrlTree ? value.toString() : value);

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('sends a guest to sign in and remembers where they wanted to go', () => {
    expect(asString(run(authGuard))).toBe('/kirish?returnUrl=%2Fkabinet%2Farizalar');
  });

  it('lets a signed-in user into the cabinet and keeps them away from the sign-in page', () => {
    TestBed.inject(TokenStore).set(session);
    expect(run(authGuard)).toBe(true);
    expect(asString(run(guestGuard))).toBe('/kabinet');
  });

  it('lets a guest see the sign-in page', () => {
    expect(run(guestGuard)).toBe(true);
  });

  it('takes an account that is not bound to E-IMZO to the page that explains how', async () => {
    TestBed.inject(TokenStore).set(session);
    const result = run(verifiedGuard, '/auksion/1/ariza') as Promise<unknown>;
    await tick();
    backend.expectOne('/api/Auth/me').flush(ok({ id: 'u1', type: 'NONE' }));
    expect(asString(await result)).toBe('/kabinet/e-imzo?returnUrl=%2Fauksion%2F1%2Fariza');
  });

  it('lets a verified account apply', async () => {
    TestBed.inject(TokenStore).set(session);
    const result = run(verifiedGuard) as Promise<unknown>;
    await tick();
    backend.expectOne('/api/Auth/me').flush(ok({ id: 'u1', type: 'INDIVIDUAL' }));
    expect(await result).toBe(true);
    expect(TestBed.inject(AuthService).isVerified()).toBe(true);
  });

  it('does not decide anything on the server, where there is no session to look at', () => {
    backend.verify();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: DOCUMENT, useValue: { defaultView: null } }],
    });
    // The after-each check needs a controller; the server case sends no requests.
    backend = { verify: () => undefined } as HttpTestingController;
    expect(run(authGuard)).toBe(true);
    expect(run(guestGuard)).toBe(true);
  });
});
