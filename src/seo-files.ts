/**
 * Files and headers for search engines, built by the Node server: `robots.txt`, `sitemap.xml` and the cache policy of each
 * kind of page. Kept free of Express so each piece can be tested on its own.
 */

/** Private or one-purpose pages, in both languages: crawlers are told to stay out (the pages also say `noindex`). */
const CLOSED = ['/kabinet', '/kirish', '/royxatdan-otish', '/confirm-email', '/tolov', '/dev'];

/** Pages of the site that exist without any data behind them. */
const STATIC_PATHS = ['/', '/katalog', '/biz-haqida', '/qoidalar', '/maxfiylik'];

/** The sitemap protocol allows 50 000 addresses in one file. Each page is listed in two languages. */
const MAX_PAGES = 20_000;
const PAGE_SIZE = 50;

export interface SitemapEntry {
  /** Address without the language prefix: `/obyekt/…`. */
  path: string;
  lastModified?: string | null;
}

export function robotsTxt(siteUrl: string): string {
  const lines = ['User-agent: *'];
  for (const path of CLOSED) lines.push(`Disallow: ${path}`, `Disallow: /ru${path}`);
  lines.push('Allow: /', '', `Sitemap: ${siteUrl}/sitemap.xml`, '');
  return lines.join('\n');
}

const escapeXml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** Every page appears once per language, and each one names both versions (`hreflang`) so they are paired. */
export function sitemapXml(siteUrl: string, entries: SitemapEntry[]): string {
  const at = (lang: 'uz' | 'ru', path: string) =>
    siteUrl + (lang === 'ru' ? '/ru' + (path === '/' ? '' : path) : path);
  const body: string[] = [];
  for (const entry of entries) {
    const alternates = (['uz', 'ru'] as const)
      .map(
        (lang) =>
          `<xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(at(lang, entry.path))}"/>`,
      )
      .concat(
        `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(at('uz', entry.path))}"/>`,
      )
      .join('');
    const modified = entry.lastModified && !Number.isNaN(Date.parse(entry.lastModified));
    for (const lang of ['uz', 'ru'] as const) {
      body.push(
        `<url><loc>${escapeXml(at(lang, entry.path))}</loc>` +
          (modified ? `<lastmod>${new Date(entry.lastModified!).toISOString()}</lastmod>` : '') +
          `${alternates}</url>`,
      );
    }
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    body.join('\n') +
    '\n</urlset>\n'
  );
}

interface ListItem {
  id: string;
  createdAt?: string | null;
  auction?: { id: string } | null;
}

interface ListAnswer {
  data?: ListItem[] | null;
  totalCount?: number | null;
}

/** The pages worth indexing: the fixed ones, every published object and every auction that is attached to one. */
export async function loadSitemapEntries(
  apiBase: string,
  get: (url: string) => Promise<ListAnswer>,
): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = STATIC_PATHS.map((path) => ({ path }));
  const seen = new Set<string>();
  for (let index = 0; entries.length < MAX_PAGES; index++) {
    const answer = await get(
      `${apiBase}/api/Property/public/list?PageIndex=${index}&PageSize=${PAGE_SIZE}&IncludeSold=true`,
    );
    const items = answer.data ?? [];
    for (const item of items) {
      if (!item.id || seen.has(item.id)) continue;
      seen.add(item.id);
      entries.push({ path: `/obyekt/${item.id}`, lastModified: item.createdAt });
      if (item.auction?.id) entries.push({ path: `/auksion/${item.auction.id}` });
    }
    if (items.length < PAGE_SIZE) break;
  }
  return entries;
}

/**
 * How long a copy of an answer may be kept. Public pages are rendered for each request but may be shared for a minute (a
 * price changes during a sale, so not longer); the shells of personal pages are never cached by a shared cache.
 */
export function cacheControlFor(path: string): string {
  const bare = path.split(/[?#]/)[0].replace(/^\/ru(?=\/|$)/, '') || '/';
  const closed = CLOSED.some(
    (closedPath) => bare === closedPath || bare.startsWith(closedPath + '/'),
  );
  return closed ? 'no-store' : 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
}
