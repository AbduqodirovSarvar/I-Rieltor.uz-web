import { inject } from '@angular/core';
import { API_BASE } from './api-base';

/**
 * The address of an uploaded file for an `<img>` or a link. The backend returns `PublicBaseUrl + path` when that is
 * configured, otherwise a relative `/uploads/...` that the same origin serves.
 */
export function fileUrlOf(_base: string, url: string | null | undefined): string {
  if (!url) return '';
  const internal = internalUploadPath(url);
  if (internal) return internal;
  // Never prefixed with the API's address: that is the server's own address, which the visitor cannot reach.
  return /^https?:\/\//i.test(url) ? url : url.startsWith('/') ? url : `/${url}`;
}

/**
 * The page is rendered by asking the API at its address inside the server network (`http://api:8080`), and the API writes
 * its own address into the file links it returns. A visitor cannot reach that address (and the page's security policy does not
 * allow it), so a link to `/uploads/...` on a host name without a dot (`api`, `localhost`) is kept as the path alone: the
 * same site serves it. A real address (a CDN, `files.example.uz`) is left as it is. The answer depends on the link only, so the
 * server and the browser write the same page.
 */
export function internalUploadPath(url: string): string | null {
  const match = /^https?:\/\/([^/.:]+)(?::\d+)?(\/uploads\/.*)$/i.exec(url);
  return match ? match[2] : null;
}

export function injectFileUrl(): (url: string | null | undefined) => string {
  const base = inject(API_BASE);
  return (url) => fileUrlOf(base, url);
}
