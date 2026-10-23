import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { API_BASE } from './api-base';
import { ApiError } from './api-error';
import { listParams } from './query-params';
import { ListQuery, Page, ResponseModel } from './response-model';
import { SKIP_AUTH } from './skip-auth';

/**
 * The only place that talks to the backend. Returns the `data` of the envelope and turns every failure into an
 * {@link ApiError}. Tokens and refresh are added by the interceptor, not here.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE);

  url(path: string): string {
    return `${this.base}/${path.replace(/^\//, '')}`;
  }

  /** True for a call to this API (the interceptor adds the token only to those). */
  isApiUrl(url: string): boolean {
    return url.startsWith(`${this.base}/api/`);
  }

  get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.unwrap(this.http.get<ResponseModel<T>>(this.url(path), { params }));
  }

  /** A list endpoint: `data` is the array, the paging fields come from the envelope. */
  getPage<T>(path: string, query: ListQuery = {}): Observable<Page<T>> {
    return this.http.get<ResponseModel<T[]>>(this.url(path), { params: listParams(query) }).pipe(
      map((response) => ({
        items: response.data ?? [],
        pageIndex: response.pageIndex ?? query.pageIndex ?? 0,
        pageSize: response.pageSize ?? query.pageSize ?? 20,
        totalCount: response.totalCount ?? response.data?.length ?? 0,
      })),
      catchError((error) => throwError(() => ApiError.from(error))),
    );
  }

  /** `skipAuth`: no token is sent and a 401 does not trigger a refresh (sign-in, refresh itself). */
  post<T>(path: string, body?: unknown, options?: { skipAuth?: boolean }): Observable<T> {
    const context = options?.skipAuth ? new HttpContext().set(SKIP_AUTH, true) : undefined;
    return this.unwrap(this.http.post<ResponseModel<T>>(this.url(path), body ?? {}, { context }));
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.unwrap(this.http.put<ResponseModel<T>>(this.url(path), body ?? {}));
  }

  /** The backend reads the id of a DELETE from a JSON body. */
  delete<T>(path: string, body?: unknown): Observable<T> {
    return this.unwrap(this.http.delete<ResponseModel<T>>(this.url(path), { body }));
  }

  /** multipart/form-data (document upload). */
  postForm<T>(path: string, form: FormData): Observable<T> {
    return this.unwrap(this.http.post<ResponseModel<T>>(this.url(path), form));
  }

  /** A file fetched with the Authorization header; the caller turns the blob into a download or a preview. */
  blob(path: string, params?: HttpParams): Observable<Blob> {
    return this.http
      .get(this.url(path), { params, responseType: 'blob' })
      .pipe(catchError((error) => throwError(() => ApiError.from(error))));
  }

  private unwrap<T>(source: Observable<ResponseModel<T>>): Observable<T> {
    return source.pipe(
      map((response) => response.data),
      catchError((error) => throwError(() => ApiError.from(error))),
    );
  }
}
