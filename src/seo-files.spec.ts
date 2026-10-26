import { cacheControlFor, loadSitemapEntries, robotsTxt, sitemapXml } from './seo-files';

const SITE = 'https://i-rieltor.uz';

describe('robots.txt', () => {
  const text = robotsTxt(SITE);

  it('keeps crawlers out of personal pages in both languages and names the sitemap', () => {
    for (const path of ['/kabinet', '/ru/kabinet', '/kirish', '/ru/tolov', '/confirm-email'])
      expect(text).toContain(`Disallow: ${path}\n`);
    expect(text).toContain('Sitemap: https://i-rieltor.uz/sitemap.xml');
    expect(text).not.toMatch(/Disallow: \/\n/);
  });
});

describe('sitemap.xml', () => {
  const xml = sitemapXml(SITE, [
    { path: '/' },
    { path: '/obyekt/abc', lastModified: '2026-05-01T10:00:00Z' },
    { path: '/katalog?a=1&b=2' },
  ]);

  it('lists each page in both languages, each naming the other (hreflang)', () => {
    expect(xml).toContain('<loc>https://i-rieltor.uz/</loc>');
    expect(xml).toContain('<loc>https://i-rieltor.uz/ru</loc>');
    expect(xml).toContain('<loc>https://i-rieltor.uz/obyekt/abc</loc>');
    expect(xml).toContain('<loc>https://i-rieltor.uz/ru/obyekt/abc</loc>');
    expect(xml).toContain('hreflang="x-default" href="https://i-rieltor.uz/obyekt/abc"');
    expect((xml.match(/<url>/g) ?? []).length).toBe(6);
  });

  it('states the last change only when there is a valid date, and escapes text', () => {
    expect(xml).toContain('<lastmod>2026-05-01T10:00:00.000Z</lastmod>');
    expect((xml.match(/<lastmod>/g) ?? []).length).toBe(2);
    expect(xml).toContain('a=1&amp;b=2');
    expect(xml).not.toContain('a=1&b=2');
  });
});

describe('loading the sitemap entries', () => {
  const items = (from: number, count: number) =>
    Array.from({ length: count }, (_, i) => ({
      id: `p${from + i}`,
      createdAt: '2026-01-01T00:00:00Z',
      auction: (from + i) % 2 === 0 ? { id: `a${from + i}` } : null,
    }));

  it('walks every page of the list, adds auctions, and stops at a short page', async () => {
    const urls: string[] = [];
    const entries = await loadSitemapEntries('http://api', async (url) => {
      urls.push(url);
      return { data: urls.length === 1 ? items(0, 50) : items(50, 3) };
    });
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain('PageIndex=0');
    expect(urls[1]).toContain('PageIndex=1');
    const paths = entries.map((e) => e.path);
    expect(paths).toContain('/katalog');
    expect(paths).toContain('/obyekt/p52');
    expect(paths).toContain('/auksion/a52');
    expect(paths).not.toContain('/auksion/a51');
    expect(entries).toHaveLength(5 + 53 + 27);
  });

  it('ignores repeated objects and a missing list', async () => {
    const entries = await loadSitemapEntries('http://api', async () => ({
      data: [{ id: 'x' }, { id: 'x' }],
    }));
    expect(entries.filter((e) => e.path === '/obyekt/x')).toHaveLength(1);
    const empty = await loadSitemapEntries('http://api', async () => ({ data: null }));
    expect(empty).toHaveLength(5);
  });

  it('passes a failing API on, so the server can answer "later" instead of an empty file', async () => {
    await expect(
      loadSitemapEntries('http://api', async () => {
        throw new Error('down');
      }),
    ).rejects.toThrow('down');
  });
});

describe('cache policy', () => {
  it('lets a shared cache keep public pages for a minute, and never personal ones', () => {
    expect(cacheControlFor('/katalog?page=2')).toContain('s-maxage=60');
    expect(cacheControlFor('/ru/auksion/abc')).toContain('s-maxage=60');
    expect(cacheControlFor('/')).toContain('s-maxage=60');
    for (const path of [
      '/kabinet',
      '/kabinet/profil',
      '/ru/kabinet/arizalar',
      '/kirish?returnUrl=%2F',
      '/tolov/natija',
      '/confirm-email',
    ])
      expect(cacheControlFor(path), path).toBe('no-store');
  });
});
