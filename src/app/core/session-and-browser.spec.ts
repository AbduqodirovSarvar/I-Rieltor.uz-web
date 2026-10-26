import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ok } from '../testing/http-helpers';
import { AuthService } from './auth/auth.service';
import { TokenStore } from './auth/token-store';
import { previewBlob, saveBlob } from './http/download';
import { Theme } from './layout/theme.service';

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
const tokens = (over: Record<string, unknown> = {}) => ({
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  accessTokenExpiration: inMinutes(30),
  refreshTokenExpiration: inMinutes(60 * 24),
  userId: 'u1',
  ...over,
});

describe('session end and restore', () => {
  let backend: HttpTestingController;
  let auth: AuthService;
  let store: TokenStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    store = TestBed.inject(TokenStore);
  });

  it('signing out tells the server, then forgets the session and the profile', async () => {
    store.set(tokens());
    auth.setUser({ id: 'u1' } as never);
    const done = new Promise<void>((resolve) => auth.signOut().subscribe({ complete: resolve }));
    const request = backend.expectOne('/api/Auth/logout');
    expect(request.request.body).toEqual({ refreshToken: 'refresh-1' });
    request.flush(ok(true));
    await done;
    expect(store.session()).toBeNull();
    expect(auth.currentUser()).toBeNull();
  });

  it('signing out works when the server cannot be reached, and without a session sends nothing', async () => {
    store.set(tokens());
    const first = new Promise<void>((resolve) => auth.signOut().subscribe({ complete: resolve }));
    backend.expectOne('/api/Auth/logout').error(new ProgressEvent('error'));
    await first;
    expect(store.session()).toBeNull();

    await new Promise<void>((resolve) => auth.signOut().subscribe({ complete: resolve }));
    backend.expectNone('/api/Auth/logout');
  });

  it('a profile that cannot be loaded is simply nothing', async () => {
    const loaded = new Promise((resolve) => auth.loadProfile().subscribe(resolve));
    backend.expectOne('/api/Auth/me').flush('x', { status: 500, statusText: 'Error' });
    expect(await loaded).toBeNull();
  });

  it('on start: no session does nothing; a dead refresh token is dropped; a good session loads the profile', async () => {
    await auth.restore();
    backend.expectNone('/api/Auth/me');

    localStorage.setItem(
      'irieltor.web.session',
      JSON.stringify(
        tokens({
          accessTokenExpiration: inMinutes(-10),
          refreshTokenExpiration: inMinutes(-5),
        }),
      ),
    );
    await auth.restore();
    expect(store.session()).toBeNull();
    backend.expectNone('/api/Auth/me');

    localStorage.setItem('irieltor.web.session', JSON.stringify(tokens()));
    const restored = auth.restore();
    await Promise.resolve();
    backend.expectOne('/api/Auth/me').flush(ok({ id: 'u1', type: 'NONE' }));
    await restored;
    expect(auth.currentUser()?.id).toBe('u1');
  });
});

describe('the theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('switches between day and night, applies it to the page and remembers it', () => {
    const theme = TestBed.inject(Theme);
    TestBed.tick();
    // Nothing chosen yet: the style sheet follows the device, the page carries no attribute.
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(theme.mode()).toBe('light');
    theme.next();
    TestBed.tick();
    expect(theme.mode()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('irieltor.web.theme')).toBe('dark');
    theme.next();
    TestBed.tick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('starts from the saved choice, and a blocked storage does not break it', () => {
    localStorage.setItem('irieltor.web.theme', 'dark');
    expect(TestBed.inject(Theme).mode()).toBe('dark');

    TestBed.resetTestingModule();
    const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const theme = TestBed.inject(Theme);
    expect(() => theme.set('light')).not.toThrow();
    expect(theme.mode()).toBe('light');
    blocked.mockRestore();
  });
});

describe('saving and previewing a file in the browser', () => {
  it('saving makes a link with the file name, clicks it and lets go of the memory later', () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    saveBlob(new Blob(['a']), 'pasport.pdf');

    expect(create).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(document.querySelector('a[download]')).toBeNull();
    vi.advanceTimersByTime(10_000);
    expect(revoke).toHaveBeenCalledWith('blob:x');
    click.mockRestore();
    vi.useRealTimers();
  });

  it('previewing opens a new tab that cannot reach back to this page', () => {
    vi.useFakeTimers();
    Object.assign(URL, { createObjectURL: () => 'blob:y', revokeObjectURL: vi.fn() });
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);

    previewBlob(new Blob(['a']));

    expect(open).toHaveBeenCalledWith('blob:y', '_blank', 'noopener');
    open.mockRestore();
    vi.useRealTimers();
  });
});
