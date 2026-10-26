import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PublicPropertyListItem } from '../../api/models';
import { failure, ok, okPage, tick } from '../../testing/http-helpers';
import { CatalogPage, numberOrUndefined } from './catalog-page';

const CATEGORY = '01a1684b-01e6-7ede-b062-60e0892e7407';

const property = (n: number): PublicPropertyListItem =>
  ({
    id: `p${n}`,
    title: `Obyekt ${n}`,
    categoryId: CATEGORY,
    categoryName: 'Kvartira',
    status: 'PUBLISHED',
    region: 'Toshkent',
    district: null,
    areaSqm: null,
    landAreaSotix: null,
    rooms: null,
    floor: null,
    totalFloors: null,
    cover: null,
    auction: null,
    createdAt: new Date().toISOString(),
  }) as unknown as PublicPropertyListItem;

describe('numberOrUndefined', () => {
  it('reads what people type', () => {
    expect(numberOrUndefined('12')).toBe(12);
    expect(numberOrUndefined(' 1 500 000 ')).toBe(1500000);
    expect(numberOrUndefined('85,5')).toBe(85.5);
    expect(numberOrUndefined('')).toBeUndefined();
    expect(numberOrUndefined('abc')).toBeUndefined();
    expect(numberOrUndefined('-3')).toBeUndefined();
  });
});

describe('CatalogPage', () => {
  let backend: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'katalog', component: CatalogPage }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  const list = () => backend.expectOne((r) => r.url === '/api/Property/public/list');
  const lists = () => backend.match((r) => r.url === '/api/Property/public/list');

  async function open(url: string, items = [property(1), property(2)], total = items.length) {
    await harness.navigateByUrl(url);
    harness.detectChanges();
    const request = list();
    request.flush(okPage(items, 0, 12, total));
    backend.expectOne('/api/PropertyCategory/public').flush(
      ok([
        { id: CATEGORY, name: 'Kvartira', description: null, parentCategoryId: null, sortOrder: 0 },
        { id: 'c2', name: 'Yangi uy', description: null, parentCategoryId: CATEGORY, sortOrder: 0 },
      ]),
    );
    await tick();
    harness.detectChanges();
    await tick();
    harness.detectChanges();
    return request;
  }

  const el = () => harness.routeNativeElement as HTMLElement;

  it('asks the backend for exactly what the address says, counting pages from 0', async () => {
    const request = await open(
      `/katalog?q=uy&category=${CATEGORY}&minPrice=100&auction=1&sort=price_desc&page=3`,
      [property(1)],
      40,
    );
    const p = request.request.params;
    expect(p.get('SearchText')).toBe('uy');
    expect(p.get('CategoryId')).toBe(CATEGORY);
    expect(p.get('MinPrice')).toBe('100');
    expect(p.get('OnlyInAuction')).toBe('true');
    expect(p.get('Sort')).toBe('price_desc');
    expect(p.get('PageIndex')).toBe('2');
    expect(p.get('PageSize')).toBe('12');
  });

  it('shows the cards, the count, and the filters from the address in the form', async () => {
    await open(
      `/katalog?category=${CATEGORY}&sort=area_asc&auction=1&minArea=40`,
      [property(1), property(2)],
      2,
    );
    expect(el().querySelectorAll('app-property-card').length).toBe(2);
    expect(el().querySelector('.count')?.textContent).toContain('Topildi: 2');
    expect((el().querySelector('#f-sort') as HTMLSelectElement).value).toBe('area_asc');
    expect((el().querySelector('#f-category') as HTMLSelectElement).value).toBe(CATEGORY);
    expect(el().querySelectorAll('#f-category option').length).toBe(3);
    expect((el().querySelector('input[type=checkbox]') as HTMLInputElement).checked).toBe(true);
    expect(el().querySelector('.badge-info')?.textContent?.trim()).toBe('3');
  });

  it('changing a filter changes the address, back to page 1, and fetches again', async () => {
    await open('/katalog?page=3', [property(1)], 40);
    const select = el().querySelector('#f-category') as HTMLSelectElement;
    select.value = CATEGORY;
    select.dispatchEvent(new Event('change'));
    await tick();
    expect(router.url).toBe(`/katalog?category=${CATEGORY}`);
    harness.detectChanges();
    const next = list();
    expect(next.request.params.get('CategoryId')).toBe(CATEGORY);
    expect(next.request.params.get('PageIndex')).toBe('0');
    next.flush(okPage([property(1)]));
  });

  it('typing in the search waits for a pause before it asks again', async () => {
    await open('/katalog');
    vi.useFakeTimers();
    try {
      const input = el().querySelector('#f-q') as HTMLInputElement;
      for (const text of ['u', 'uy', 'uy ']) {
        input.value = text;
        input.dispatchEvent(new Event('input'));
        await vi.advanceTimersByTimeAsync(100);
      }
      expect(router.url).toBe('/katalog');
      await vi.advanceTimersByTimeAsync(500);
    } finally {
      vi.useRealTimers();
    }
    await tick();
    expect(router.url).toBe('/katalog?q=uy');
    harness.detectChanges();
    lists().forEach((r) => r.flush(okPage([])));
  });

  it('numbers and checkboxes go into the address; a wrong number clears that filter', async () => {
    await open('/katalog?minArea=50');
    const box = el().querySelector('input[type=checkbox]') as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    await tick();
    expect(router.url).toBe('/katalog?minArea=50&auction=1');
    harness.detectChanges();
    lists().forEach((r) => r.flush(okPage([])));

    const area = el().querySelector('input[aria-label^="Maydon, m²: dan"]') as HTMLInputElement;
    area.value = 'abc';
    area.dispatchEvent(new Event('change'));
    await tick();
    expect(router.url).toBe('/katalog?auction=1');
    harness.detectChanges();
    lists().forEach((r) => r.flush(okPage([])));
  });

  it('clear removes the filters but keeps the sort', async () => {
    await open(`/katalog?q=uy&auction=1&sort=price_asc`);
    const clear = Array.from(el().querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Tozalash'),
    );
    clear?.click();
    await tick();
    expect(router.url).toBe('/katalog?sort=price_asc');
    harness.detectChanges();
    lists().forEach((r) => r.flush(okPage([])));
  });

  it('an empty result explains itself and offers to clear', async () => {
    await open('/katalog?q=nothing', [], 0);
    expect(el().textContent).toContain('Hech narsa topilmadi');
    expect(el().querySelectorAll('app-property-card').length).toBe(0);
    expect(Array.from(el().querySelectorAll('app-empty-state button')).length).toBe(1);
  });

  it('a failed call shows an error with the request id and a retry that asks again', async () => {
    await harness.navigateByUrl('/katalog');
    harness.detectChanges();
    const request: TestRequest = list();
    request.flush(failure(500, 'boom'), {
      status: 500,
      statusText: 'Error',
      headers: { 'X-Request-ID': 'req-77' },
    });
    backend.expectOne('/api/PropertyCategory/public').flush(ok([]));
    await tick();
    harness.detectChanges();
    expect(el().textContent).toContain('Server xatosi');
    expect(el().textContent).toContain('req-77');
    // A list that failed to load is not content for search engines.
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
    (el().querySelector('app-error-state button') as HTMLButtonElement).click();
    await tick();
    harness.detectChanges();
    list().flush(okPage([property(1)]));
    await tick();
    harness.detectChanges();
    expect(el().querySelectorAll('app-property-card').length).toBe(1);
  });

  it('a filtered list is kept out of search results; the plain catalog is not', async () => {
    await open('/katalog');
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'index, follow',
    );
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toMatch(
      /\/katalog$/,
    );
    harness.detectChanges();
    await router.navigateByUrl('/katalog?q=uy');
    harness.detectChanges();
    lists().forEach((r) => r.flush(okPage([])));
    await tick();
    harness.detectChanges();
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
  });

  it('lists the results as structured data', async () => {
    await open('/katalog', [property(1), property(2)], 2);
    const json = JSON.parse(
      document.head.querySelector('script[data-seo-jsonld]')?.textContent ?? '{}',
    );
    expect(json['@type']).toBe('ItemList');
    expect(json.itemListElement.map((x: { url: string }) => x.url.split('/').pop())).toEqual([
      'p1',
      'p2',
    ]);
  });
});
