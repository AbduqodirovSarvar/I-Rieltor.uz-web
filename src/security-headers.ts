import { createHash } from 'node:crypto';

/**
 * Browser-side protections sent by the Node server. The page is rendered on the server and may be kept by a shared cache for a
 * minute, so a per-request nonce would be wrong; instead each inline script that Angular itself writes into the page (the
 * event-replay bootstrap and the stylesheet switch) is allowed by its hash, and nothing else may run.
 */

/** Headers for every answer, pages and files alike. */
export const BASIC_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

/** The local E-IMZO program listens on these addresses of the person's own computer. */
const EIMZO_AGENT = 'https://127.0.0.1:64443 wss://127.0.0.1:64443 http://127.0.0.1:64646';

/** The text of every inline script that runs (JSON data blocks are not code and need no permission). */
export function inlineScripts(html: string): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attributes = match[1];
    if (
      /\bsrc\s*=/i.test(attributes) ||
      /type\s*=\s*["']application\/(ld\+)?json["']/i.test(attributes)
    )
      continue;
    if (match[2].trim()) found.push(match[2]);
  }
  return found;
}

/**
 * `imageHosts`: extra places pictures may come from, when the API hands out absolute file addresses on another host
 * (environment variable `CSP_IMAGE_HOSTS`, space separated).
 */
export function contentSecurityPolicy(html: string, imageHosts = ''): string {
  const hashes = [...new Set(inlineScripts(html))].map(
    (code) => `'sha256-${createHash('sha256').update(code, 'utf8').digest('base64')}'`,
  );
  return [
    `default-src 'self'`,
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    // Angular writes component styles into the page; styles cannot run code.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${imageHosts}`.trim(),
    `font-src 'self'`,
    `connect-src 'self' ws: wss: ${EIMZO_AGENT}`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ');
}

/** A file whose name carries a content hash never changes; anything else (favicon, share picture) must be re-checked daily. */
export const isHashedAsset = (path: string): boolean =>
  /[-.][A-Za-z0-9_]{8}\.(js|css|woff2?|mjs)$/.test(path);
