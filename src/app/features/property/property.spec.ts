import { RESPONSE_INIT } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicPropertyDetail } from '../../api/models';
import { failure, ok, okPage, tick } from '../../testing/http-helpers';
import { PropertyPage } from './property-page';
import { documentsOf, galleryItems, productJsonLd, summaryOf } from './property-view';

const NBSP = ' ';
const hours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const url = (u: string | null | undefined) => (u ? `https://cdn.test${u}` : '');

const property = (over: Partial<PublicPropertyDetail> = {}): PublicPropertyDetail =>
  ({
    id: 'p1',
    title: '3 xonali kvartira',
    categoryId: 'c1',
    categoryName: 'Kvartira',
    status: 'IN_AUCTION',
    region: 'Toshkent',
    district: 'Chilonzor',
    areaSqm: 85.5,
    landAreaSotix: null,
    rooms: 3,
    floor: 4,
    totalFloors: 9,
    cover: null,
    createdAt: hours(-5),
    auction: {
      id: 'a1',
      lotNumber: '2026-014',
      status: 'SCHEDULED',
      startingPrice: 450_000_000,
      currentPrice: null,
      minBidStep: 5_000_000,
      depositAmount: 20_000_000,
      applicationDeadline: hours(20),
      startsAt: hours(26),
      endsAt: hours(50),
    },
    description: 'Yaxshi ta’mirlangan.\nMarkazga yaqin.',
    address: 'Bunyodkor 12',
    latitude: 41.2,
    longitude: 69.2,
    cadastralNumber: '10:01',
    buildYear: 2018,
    estimatedValue: 600_000_000,
    sellerName: 'MChJ Sotuvchi',
    viewCount: 1234,
    media: [],
    ...over,
  }) as unknown as PublicPropertyDetail;

const file = (u: string, alt: string | null = null) => ({ url: u, alt, type: 'ImagePng' as const });

describe('property view helpers', () => {
  it('puts the cover first, keeps documents out of the gallery, and names pictures that have no name', () => {
    const items = galleryItems(
      property({
        media: [
          { kind: 'IMAGE', title: null, isCover: false, file: file('/b.jpg') },
          { kind: 'DOCUMENT', title: 'Hujjat', isCover: false, file: file('/d.pdf') },
          { kind: 'VIDEO', title: 'Video', isCover: false, file: file('/v.mp4') },
          { kind: 'IMAGE', title: 'Asosiy', isCover: true, file: file('/a.jpg') },
          { kind: 'IMAGE', title: null, isCover: false, file: file('') },
        ],
      }),
      url,
      (title, n) => `${title} #${n}`,
    );
    expect(items.map((i) => [i.url, i.kind, i.alt])).toEqual([
      ['https://cdn.test/a.jpg', 'image', 'Asosiy'],
      ['https://cdn.test/b.jpg', 'image', '3 xonali kvartira #2'],
      ['https://cdn.test/v.mp4', 'video', 'Video'],
    ]);
  });

  it('falls back to the cover when there are no media', () => {
    const items = galleryItems(property({ cover: file('/c.jpg', 'Old') }), url, () => '');
    expect(items).toEqual([{ url: 'https://cdn.test/c.jpg', alt: 'Old', kind: 'image' }]);
    expect(galleryItems(property(), url, () => '')).toEqual([]);
  });

  it('lists only documents that have a file', () => {
    const docs = documentsOf(
      property({
        media: [
          { kind: 'DOCUMENT', title: 'A', isCover: false, file: file('/a.pdf') },
          { kind: 'DOCUMENT', title: 'B', isCover: false, file: file('') },
          { kind: 'IMAGE', title: 'C', isCover: false, file: file('/c.jpg') },
        ],
      }),
    );
    expect(docs.map((d) => d.title)).toEqual(['A']);
  });

  it('summarises the description at a word, or the basic facts when there is none', () => {
    expect(summaryOf(property({ description: 'Qisqa\n matn ' }))).toBe('Qisqa matn');
    const long = summaryOf(property({ description: 'so‘z '.repeat(100) }), 60);
    expect(long.length).toBeLessThanOrEqual(61);
    expect(long.endsWith('…')).toBe(true);
    expect(summaryOf(property({ description: null }))).toBe('Kvartira, Toshkent, Chilonzor');
  });

  it('writes Product data with the price of the auction, and no offer without one', () => {
    const data = productJsonLd(
      property(),
      'https://x/obyekt/p1',
      ['https://x/a.jpg'],
      'Tavsif',
    ) as {
      offers: { price: number; priceCurrency: string; availability: string };
      image: string[];
    };
    expect(data.offers).toMatchObject({ price: 450_000_000, priceCurrency: 'UZS' });
    expect(data.offers.availability).toBe('https://schema.org/InStock');
    expect(data.image).toEqual(['https://x/a.jpg']);
    expect(productJsonLd(property({ status: 'SOLD' }), 'u', [], 'd')).toHaveProperty(
      'offers.availability',
      'https://schema.org/SoldOut',
    );
    const bare = productJsonLd(property({ auction: null as never }), 'u', [], 'd');
    expect(bare).not.toHaveProperty('offers');
    expect(bare).not.toHaveProperty('image');
  });
});

describe('PropertyPage', () => {
  let backend: HttpTestingController;
  let response: ResponseInit;

  beforeEach(() => {
    response = {};
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RESPONSE_INIT, useValue: response },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  async function load(
    answer: (detail: ReturnType<HttpTestingController['expectOne']>) => void,
    id = 'p1',
  ) {
    const fixture = TestBed.createComponent(PropertyPage);
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    answer(backend.expectOne((r) => r.url === '/api/Property/public'));
    await tick();
    fixture.detectChanges();
    // The "similar objects" list asks once the object is known.
    for (const r of backend.match((r) => r.url === '/api/Property/public/list'))
      r.flush(
        okPage([
          { id: 'p1', title: 'Self' },
          { id: 'p2', title: 'Boshqa 2' },
          { id: 'p3', title: 'Boshqa 3' },
        ]),
      );
    backend.match('/api/PropertyCategory/public');
    await tick();
    fixture.detectChanges();
    await tick();
    fixture.detectChanges();
    return fixture;
  }

  it('shows the facts, the description, the documents, the map links and the auction with what to do', async () => {
    const fixture = await load((r) =>
      r.flush(
        ok(
          property({
            media: [
              { kind: 'IMAGE', title: 'Asosiy', isCover: true, file: file('/uploads/a.jpg') },
              { kind: 'DOCUMENT', title: 'Kadastr', isCover: false, file: file('/uploads/d.pdf') },
            ],
          }),
        ),
      ),
    );
    const el: HTMLElement = fixture.nativeElement;
    const text = el.textContent ?? '';
    expect(el.querySelector('h1')?.textContent).toContain('3 xonali kvartira');
    expect(text).toContain(`85,5${NBSP}m²`);
    expect(text).toContain('4/9-qavat');
    expect(text).toContain(`600${NBSP}000${NBSP}000${NBSP}so‘m`);
    expect(text).toContain('MChJ Sotuvchi');
    expect(text).toContain('Ko‘rishlar: 1' + NBSP + '234');
    expect(el.querySelector('.text')?.textContent).toContain('Markazga yaqin.');
    expect(el.querySelector('.docs a')?.getAttribute('href')).toBe('/uploads/d.pdf');
    expect(el.querySelector('app-map-link a')?.getAttribute('href')).toContain('openstreetmap');
    expect(el.querySelector('.main img')?.getAttribute('alt')).toBe('Asosiy');
    expect(el.querySelector('app-auction-summary')).toBeTruthy();
    expect(el.querySelector('a[href="/auksion/a1"]')).toBeTruthy();
    expect(el.querySelectorAll('.similar app-property-card').length).toBe(2);
  });

  it('leaves out the facts the object does not have, and says when there is no auction', async () => {
    const fixture = await load((r) =>
      r.flush(
        ok(
          property({
            district: null,
            landAreaSotix: null,
            cadastralNumber: null,
            sellerName: null,
            description: null,
            latitude: null,
            longitude: null,
            auction: null as never,
          }),
        ),
      ),
    );
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('Kadastr raqami');
    expect(text).not.toContain('Sotuvchi');
    expect(text).not.toContain('Tavsif');
    expect(text).not.toContain('Joylashuv');
    expect(text).toContain('Bu obyekt hozircha auksionda emas.');
    expect(fixture.nativeElement.querySelector('app-apply-cta')).toBeNull();
  });

  it('writes the head: title, canonical, picture, Product and breadcrumb data', async () => {
    await load((r) =>
      r.flush(
        ok(
          property({
            media: [
              { kind: 'IMAGE', title: 'Asosiy', isCover: true, file: file('/uploads/a.jpg') },
            ],
          }),
        ),
      ),
    );
    expect(document.title).toBe('3 xonali kvartira | I-Rieltor');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toMatch(
      /\/obyekt\/p1$/,
    );
    expect(
      document.head.querySelector('meta[property="og:image"]')?.getAttribute('content'),
    ).toMatch(/\/uploads\/a\.jpg$/);
    const ld = document.head.querySelector('script[data-seo-jsonld]')?.textContent ?? '';
    expect(ld).toContain('"@type":"Product"');
    expect(ld).toContain('"@type":"BreadcrumbList"');
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'index, follow',
    );
  });

  it('an object that does not exist answers 404 on the page and in the HTTP status, and is not indexed', async () => {
    const fixture = await load((r) =>
      r.flush(failure(404, 'Property not found'), { status: 404, statusText: 'Not Found' }),
    );
    expect(fixture.nativeElement.textContent).toContain('Sahifa topilmadi');
    expect(response.status).toBe(404);
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
    expect(fixture.nativeElement.querySelector('app-error-state button')).toBeNull();
  });

  it('a malformed id (400) is "not found" too', async () => {
    const fixture = await load(
      (r) => r.flush(failure(400, 'bad id'), { status: 400, statusText: 'Bad Request' }),
      'abc',
    );
    expect(response.status).toBe(404);
    expect(fixture.nativeElement.textContent).toContain('Sahifa topilmadi');
  });

  it('a server failure answers 500, shows the request id and offers a retry that asks again', async () => {
    const fixture = await load((r) =>
      r.flush(failure(500, 'boom'), {
        status: 500,
        statusText: 'Error',
        headers: { 'X-Request-ID': 'req-9' },
      }),
    );
    expect(response.status).toBe(500);
    expect(fixture.nativeElement.textContent).toContain('req-9');
    (fixture.nativeElement.querySelector('app-error-state button') as HTMLButtonElement).click();
    await tick();
    fixture.detectChanges();
    backend.expectOne((r) => r.url === '/api/Property/public').flush(ok(property()));
    await tick();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('3 xonali kvartira');
  });
});
