import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** A destructive action (withdraw an application, refuse a win) gets the red button. */
  danger: boolean;
}

/** `await confirm.ask({...})` → true if the person confirmed. One question at a time, shown by `<app-confirm-dialog>`. */
@Injectable({ providedIn: 'root' })
export class Confirm {
  private readonly state = signal<{ request: ConfirmRequest; done: (ok: boolean) => void } | null>(
    null,
  );

  readonly pending = this.state.asReadonly();

  ask(
    request: Pick<ConfirmRequest, 'title' | 'confirmLabel' | 'cancelLabel'> &
      Partial<Pick<ConfirmRequest, 'message' | 'danger'>>,
  ): Promise<boolean> {
    // A new question while one is open answers the old one with "no".
    this.state()?.done(false);
    return new Promise<boolean>((resolve) => {
      this.state.set({ request: { danger: false, ...request }, done: resolve });
    });
  }

  answer(ok: boolean): void {
    const current = this.state();
    this.state.set(null);
    current?.done(ok);
  }
}
