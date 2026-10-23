import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, of, switchMap, throwError } from 'rxjs';
import { ApiClient } from '../http/api-client';
import { SKIP_AUTH } from '../http/skip-auth';
import { Session, isAccessTokenExpiring } from './session';
import { TokenRefresher } from './token-refresher';
import { TokenStore } from './token-store';

/**
 * Adds the access token to API calls, renews it shortly before it expires, and on a 401 renews it once and repeats the call.
 * A session the server will not renew is dropped (the user then goes to sign in).
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const api = inject(ApiClient);
  if (!api.isApiUrl(request.url) || request.context.get(SKIP_AUTH)) return next(request);

  const store = inject(TokenStore);
  const refresher = inject(TokenRefresher);
  const withToken = (req: HttpRequest<unknown>, token: string) =>
    req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  const session = store.session();
  if (!session) return next(request);

  const tokenNow$: Observable<Session> = isAccessTokenExpiring(session)
    ? refresher.refresh(session.refreshToken)
    : of(session);

  return tokenNow$.pipe(
    switchMap((current) =>
      next(withToken(request, current.accessToken)).pipe(
        catchError((error: unknown): Observable<HttpEvent<unknown>> => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 401)
            return throwError(() => error);
          // The token was refused: renew once and repeat. A second 401 means the session is really over.
          return refresher.refresh(current.refreshToken).pipe(
            switchMap((renewed) => next(withToken(request, renewed.accessToken))),
            catchError((retryError: unknown) => {
              if (retryError instanceof HttpErrorResponse && retryError.status === 401)
                refresher.expire();
              return throwError(() => retryError);
            }),
          );
        }),
      ),
    ),
  );
};
