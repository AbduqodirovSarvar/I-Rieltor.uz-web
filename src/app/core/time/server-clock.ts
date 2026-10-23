import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { tap } from 'rxjs';

/**
 * The server's time. An auction ends when the SERVER's clock says so; a visitor's clock can be minutes off. Every API answer
 * carries a `Date` header, from which the difference is learned, and countdowns count with {@link now}.
 */
@Injectable({ providedIn: 'root' })
export class ServerClock {
  private offsetMs = 0;

  /** Milliseconds since 1970 by the server's clock. */
  now(): number {
    return Date.now() + this.offsetMs;
  }

  /** Learns the difference from the `Date` header of an answer (whole seconds, which is precise enough for a countdown). */
  learn(dateHeader: string | null): void {
    const server = dateHeader ? Date.parse(dateHeader) : NaN;
    if (Number.isFinite(server)) this.offsetMs = server - Date.now();
  }
}

/** Feeds {@link ServerClock} from API answers. */
export const clockInterceptor: HttpInterceptorFn = (request, next) => {
  const clock = inject(ServerClock);
  return next(request).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) clock.learn(event.headers.get('Date'));
    }),
  );
};
