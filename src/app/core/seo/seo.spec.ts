import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Seo } from './seo.service';

@Component({ template: '' })
class Blank {}

const head = (selector: string) => document.head.querySelector(selector);
const content = (selector: string) => head(selector)?.getAttribute('content');

describe('Seo', () => {
  let seo: Seo;
  let router: Router;

  beforeEach(() => {
    document.head.innerHTML = '';
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Blank }])],
    });
    seo = TestBed.inject(Seo);
    router = TestBed.inject(Router);
  });

  it('sets title, description, canonical and Open Graph for an Uzbek page', async () => {
    await router.navigateByUrl('/katalog?page=2');
    seo.set({ title: 'Katalog', description: 'Obyektlar', image: '/uploads/a.jpg' });

    expect(document.title).toBe('Katalog | I-Rieltor');
    expect(content('meta[name="description"]')).toBe('Obyektlar');
    expect(content('meta[property="og:title"]')).toBe('Katalog | I-Rieltor');
    expect(content('meta[property="og:image"]')).toMatch(/^https?:\/\/.+\/uploads\/a\.jpg$/);
    expect(content('meta[name="twitter:card"]')).toBe('summary_large_image');
    // The canonical address has no query string: ?page=2 is the same content list.
    expect(head('link[rel="canonical"]')?.getAttribute('href')).toMatch(/\/katalog$/);
    expect(content('meta[name="robots"]')).toBe('index, follow');
  });

  it('points hreflang at all four languages and x-default at Uzbek', async () => {
    await router.navigateByUrl('/ru/katalog');
    seo.set({ title: 'Каталог' });

    const links = Array.from(document.head.querySelectorAll('link[hreflang]')).map((l) => [
      l.getAttribute('hreflang'),
      l.getAttribute('href'),
    ]);
    expect(links.map(([lang]) => lang)).toEqual(['uz', 'ru', 'en', 'uz-Cyrl', 'x-default']);
    expect(links[0][1]).toMatch(/\/katalog$/);
    expect(links[1][1]).toMatch(/\/ru\/katalog$/);
    expect(links[2][1]).toMatch(/\/en\/katalog$/);
    expect(links[3][1]).toMatch(/\/cyrl\/katalog$/);
    expect(links[4][1]).toBe(links[0][1]);
    expect(head('link[rel="canonical"]')?.getAttribute('href')).toMatch(/\/ru\/katalog$/);
  });

  it('keeps a page out of search results when asked, and an override decides the canonical address', async () => {
    await router.navigateByUrl('/katalog?type=house');
    seo.set({ title: 'Katalog', noindex: true, canonicalPath: '/katalog' });
    expect(content('meta[name="robots"]')).toBe('noindex, nofollow');
    expect(head('link[rel="canonical"]')?.getAttribute('href')).toMatch(/\/katalog$/);
  });

  it('does not repeat head elements when called again, and replaces an old picture with the site one', async () => {
    await router.navigateByUrl('/');
    seo.set({ title: 'A', image: '/a.jpg', jsonLd: { '@type': 'Thing' } });
    seo.set({ title: 'B' });
    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(document.head.querySelectorAll('link[hreflang]').length).toBe(5);
    expect(document.head.querySelectorAll('script[data-seo-jsonld]').length).toBe(0);
    expect(head('meta[property="og:image"]')?.getAttribute('content')).toMatch(
      /\/og-default\.png$/,
    );
    expect(head('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image');
    expect(document.title).toBe('B | I-Rieltor');
  });

  it('writes JSON-LD that cannot close the script tag', async () => {
    await router.navigateByUrl('/');
    seo.set({ title: 'X', jsonLd: { name: '</script><script>alert(1)</script>' } });
    const script = head('script[type="application/ld+json"]');
    expect(script?.textContent).not.toContain('<');
    expect(JSON.parse(script?.textContent ?? '{}').name).toBe('</script><script>alert(1)</script>');
  });

  it('shows the site name alone as the home page title', async () => {
    await router.navigateByUrl('/');
    seo.set({ title: '' });
    expect(document.title).toBe('I-Rieltor: Ko‘chmas mulk auksionlari');
  });
});
