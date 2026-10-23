import { RESPONSE_INIT, inject } from '@angular/core';

/**
 * Lets a page set the HTTP status of the server's answer (404 for an object that does not exist, so a search engine drops it
 * instead of indexing an "error" page as content). In the browser there is no response to change and the call does nothing.
 */
export function injectResponseStatus(): (status: number) => void {
  const response = inject(RESPONSE_INIT, { optional: true });
  return (status) => {
    if (response) response.status = status;
  };
}
