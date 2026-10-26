import { RenderMode, ServerRoute } from '@angular/ssr';
import { LANGS, LANG_PREFIX } from './core/i18n/plural';

/** Pages that need the browser's session or a one-time token: they are drawn in the browser only. */
const IN_BROWSER = [
  'kabinet',
  'kabinet/**',
  'confirm-email',
  'parolni-tiklash',
  'auksion/:id/ariza',
  'tolov/natija',
];

/**
 * Public pages are rendered on the server for each request (search engines, fast first paint). Personal pages (the
 * cabinet, and the pages above) need the browser's session, so they are rendered in the browser only: in every language.
 */
export const serverRoutes: ServerRoute[] = [
  ...LANGS.flatMap((lang) =>
    IN_BROWSER.map((path): ServerRoute => ({
      path: LANG_PREFIX[lang] ? `${LANG_PREFIX[lang].slice(1)}/${path}` : path,
      renderMode: RenderMode.Client as const,
    })),
  ),
  { path: '**', renderMode: RenderMode.Server },
];
