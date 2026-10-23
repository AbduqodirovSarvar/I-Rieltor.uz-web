import { HttpTestingController } from '@angular/common/http/testing';

/** The envelope every endpoint answers with. */
export const ok = <T>(data: T) => ({
  success: true,
  statusCode: 200,
  message: null,
  errors: null,
  data,
});

/** A list answer with its paging fields. */
export const okPage = <T>(data: T[], pageIndex = 0, pageSize = 20, totalCount = data.length) => ({
  ...ok(data),
  pageIndex,
  pageSize,
  totalCount,
  isPaginated: true,
});

/** Backend errors (400 lists "Field: message" lines). */
export const failure = (statusCode: number, message: string, errors: string[] = []) => ({
  success: false,
  statusCode,
  message,
  errors,
  data: null,
});

/** Lets promise-based code (the token refresh) run before the next expectation. */
export const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Flushes the one request to `url` with a successful envelope. */
export function respond<T>(backend: HttpTestingController, url: string, data: T): void {
  backend.expectOne(url).flush(ok(data));
}
