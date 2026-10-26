import { isPlatformServer } from '@angular/common';
import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { PLATFORM_ID, TransferState, inject, makeStateKey } from '@angular/core';
import { of, tap } from 'rxjs';
import { API_BASE } from './api-base';

/**
 * Public data the server already fetched to render a page is sent along inside the page, so the browser does not ask the
 * API for it a second time while hydrating. (Angular's own transfer cache cannot do this here: the server reaches the API at
 * an internal address and the browser at a relative one, so the two never share a cache key.)
 *
 * Each answer is used once: later requests of the same address (a reload, a refresh) go to the API. Auction prices and bids
 * are left out on purpose: the browser's request also tells it how far its clock is from the server's.
 */
const NEVER = /\/api\/(Auction|Bid)\b/i;

interface Stored {
  body: unknown;
}

export const transferCacheInterceptor: HttpInterceptorFn = (req, next) => {
  const state = inject(TransferState);
  if (req.method !== 'GET' || req.responseType !== 'json' || NEVER.test(req.url)) return next(req);

  const base = inject(API_BASE);
  const address = req.urlWithParams.startsWith(base)
    ? req.urlWithParams.slice(base.length)
    : req.urlWithParams;
  const key = makeStateKey<Stored>('api:' + address);

  if (isPlatformServer(inject(PLATFORM_ID))) {
    return next(req).pipe(
      tap((event: HttpEvent<unknown>) => {
        if (event instanceof HttpResponse && event.status === 200)
          state.set(key, { body: event.body });
      }),
    );
  }

  if (state.hasKey(key)) {
    const stored = state.get(key, { body: null });
    state.remove(key);
    return of(new HttpResponse({ body: stored.body, status: 200, url: req.urlWithParams }));
  }
  return next(req);
};
