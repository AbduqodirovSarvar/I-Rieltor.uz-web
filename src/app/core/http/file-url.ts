import { inject } from '@angular/core';
import { API_BASE } from './api-base';

/**
 * The address of an uploaded file for an `<img>` or a link. The backend returns `PublicBaseUrl + path` when that is
 * configured, otherwise a relative `/uploads/...` that the same origin serves.
 */
export function fileUrlOf(base: string, url: string | null | undefined): string {
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function injectFileUrl(): (url: string | null | undefined) => string {
  const base = inject(API_BASE);
  return (url) => fileUrlOf(base, url);
}
