import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/http/api-error';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { TextKey } from '../../core/i18n/uz';

export type ErrorKind = 'not-found' | 'forbidden' | 'server' | 'sign-in-required' | 'offline';

const KEYS: Record<ErrorKind, { title: TextKey; text: TextKey }> = {
  'not-found': { title: 'error.notFound.title', text: 'error.notFound.text' },
  forbidden: { title: 'error.forbidden.title', text: 'error.forbidden.text' },
  server: { title: 'error.server.title', text: 'error.server.text' },
  'sign-in-required': { title: 'error.signInRequired.title', text: 'error.signInRequired.text' },
  offline: { title: 'error.offline.title', text: 'error.offline.text' },
};

const CODES: Partial<Record<ErrorKind, string>> = {
  'not-found': '404',
  forbidden: '403',
  server: '500',
};

/** Which kind of page an API failure is: a 404 is "not found", 401 "sign in", no connection "offline", the rest "server". */
export function kindOfError(error: unknown): ErrorKind {
  if (!(error instanceof ApiError)) return 'server';
  if (error.status === 404) return 'not-found';
  if (error.status === 403) return 'forbidden';
  if (error.status === 401) return 'sign-in-required';
  if (error.status === 0) return 'offline';
  return 'server';
}

/** A full message for a page that could not be shown. With `retry` observed, a retry button appears. */
@Component({
  selector: 'app-error-state',
  imports: [RouterLink, TPipe, LinkPipe],
  templateUrl: './error-state.html',
  styleUrl: './error-state.scss',
})
export class ErrorState {
  readonly kind = input<ErrorKind>('server');
  readonly requestId = input<string | null>(null);
  readonly canRetry = input(false);
  readonly retry = output<void>();

  protected readonly keys = computed(() => KEYS[this.kind()]);
  protected readonly code = computed(() => CODES[this.kind()] ?? '');
}
