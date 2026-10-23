import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Public pages are rendered on the server for each request (search engines, fast first paint). Personal pages (the
 * cabinet) need the browser's session, so they are rendered in the browser only.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'kabinet', renderMode: RenderMode.Client },
  { path: 'kabinet/**', renderMode: RenderMode.Client },
  { path: 'ru/kabinet', renderMode: RenderMode.Client },
  { path: 'ru/kabinet/**', renderMode: RenderMode.Client },
  { path: 'confirm-email', renderMode: RenderMode.Client },
  { path: 'ru/confirm-email', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
