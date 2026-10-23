import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ApiError } from '../http/api-error';
import { Notify } from './notify.service';

/**
 * Catches what no code handled. A failed API call is explained to the person (with the request id); anything else is
 * logged for the developer and shown as a generic message. Tokens and form values are never written to the log.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly notify = inject(Notify);

  handleError(error: unknown): void {
    if (error instanceof ApiError) {
      // 401 is handled by the session (the user is sent to sign in).
      if (error.status !== 401) this.notify.error(error);
      return;
    }
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    this.notify.error(error);
  }
}
