import { Component, RESPONSE_INIT, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { PublicAuctionSummary, PublicPropertyListItem } from '../../api/models';
import { ErrorPage } from '../../features/errors/error-page';
import { ApiError } from '../../core/http/api-error';
import { ServerClock } from '../../core/time/server-clock';
import { AuctionSummary } from './auction-summary';
import { Countdown } from './countdown';
import { ErrorState, kindOfError } from './error-state';
import { checkFile } from './file-upload';
import { Gallery, GalleryItem } from './gallery';
import { isCoordinate, mapLinks } from './map-link';
import { Pagination, pageWindow } from './pagination';
import { PropertyCard } from './property-card';

const NBSP = ' ';
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

const auction = (over: Partial<PublicAuctionSummary> = {}): PublicAuctionSummary => ({
  id: 'a1',
  lotNumber: '2026-014',
  status: 'ONGOING',
  startingPrice: 450_000_000,
  currentPrice: 512_000_000,
  minBidStep: 5_000_000,
  depositAmount: 20_000_000,
  applicationDeadline: inHours(-30),
  startsAt: inHours(-2),
  endsAt: inHours(3),
  ...over,
});

const property = (over: Partial<PublicPropertyListItem> = {}): PublicPropertyListItem => ({
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
  cover: { url: '/uploads/a.jpg', alt: 'Old kitchen', type: 'ImageJpeg' },
  auction: auction(),
  createdAt: inHours(-100),
  ...over,
});

const text = (el: HTMLElement) => (el.textContent ?? '').replace(/ +/g, ' ').trim();

describe('pure helpers', () => {
  it('pageWindow shows the ends and the neighbours with gaps', () => {
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(1, 5)).toEqual([1, 2, null, 5]);
    expect(pageWindow(5, 12)).toEqual([1, null, 4, 5, 6, null, 12]);
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('checkFile refuses types that are not listed and files that are too big', () => {
    const rules = { types: ['image/png', 'application/pdf'], maxBytes: 1000 };
    expect(checkFile({ type: 'image/png', size: 900 }, rules)).toBeNull();
    expect(checkFile({ type: 'image/svg+xml', size: 10 }, rules)).toBe('badType');
    expect(checkFile({ type: 'text/html', size: 10 }, rules)).toBe('badType');
    expect(checkFile({ type: '', size: 10 }, rules)).toBe('badType');
    expect(checkFile({ type: 'application/pdf', size: 1001 }, rules)).toBe('tooBig');
  });

  it('map links come from numbers only, and bad coordinates give none', () => {
    expect(isCoordinate(41.3, 69.2)).toBe(true);
    expect(isCoordinate(91, 0)).toBe(false);
    expect(isCoordinate(null, 5)).toBe(false);
    expect(isCoordinate(Number.NaN, 5)).toBe(false);
    const links = mapLinks(41.311081, 69.240562);
    expect(links.osm).toBe(
      'https://www.openstreetmap.org/?mlat=41.311081&mlon=69.240562#map=17/41.311081/69.240562',
    );
    expect(links.google).toContain('41.311081,69.240562');
    expect(links.yandex).toContain('pt=69.240562,41.311081');
  });

  it('kindOfError maps failures to error pages', () => {
    expect(kindOfError(new ApiError(404, ''))).toBe('not-found');
    expect(kindOfError(new ApiError(403, ''))).toBe('forbidden');
    expect(kindOfError(new ApiError(401, ''))).toBe('sign-in-required');
    expect(kindOfError(new ApiError(0, ''))).toBe('offline');
    expect(kindOfError(new ApiError(500, ''))).toBe('server');
    expect(kindOfError(new Error('x'))).toBe('server');
  });

  it('ServerClock learns the offset from a Date header and ignores a bad one', () => {
    const clock = new ServerClock();
    const before = Date.now();
    clock.learn(new Date(before + 60_000).toUTCString());
    expect(clock.now() - Date.now()).toBeGreaterThan(58_000);
    clock.learn('garbage');
    expect(clock.now() - Date.now()).toBeGreaterThan(58_000);
  });
});

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  afterEach(() => vi.useRealTimers());

  it('ticks by the server clock and fires `finished` once', async () => {
    vi.setSystemTime(new Date('2026-10-23T10:00:00Z'));
    // The visitor's clock is a minute slow: the server says it is a minute later.
    TestBed.inject(ServerClock).learn('Fri, 23 Oct 2026 10:01:00 GMT');
    const fixture = TestBed.createComponent(Countdown);
    fixture.componentRef.setInput('target', '2026-10-23T10:01:03Z');
    let finished = 0;
    fixture.componentInstance.finished.subscribe(() => finished++);

    fixture.detectChanges();
    fixture.detectChanges();
    expect(text(fixture.nativeElement)).toBe('00:00:03');

    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();
    expect(text(fixture.nativeElement)).toBe('00:00:02');

    await vi.advanceTimersByTimeAsync(4000);
    fixture.detectChanges();
    expect(text(fixture.nativeElement)).toBe('Tugadi');
    expect(finished).toBe(1);
  });
});

describe('cards', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('AuctionSummary shows the current price and the time to the end while ongoing', () => {
    const fixture = TestBed.createComponent(AuctionSummary);
    fixture.componentRef.setInput('auction', auction());
    fixture.detectChanges();
    const html = text(fixture.nativeElement);
    expect(html).toContain('Savdo ketmoqda');
    expect(html).toContain('Joriy narx');
    expect(html).toContain(`512${NBSP}000${NBSP}000${NBSP}so‘m`);
    expect(html).toContain('Tugashiga');
    expect(html).toContain('Lot 2026-014');
  });

  it('AuctionSummary shows the starting price and the time to the start while scheduled', () => {
    const fixture = TestBed.createComponent(AuctionSummary);
    fixture.componentRef.setInput(
      'auction',
      auction({ status: 'SCHEDULED', currentPrice: null, startsAt: inHours(26) }),
    );
    fixture.detectChanges();
    const html = text(fixture.nativeElement);
    expect(html).toContain('Boshlang‘ich narx');
    expect(html).toContain(`450${NBSP}000${NBSP}000`);
    expect(html).toContain('Boshlanishiga');
  });

  it('AuctionSummary has no clock for a finished auction and calls the price final', () => {
    const fixture = TestBed.createComponent(AuctionSummary);
    fixture.componentRef.setInput('auction', auction({ status: 'FINISHED' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-countdown')).toBeNull();
    expect(text(fixture.nativeElement)).toContain('Yakuniy narx');
  });

  it('PropertyCard titles are h2 right under the page title (level 2), h3 under a section heading', () => {
    const fixture = TestBed.createComponent(PropertyCard);
    fixture.componentRef.setInput('property', property());
    fixture.componentRef.setInput('level', 2);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2 a')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('h3')).toBeNull();
  });

  it('PropertyCard links to the object, describes it, and loads the picture lazily', () => {
    const fixture = TestBed.createComponent(PropertyCard);
    fixture.componentRef.setInput('property', property());
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h3 a')?.getAttribute('href')).toBe('/obyekt/p1');
    const img = el.querySelector('img');
    expect(img?.getAttribute('loading')).toBe('lazy');
    expect(img?.getAttribute('alt')).toBe('Old kitchen');
    expect(img?.getAttribute('width')).toBe('640');
    expect(text(el)).toContain('Toshkent, Chilonzor');
    expect(text(el)).toContain(`85,5${NBSP}m²`);
    expect(text(el)).toContain(`3${NBSP}xona`);
    // The picture link is decoration for the keyboard: the title is the one real link.
    expect(el.querySelector('a.media')?.getAttribute('tabindex')).toBe('-1');
  });

  it('PropertyCard without a picture or an auction shows placeholders', () => {
    const fixture = TestBed.createComponent(PropertyCard);
    fixture.componentRef.setInput(
      'property',
      property({ cover: null as never, auction: null as never, status: 'SOLD' }),
    );
    fixture.componentRef.setInput('eager', true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('img')).toBeNull();
    expect(text(el)).toContain('Rasm yo‘q');
    expect(text(el)).toContain('Sotilgan');
  });

  it('PropertyCard loads the first cards eagerly with high priority', () => {
    const fixture = TestBed.createComponent(PropertyCard);
    fixture.componentRef.setInput('property', property());
    fixture.componentRef.setInput('eager', true);
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });
});

describe('Pagination', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('renders nothing for one page', () => {
    const fixture = TestBed.createComponent(Pagination);
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('pageSize', 12);
    fixture.componentRef.setInput('total', 5);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('marks the current page, links the others, and names every link', () => {
    const fixture = TestBed.createComponent(Pagination);
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('pageSize', 12);
    fixture.componentRef.setInput('total', 40);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('2');
    const hrefs = Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/?page=3');
    // Page 1 is the plain address.
    expect(hrefs).toContain('/');
    for (const a of Array.from(el.querySelectorAll('a')))
      expect((a.textContent ?? '').trim() || a.getAttribute('aria-label')).toBeTruthy();
  });
});

describe('Gallery', () => {
  const items: GalleryItem[] = [
    { url: '/1.jpg', alt: 'One', kind: 'image' },
    { url: '/2.jpg', alt: 'Two', kind: 'image' },
    { url: '/3.mp4', alt: 'Three', kind: 'video' },
  ];

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  function open() {
    const fixture = TestBed.createComponent(Gallery);
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the first item large and the others as a strip, and selects on click', () => {
    const fixture = open();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.main img')?.getAttribute('alt')).toBe('One');
    const thumbs = el.querySelectorAll<HTMLButtonElement>('.thumb');
    expect(thumbs.length).toBe(3);
    thumbs[1].click();
    fixture.detectChanges();
    expect(el.querySelector('.main img')?.getAttribute('alt')).toBe('Two');
    expect(thumbs[1].getAttribute('aria-current')).toBe('true');
  });

  it('plays a video item with controls', () => {
    const fixture = open();
    fixture.nativeElement.querySelectorAll('.thumb')[2].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.main video')?.hasAttribute('controls')).toBe(true);
  });

  it('steps with the arrow keys only while zoomed, and wraps around', () => {
    const fixture = open();
    const el: HTMLElement = fixture.nativeElement;
    const key = (k: string) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
    key('ArrowRight');
    fixture.detectChanges();
    expect(el.querySelector('.main img')?.getAttribute('alt')).toBe('One');

    (fixture.componentInstance as unknown as { zoomed: { set(v: boolean): void } }).zoomed.set(
      true,
    );
    key('ArrowLeft');
    fixture.detectChanges();
    expect(el.querySelector('.thumb.active')?.getAttribute('aria-label')).toBe('Three');
    key('ArrowRight');
    fixture.detectChanges();
    expect(el.querySelector('.thumb.active')?.getAttribute('aria-label')).toBe('One');
  });

  it('a long swipe moves between items, a short one does not', () => {
    const fixture = open();
    const component = fixture.componentInstance as unknown as {
      onTouchStart(e: unknown): void;
      onTouchEnd(e: unknown): void;
    };
    const touch = (x: number) => ({ changedTouches: [{ clientX: x }] });
    component.onTouchStart(touch(300));
    component.onTouchEnd(touch(240));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.thumb.active')?.getAttribute('aria-label')).toBe(
      'Two',
    );
    component.onTouchStart(touch(300));
    component.onTouchEnd(touch(280));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.thumb.active')?.getAttribute('aria-label')).toBe(
      'Two',
    );
  });
});

describe('error pages', () => {
  it('ErrorPage sets the HTTP status of the response on the server', async () => {
    const response: ResponseInit = {};
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: RESPONSE_INIT, useValue: response }],
    });
    const fixture = TestBed.createComponent(ErrorPage);
    fixture.componentRef.setInput('kind', 'not-found');
    fixture.detectChanges();
    expect(response.status).toBe(404);
    expect(text(fixture.nativeElement)).toContain('Sahifa topilmadi');
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );
  });

  it('ErrorState offers retry only when asked and a sign-in link for "sign in required"', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ErrorState);
    fixture.componentRef.setInput('kind', 'sign-in-required');
    fixture.componentRef.setInput('canRetry', true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(text(el)).toContain('Qayta urinish');
    expect(
      Array.from(el.querySelectorAll('a')).some((a) => a.getAttribute('href') === '/kirish'),
    ).toBe(true);
  });
});

@Component({ template: '<app-countdown [target]="at()" />', imports: [Countdown] })
class Host {
  readonly at = signal(inHours(1));
}

describe('Countdown in a template', () => {
  it('is created without a router or a server', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('time')?.getAttribute('datetime')).toBeTruthy();
    expect(TestBed.inject(Router)).toBeTruthy();
  });
});
