import { expect, test } from '@playwright/test';
import { publicObjects } from './helpers';

/** What a search engine or a link preview gets: plain HTTP answers, no browser involved. */
test.describe('server-rendered pages', () => {
  test('the HTML already has the title, the heading, the canonical address and both languages', async ({
    request,
  }) => {
    const response = await request.get('/biz-haqida');
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('<title>Biz haqimizda | I-Rieltor</title>');
    expect(html).toMatch(/<h1[^>]*>\s*Biz haqimizda/);
    expect(html).toContain('<html lang="uz"');
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/i-rieltor\.uz\/biz-haqida">/);
    expect(html).toMatch(/hreflang="ru" href="https:\/\/i-rieltor\.uz\/ru\/biz-haqida"/);
    expect(html).toMatch(/hreflang="x-default"/);
    expect(html).toMatch(/property="og:image" content="https:\/\/i-rieltor\.uz\/og-default\.png"/);
  });

  test('the catalog lists objects in the HTML itself, and an object page has structured data', async ({
    request,
  }) => {
    const objects = await publicObjects(request);
    test.skip(objects.length === 0, 'the stack has no published objects');
    const catalog = await (await request.get('/katalog')).text();
    expect(catalog).toContain('<app-property-card');
    const page = await (await request.get(`/obyekt/${objects[0].id}`)).text();
    expect(page).toContain('application/ld+json');
  });

  test('public pages may be cached briefly, personal ones and errors never', async ({
    request,
  }) => {
    expect((await request.get('/katalog')).headers()['cache-control']).toContain('s-maxage=60');
    expect((await request.get('/kabinet/profil')).headers()['cache-control']).toBe('no-store');
    expect((await request.get('/kirish')).headers()['cache-control']).toBe('no-store');
    expect((await request.get('/yoq-sahifa')).headers()['cache-control']).toBe('no-store');
  });

  test('every page carries the security headers, and scripts are allowed only by hash', async ({
    request,
  }) => {
    const headers = (await request.get('/')).headers();
    expect(headers['content-security-policy']).toMatch(/script-src 'self' 'sha256-/);
    expect(headers['content-security-policy']).not.toContain("'unsafe-eval'");
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('robots.txt closes the personal pages and names the sitemap', async ({ request }) => {
    const text = await (await request.get('/robots.txt')).text();
    expect(text).toContain('Disallow: /kabinet');
    expect(text).toContain('Disallow: /ru/kabinet');
    expect(text).toMatch(/Sitemap: https:\/\/.+\/sitemap\.xml/);
  });

  test('sitemap.xml lists every object in both languages', async ({ request }) => {
    const objects = await publicObjects(request);
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('xml');
    const xml = await response.text();
    for (const object of objects) {
      expect(xml).toContain(`/obyekt/${object.id}</loc>`);
      expect(xml).toContain(`/ru/obyekt/${object.id}</loc>`);
    }
    expect(xml).not.toContain('/kabinet');
  });

  test('the health check answers', async ({ request }) => {
    // Through Nginx the site answers for itself; the API has its own at /health/ready.
    expect((await request.get('/health/ready')).status()).toBe(200);
  });
});
