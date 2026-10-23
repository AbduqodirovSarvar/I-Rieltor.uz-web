import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicPropertyListItem, PublicSlide } from '../../api/models';
import { failure, ok, okPage, tick } from '../../testing/http-helpers';
import { HeroSlider, slideDelay } from './hero-slider';
import { HomePage, withAuctionStatus } from './home-page';

const hours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

const item = (
  id: string,
  status: 'ONGOING' | 'SCHEDULED' | 'FINISHED' | null,
): PublicPropertyListItem =>
  ({
    id,
    title: `Obyekt ${id}`,
    categoryId: 'c',
    categoryName: 'Kvartira',
    status: 'IN_AUCTION',
    region: 'Toshkent',
    district: null,
    areaSqm: null,
    landAreaSotix: null,
    rooms: null,
    floor: null,
    totalFloors: null,
    cover: null,
    createdAt: hours(-1),
    auction: status
      ? {
          id: `a${id}`,
          lotNumber: null,
          status,
          startingPrice: 100,
          currentPrice: null,
          minBidStep: 1,
          depositAmount: 1,
          applicationDeadline: hours(1),
          startsAt: hours(2),
          endsAt: hours(3),
        }
      : null,
  }) as unknown as PublicPropertyListItem;

const slide = (id: string, durationMs = 4000): PublicSlide => ({
  id,
  title: `Slayd ${id}`,
  subtitle: null,
  content: null,
  order: 1,
  durationMs,
  image: { url: `/uploads/${id}.jpg`, alt: `rasm ${id}`, type: 'ImageJpeg' },
});

describe('slideDelay', () => {
  it('keeps the delay within limits and falls back for nonsense', () => {
    expect(slideDelay(1)).toBe(3000);
    expect(slideDelay(5000)).toBe(5000);
    expect(slideDelay(999_999)).toBe(30_000);
    expect(slideDelay(0)).toBe(6000);
    expect(slideDelay(null)).toBe(6000);
  });
});

describe('HeroSlider', () => {
  const slides = [slide('a'), slide('b'), slide('c')];

  function create(matchesReducedMotion = false) {
    vi.useFakeTimers();
    (document.defaultView as unknown as { matchMedia: unknown }).matchMedia = () => ({
      matches: matchesReducedMotion,
    });
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HeroSlider);
    fixture.componentRef.setInput('slides', slides);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  const shown = (el: HTMLElement) =>
    Array.from(el.querySelectorAll<HTMLElement>('.slide')).findIndex((s) => !s.hidden);

  afterEach(() => vi.useRealTimers());

  it('has every slide in the markup, shows the first, and loads only that picture with priority', () => {
    const fixture = create();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.slide').length).toBe(3);
    expect(shown(el)).toBe(0);
    const images = el.querySelectorAll('img');
    expect(images[0].getAttribute('loading')).toBe('eager');
    expect(images[0].getAttribute('fetchpriority')).toBe('high');
    expect(images[1].getAttribute('loading')).toBe('lazy');
  });

  it('moves on by itself after the slide’s time, and the pause button stops it', async () => {
    const fixture = create();
    const el: HTMLElement = fixture.nativeElement;
    await vi.advanceTimersByTimeAsync(4100);
    fixture.detectChanges();
    expect(shown(el)).toBe(1);

    el.querySelector<HTMLButtonElement>('button[aria-label="Slaydlarni to‘xtatish"]')?.click();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(20_000);
    fixture.detectChanges();
    expect(shown(el)).toBe(1);
    expect(el.querySelector('button[aria-label="Slaydlarni davom ettirish"]')).toBeTruthy();
  });

  it('waits while the pointer is over it', async () => {
    const fixture = create();
    const el: HTMLElement = fixture.nativeElement;
    el.querySelector('section')?.dispatchEvent(new Event('mouseenter'));
    await vi.advanceTimersByTimeAsync(20_000);
    fixture.detectChanges();
    expect(shown(el)).toBe(0);
    el.querySelector('section')?.dispatchEvent(new Event('mouseleave'));
    await vi.advanceTimersByTimeAsync(4100);
    fixture.detectChanges();
    expect(shown(el)).toBe(1);
  });

  it('never moves by itself for a person who asked for less motion', async () => {
    const fixture = create(true);
    await vi.advanceTimersByTimeAsync(60_000);
    fixture.detectChanges();
    expect(shown(fixture.nativeElement)).toBe(0);
  });

  it('buttons and arrow keys wrap around, and every control has a name', () => {
    const fixture = create();
    const el: HTMLElement = fixture.nativeElement;
    const section = el.querySelector('section') as HTMLElement;
    section.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(shown(el)).toBe(2);
    section.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(shown(el)).toBe(0);
    for (const button of Array.from(el.querySelectorAll('button')))
      expect(button.getAttribute('aria-label')).toBeTruthy();
    expect(el.querySelectorAll('.dot').length).toBe(3);
    expect(el.querySelector('.dot.active')?.getAttribute('aria-current')).toBe('true');
  });

  it('a single slide has no controls and no timer', async () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HeroSlider);
    fixture.componentRef.setInput('slides', [slide('only')]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.controls')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('withAuctionStatus', () => {
  it('keeps the objects in the wanted state, at most six', () => {
    const items = [
      ...Array.from({ length: 8 }, (_, i) => item(`o${i}`, 'ONGOING')),
      item('s1', 'SCHEDULED'),
      item('f1', 'FINISHED'),
      item('n1', null),
    ];
    expect(withAuctionStatus(items, 'ONGOING').length).toBe(6);
    expect(withAuctionStatus(items, 'SCHEDULED').map((p) => p.id)).toEqual(['s1']);
  });
});

describe('HomePage', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  async function load(
    options: {
      slides?: PublicSlide[] | 'fail';
      auctions?: PublicPropertyListItem[] | 'fail';
      newest?: PublicPropertyListItem[];
    } = {},
  ) {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    await tick();
    fixture.detectChanges();
    const answer = (url: (u: string) => boolean, body: unknown | 'fail') => {
      const request = backend.expectOne((r) => url(r.url) || url(r.urlWithParams));
      if (body === 'fail')
        request.flush(failure(500, 'boom'), { status: 500, statusText: 'Error' });
      else request.flush(body as object);
    };
    answer(
      (u) => u.includes('Slide/public'),
      options.slides === 'fail' ? 'fail' : ok(options.slides ?? []),
    );
    answer((u) => u.includes('PropertyCategory/public'), ok([]));
    answer(
      (u) => u.includes('Property/public/list') && u.includes('OnlyInAuction=true'),
      options.auctions === 'fail' ? 'fail' : okPage(options.auctions ?? []),
    );
    answer(
      (u) => u.includes('Property/public/list') && !u.includes('OnlyInAuction'),
      okPage(options.newest ?? []),
    );
    await tick();
    fixture.detectChanges();
    await tick();
    fixture.detectChanges();
    return fixture;
  }

  const titles = (fixture: { nativeElement: HTMLElement }, section: string) =>
    Array.from(
      fixture.nativeElement.querySelectorAll(`section[aria-labelledby="${section}"] h3 a`),
    ).map((a) => a.textContent?.trim());

  it('splits the auction objects into "on now" and "soon", and lists the newest', async () => {
    const fixture = await load({
      auctions: [item('1', 'SCHEDULED'), item('2', 'ONGOING'), item('3', 'FINISHED')],
      newest: [item('9', null)],
    });
    expect(titles(fixture, 'ongoing-title')).toEqual(['Obyekt 2']);
    expect(titles(fixture, 'upcoming-title')).toEqual(['Obyekt 1']);
    expect(titles(fixture, 'newest-title')).toEqual(['Obyekt 9']);
  });

  it('says so when nothing is on or coming, instead of leaving a hole', async () => {
    const fixture = await load();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Hozir faol savdolar yo‘q.');
    expect(text).toContain('Yaqin vaqtda boshlanadigan savdolar yo‘q.');
    expect(text).toContain('Hozircha obyektlar yo‘q.');
  });

  it('shows a banner instead of slides when there are none or they fail, and keeps the rest', async () => {
    for (const slides of [[], 'fail'] as const) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      });
      backend = TestBed.inject(HttpTestingController);
      const fixture = await load({
        slides: slides as PublicSlide[] | 'fail',
        newest: [item('9', null)],
      });
      expect(fixture.nativeElement.querySelector('app-hero-slider')).toBeNull();
      expect(fixture.nativeElement.querySelector('.hero-fallback a')?.getAttribute('href')).toBe(
        '/katalog',
      );
      expect(titles(fixture, 'newest-title')).toEqual(['Obyekt 9']);
    }
  });

  it('one failed block does not blank the page', async () => {
    const fixture = await load({ auctions: 'fail', newest: [item('9', null)] });
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ma’lumotni yuklab bo‘lmadi.');
    expect(titles(fixture, 'newest-title')).toEqual(['Obyekt 9']);
  });

  it('has one h1, the steps in order, and the questions', async () => {
    const fixture = await load({ slides: [slide('a')] });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelectorAll('.steps li').length).toBe(4);
    expect(el.querySelectorAll('details').length).toBe(5);
    expect(
      document.head.querySelector('script[type="application/ld+json"]')?.textContent,
    ).toContain('SearchAction');
  });
});
