import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { describeError } from './api-error-text';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  details: string[];
  requestId: string | null;
}

const LIFETIME_MS: Record<ToastKind, number> = { info: 6000, success: 5000, error: 10_000 };

/** Short messages that fade by themselves (and can be closed). Shown by `<app-toasts>` in the layout. */
@Injectable({ providedIn: 'root' })
export class Notify {
  private readonly i18n = inject(I18n);
  private readonly window = inject(DOCUMENT).defaultView;
  private nextId = 1;
  private readonly list = signal<Toast[]>([]);

  readonly toasts = this.list.asReadonly();

  info(message: string): void {
    this.add('info', message);
  }

  success(message: string): void {
    this.add('success', message);
  }

  /** Any failure: an {@link ApiError} is explained in the person's language, with the request id the backend log is searched by. */
  error(error: unknown): void {
    const text = describeError(error, this.i18n);
    this.add('error', text.message, text.details, text.requestId);
  }

  dismiss(id: number): void {
    this.list.update((all) => all.filter((toast) => toast.id !== id));
  }

  private add(
    kind: ToastKind,
    message: string,
    details: string[] = [],
    requestId: string | null = null,
  ): void {
    // The same message twice in a row (a retry loop) is shown once.
    if (this.list().some((t) => t.kind === kind && t.message === message)) return;
    const id = this.nextId++;
    this.list.update((all) => [...all.slice(-3), { id, kind, message, details, requestId }]);
    // Timers only in the browser: on the server nothing is shown to anyone.
    this.window?.setTimeout(() => this.dismiss(id), LIFETIME_MS[kind]);
  }
}
