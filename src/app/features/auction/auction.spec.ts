import { RESPONSE_INIT } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PublicAuctionDetail } from '../../api/models';
import { BidPlacedEvent } from '../../core/realtime/auction-live';
import { HUB_FACTORY } from '../../core/realtime/hub';
import { FakeHub } from '../../testing/fake-hub';
import { failure, ok, tick } from '../../testing/http-helpers';
import { AuctionPage } from './auction-page';
import { headlinePrice, isLiveStatus, patchFromBid, patchFromStatus } from './auction-view';

const NBSP = ' ';
const hours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

const auction = (over: Partial<PublicAuctionDetail> = {}): PublicAuctionDetail =>
  ({
    id: 'a1',
    lotNumber: '2026-014',
    status: 'ONGOING',
    startingPrice: 450_000_000,
    currentPrice: 512_000_000,
    minBidStep: 5_000_000,
    depositAmount: 20_000_000,
    applicationDeadline: hours(-30),
    startsAt: hours(-2),
    endsAt: hours(3),
    title: 'Auksion',
    description: null,
    extensionMinutes: 5,
    minNextBid: 517_000_000,
    propertyId: 'p1',
    propertyTitle: 'Chilonzordagi kvartira',
    participantCount: 4,
    bidCount: 9,
    outcome: null,
    finalPrice: null,
    ...over,
  }) as unknown as PublicAuctionDetail;

const bid = (over: Partial<BidPlacedEvent> = {}): BidPlacedEvent => ({
  auctionId: 'a1',
  participantNumber: 3,
  amount: 520_000_000,
  placedAt: hours(0),
  currentPrice: 520_000_000,
  minNextBid: 525_000_000,
  endsAt: hours(3),
  extended: false,
  bidCount: 10,
  ...over,
});

describe('auction view helpers', () => {
  it('headline price depends on the state', () => {
    expect(headlinePrice(auction({ status: 'SCHEDULED', currentPrice: null }))).toEqual({
      key: 'auction.startingPrice',
      amount: 450_000_000,
    });
    expect(headlinePrice(auction())).toEqual({ key: 'auction.currentPrice', amount: 512_000_000 });
    expect(headlinePrice(auction({ status: 'ONGOING', currentPrice: null }))).toEqual({
      key: 'auction.currentPrice',
      amount: 450_000_000,
    });
    expect(headlinePrice(auction({ status: 'FINISHED', finalPrice: 600_000_000 }))).toEqual({
      key: 'auction.finalPrice',
      amount: 600_000_000,
    });
  });

  it('holds a live connection only while the auction can still change', () => {
    expect(isLiveStatus('SCHEDULED')).toBe(true);
    expect(isLiveStatus('ONGOING')).toBe(true);
    for (const s of ['FINISHED', 'FAILED', 'CANCELLED', 'DRAFT'] as const)
      expect(isLiveStatus(s)).toBe(false);
  });

  it('applies a bid message, but not another auction’s and not an older one', () => {
    const current = { bidCount: 9 };
    expect(patchFromBid('a1', current, bid())).toMatchObject({
      currentPrice: 520_000_000,
      bidCount: 10,
    });
    expect(patchFromBid('a1', current, bid({ auctionId: 'other' }))).toBeNull();
    expect(patchFromBid('a1', current, bid({ bidCount: 8 }))).toBeNull();
    expect(patchFromStatus('a1', { auctionId: 'a1', status: 'FINISHED', endsAt: 'x' })).toEqual({
      status: 'FINISHED',
      endsAt: 'x',
    });
    expect(patchFromStatus('a1', { auctionId: 'zzz', status: 'FINISHED', endsAt: 'x' })).toBeNull();
  });
});

describe('AuctionPage', () => {
  let backend: HttpTestingController;
  let hubs: FakeHub[];
  let response: ResponseInit;

  beforeEach(() => {
    hubs = [];
    response = {};
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RESPONSE_INIT, useValue: response },
        {
          provide: HUB_FACTORY,
          useValue: () => {
            const hub = new FakeHub();
            hubs.push(hub);
            return hub;
          },
        },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  const detail = () => backend.expectOne((r) => r.url === '/api/Auction/public');
  const text = (el: HTMLElement) => (el.textContent ?? '').replace(/ +/g, ' ');

  async function load(data: PublicAuctionDetail | 'fail' | 404 = auction()) {
    const fixture = TestBed.createComponent(AuctionPage);
    fixture.componentRef.setInput('id', 'a1');
    fixture.detectChanges();
    const request = detail();
    if (data === 'fail') request.flush(failure(500, 'boom'), { status: 500, statusText: 'Error' });
    else if (data === 404)
      request.flush(failure(404, 'nf'), { status: 404, statusText: 'Not Found' });
    else request.flush(ok(data));
    await tick();
    fixture.detectChanges();
    fixture.detectChanges();
    await tick();
    fixture.detectChanges();
    return fixture;
  }

  it('shows the state, the prices, the counts, the dates and where to go next', async () => {
    const fixture = await load();
    const t = text(fixture.nativeElement);
    expect(t).toContain('Chilonzordagi kvartira');
    expect(t).toContain('Savdo ketmoqda');
    expect(t).toContain('Lot 2026-014');
    expect(t).toContain(`512${NBSP}000${NBSP}000${NBSP}so‘m`);
    expect(t).toContain('Keyingi minimal taklif');
    expect(fixture.nativeElement.querySelector('a[href="/obyekt/p1"]')).toBeTruthy();
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toMatch(
      /\/auksion\/a1$/,
    );
    // Ongoing: one clock, to the end.
    expect(fixture.nativeElement.querySelectorAll('.timers app-countdown').length).toBe(1);
  });

  it('a scheduled auction counts to the deadline and to the start; a finished one has no clock', async () => {
    let fixture = await load(
      auction({ status: 'SCHEDULED', applicationDeadline: hours(10), startsAt: hours(20) }),
    );
    expect(fixture.nativeElement.querySelectorAll('.timers app-countdown').length).toBe(2);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: HUB_FACTORY, useValue: () => new FakeHub() },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = await load(auction({ status: 'FINISHED', outcome: 'SOLD', finalPrice: 600_000_000 }));
    expect(fixture.nativeElement.querySelector('.timers')).toBeNull();
    const t = text(fixture.nativeElement);
    expect(t).toContain('Obyekt sotildi. G‘olibning shaxsi ko‘rsatilmaydi.');
    expect(t).toContain('Yakuniy narx');
    expect(t).toContain(`600${NBSP}000${NBSP}000`);
  });

  it('says what happened to an auction that did not sell, with the reason', async () => {
    for (const [outcome, phrase] of [
      ['NO_BIDS', 'Taklif berilmagani'],
      ['NO_PARTICIPANTS', 'Ishtirokchilar bo‘lmagani'],
      ['AWAITING_RUNNER_UP', 'keyingi o‘rindagi'],
    ] as const) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: HUB_FACTORY, useValue: () => new FakeHub() },
        ],
      });
      backend = TestBed.inject(HttpTestingController);
      const fixture = await load(auction({ status: 'FINISHED', outcome }));
      expect(text(fixture.nativeElement)).toContain(phrase);
    }
  });

  it('connects to the live stream in the browser and shows that it is live', async () => {
    const fixture = await load();
    await tick();
    fixture.detectChanges();
    expect(hubs.length).toBe(1);
    expect(hubs[0].invoked).toEqual([{ method: 'Join', args: ['a1'] }]);
    expect(fixture.nativeElement.querySelector('.live')?.getAttribute('data-state')).toBe(
      'connected',
    );
  });

  it('a bid message updates the price, the minimum next bid and the count at once, and is announced', async () => {
    const fixture = await load();
    await tick();
    hubs[0].send('BidPlaced', bid());
    fixture.detectChanges();
    const t = text(fixture.nativeElement);
    expect(t).toContain(`520${NBSP}000${NBSP}000${NBSP}so‘m`);
    expect(t).toContain(`525${NBSP}000${NBSP}000`);
    expect(fixture.nativeElement.querySelector('[aria-live="polite"]')?.textContent).toContain(
      'Yangi taklif',
    );
    expect(fixture.nativeElement.querySelector('.facts')?.textContent).toContain('10');
  });

  it('shows a note when a bid extended the time, and uses the new end', async () => {
    const fixture = await load();
    await tick();
    const newEnd = hours(3.1);
    hubs[0].send('BidPlaced', bid({ extended: true, endsAt: newEnd }));
    fixture.detectChanges();
    expect(text(fixture.nativeElement)).toContain('Savdo vaqti uzaytirildi.');
    expect(fixture.nativeElement.querySelector('.timers time')?.getAttribute('datetime')).toBe(
      newEnd,
    );
  });

  it('a message for another auction, or an older bid, changes nothing', async () => {
    const fixture = await load();
    await tick();
    hubs[0].send('BidPlaced', bid({ auctionId: 'other' }));
    hubs[0].send('BidPlaced', bid({ bidCount: 3, currentPrice: 1 }));
    fixture.detectChanges();
    expect(text(fixture.nativeElement)).toContain(`512${NBSP}000${NBSP}000`);
  });

  it('a status message shows the new state and then asks the server for the real outcome', async () => {
    const fixture = await load();
    await tick();
    hubs[0].send('AuctionStatusChanged', {
      auctionId: 'a1',
      status: 'FINISHED',
      endsAt: hours(-0.01),
    });
    fixture.detectChanges();
    expect(text(fixture.nativeElement)).toContain('Yakunlangan');
    detail().flush(ok(auction({ status: 'FINISHED', outcome: 'SOLD', finalPrice: 520_000_000 })));
    await tick();
    fixture.detectChanges();
    expect(text(fixture.nativeElement)).toContain('Obyekt sotildi.');
    expect(text(fixture.nativeElement)).toContain(`520${NBSP}000${NBSP}000`);
    // The auction is over: the live connection is closed.
    await tick();
    expect(hubs[0].stopped).toBeGreaterThan(0);
  });

  it('after the connection comes back it reloads, because messages in between were not replayed', async () => {
    const fixture = await load();
    await tick();
    hubs[0].dropConnection();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.live')?.getAttribute('data-state')).toBe(
      'reconnecting',
    );
    hubs[0].restoreConnection();
    await tick();
    fixture.detectChanges();
    await tick();
    detail().flush(ok(auction({ currentPrice: 540_000_000, bidCount: 12 })));
    await tick();
    fixture.detectChanges();
    expect(text(fixture.nativeElement)).toContain(`540${NBSP}000${NBSP}000`);
  });

  it('a finished auction opens no live connection', async () => {
    await load(auction({ status: 'FINISHED', outcome: 'NOT_SOLD' }));
    await tick();
    expect(hubs.length).toBe(0);
  });

  it('when a clock reaches zero it asks the server a moment later', async () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(AuctionPage);
      fixture.componentRef.setInput('id', 'a1');
      fixture.detectChanges();
      detail().flush(ok(auction({ endsAt: new Date(Date.now() + 1500).toISOString() })));
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(2100);
      fixture.detectChanges();
      backend.expectNone('/api/Auction/public');
      await vi.advanceTimersByTimeAsync(1600);
      detail().flush(ok(auction({ status: 'FINISHED', outcome: 'NO_BIDS' })));
    } finally {
      vi.useRealTimers();
    }
  });

  it('an unknown auction answers 404 and is not indexed; a server error offers a retry', async () => {
    let fixture = await load(404);
    expect(response.status).toBe(404);
    expect(text(fixture.nativeElement)).toContain('Sahifa topilmadi');
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    );

    TestBed.resetTestingModule();
    const again: ResponseInit = {};
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RESPONSE_INIT, useValue: again },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = await load('fail');
    expect(again.status).toBe(500);
    expect(fixture.nativeElement.querySelector('app-error-state button')).toBeTruthy();
  });
});
