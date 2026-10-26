import { PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { transferCacheInterceptor } from './transfer-cache';
import { API_BASE } from './api-base';

function setup(platform: 'browser' | 'server', base = '') {
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: platform },
      { provide: API_BASE, useValue: base },
      provideHttpClient(withInterceptors([transferCacheInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    backend: TestBed.inject(HttpTestingController),
    state: TestBed.inject(TransferState),
  };
}

describe('transfer of server-fetched data to the browser', () => {
  it('the server stores what the API answered, under the address without its internal base', () => {
    const { http, backend, state } = setup('server', 'http://api:8080');
    http.get('http://api:8080/api/Slide/public?x=1').subscribe();
    backend.expectOne('http://api:8080/api/Slide/public?x=1').flush({ data: [1] });
    expect(
      state.get(makeStateKey<{ body: unknown } | null>('api:/api/Slide/public?x=1'), null),
    ).toEqual({
      body: { data: [1] },
    });
  });

  it('the browser uses the stored answer once, without asking the API, then asks again', () => {
    const { http, backend, state } = setup('browser');
    state.set(makeStateKey<{ body: unknown } | null>('api:/api/Slide/public'), {
      body: { data: ['from server'] },
    });
    let first: unknown;
    http.get('/api/Slide/public').subscribe((v) => (first = v));
    backend.expectNone('/api/Slide/public');
    expect(first).toEqual({ data: ['from server'] });
    http.get('/api/Slide/public').subscribe();
    backend.expectOne('/api/Slide/public').flush({ data: [] });
  });

  it('asks the API when nothing was stored, and never stores or replays auction and bid data', () => {
    const { http, backend, state } = setup('browser');
    http.get('/api/Property/public/list').subscribe();
    backend.expectOne('/api/Property/public/list').flush({});
    state.set(makeStateKey<{ body: unknown } | null>('api:/api/Auction/public?Id=1'), {
      body: { stale: true },
    });
    http.get('/api/Auction/public?Id=1').subscribe();
    backend.expectOne('/api/Auction/public?Id=1').flush({ fresh: true });
  });

  it('does not store failures or other methods on the server', () => {
    const { http, backend, state } = setup('server');
    http.get('/api/A').subscribe({ error: () => undefined });
    backend.expectOne('/api/A').flush('x', { status: 500, statusText: 'Err' });
    http.post('/api/B', {}).subscribe();
    backend.expectOne('/api/B').flush({});
    expect(state.hasKey(makeStateKey<{ body: unknown } | null>('api:/api/A'))).toBe(false);
    expect(state.hasKey(makeStateKey<{ body: unknown } | null>('api:/api/B'))).toBe(false);
  });
});
