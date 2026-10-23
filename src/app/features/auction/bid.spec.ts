import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MyParticipation, PublicAuctionDetail, PublicBid } from '../../api/models';
import { TokenStore } from '../../core/auth/token-store';
import { Confirm } from '../../core/notify/confirm.service';
import { Notify } from '../../core/notify/notify.service';
import { BidPlacedEvent } from '../../core/realtime/auction-live';
import { HUB_FACTORY } from '../../core/realtime/hub';
import { FakeHub } from '../../testing/fake-hub';
import { hoursFromNow, participation } from '../../testing/factories';
import { failure, ok, okPage, tick } from '../../testing/http-helpers';
import { AuctionPage } from './auction-page';

const NBSP = ' ';
const auction = (over: Partial<PublicAuctionDetail> = {}): PublicAuctionDetail =>
  ({
    id: 'a1',
    lotNumber: '2026-014',
    status: 'ONGOING',
    startingPrice: 450_000_000,
    currentPrice: 512_000_000,
    minBidStep: 5_000_000,
    depositAmount: 20_000_000,
    applicationDeadline: hoursFromNow(-30),
    startsAt: hoursFromNow(-2),
    endsAt: hoursFromNow(3),
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

const ready = (over: Partial<MyParticipation> = {}) =>
  participation({
    auctionStatus: 'ONGOING',
    depositStatus: 'PAID',
    startsAt: hoursFromNow(-2),
    ...over,
  });

const session = {
  accessToken: 'a',
  refreshToken: 'r',
  accessTokenExpiration: new Date(Date.now() + 3_600_000).toISOString(),
  refreshTokenExpiration: new Date(Date.now() + 86_400_000).toISOString(),
  userId: 'u1',
};

describe('bidding on the auction page', () => {
  let backend: HttpTestingController;
  let hubs: FakeHub[];

  beforeEach(() => {
    localStorage.clear();
    hubs = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
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

  const text = (el: HTMLElement) => (el.textContent ?? '').replace(/ +/g, ' ');
  const request = (url: string) => backend.expectOne((r) => r.url === url);
  const all = (url: string) => backend.match((r) => r.url === url);

  async function open(
    options: {
      signedIn?: boolean;
      mine?: MyParticipation | null;
      bids?: PublicBid[];
      auction?: PublicAuctionDetail;
    } = {},
  ) {
    const { signedIn = true, mine = ready(), bids = [], auction: a = auction() } = options;
    if (signedIn) TestBed.inject(TokenStore).set(session);
    const fixture = TestBed.createComponent(AuctionPage);
    fixture.componentRef.setInput('id', 'a1');
    fixture.detectChanges();
    request('/api/Auction/public').flush(ok(a));
    all('/api/Bid/list').forEach((r) => r.flush(okPage(bids)));
    await tick();
    fixture.detectChanges();
    fixture.detectChanges();
    if (signedIn) {
      request('/api/Participation/my').flush(okPage(mine ? [mine] : []));
      await tick();
      fixture.detectChanges();
      fixture.detectChanges();
    } else {
      backend.expectNone('/api/Participation/my');
    }
    await tick();
    fixture.detectChanges();
    return fixture;
  }

  const panel = (f: { nativeElement: HTMLElement }) =>
    f.nativeElement.querySelector('app-bid-panel') as HTMLElement | null;
  const field = (f: { nativeElement: HTMLElement }) =>
    f.nativeElement.querySelector('#bid-amount') as HTMLInputElement;
  const submit = async (f: { nativeElement: HTMLElement; detectChanges(): void }) => {
    (f.nativeElement.querySelector('app-bid-panel form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await tick();
    f.detectChanges();
  };
  const bid = (n: number, amount: number, minutes: number): PublicBid => ({
    participantNumber: n,
    amount,
    placedAt: new Date(Date.UTC(2026, 9, 23, 10, minutes)).toISOString(),
  });

  it('a guest sees no bid form, and no session request is made', async () => {
    const f = await open({ signedIn: false });
    expect(panel(f)?.querySelector('form')).toBeNull();
    expect(text(f.nativeElement)).toContain('Ariza qabul qilish muddati tugagan.');
  });

  it('only an approved participant with the deposit paid sees the form', async () => {
    for (const mine of [null, ready({ status: 'PENDING' }), ready({ depositStatus: 'NOT_PAID' })]) {
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
      const f = await open({ mine });
      expect(panel(f)?.querySelector('form'), JSON.stringify(mine?.status)).toBeNull();
    }
  });

  it('starts at the minimum next bid and offers the minimum plus one, two and five steps', async () => {
    const f = await open();
    expect(field(f).value).toBe('517000000');
    const labels = Array.from(f.nativeElement.querySelectorAll('.quick button')).map((b) =>
      text(b as HTMLElement).trim(),
    );
    expect(labels).toEqual(
      [
        `517${NBSP}000${NBSP}000`,
        `5${NBSP}000${NBSP}000`,
        `10${NBSP}000${NBSP}000`,
        `25${NBSP}000${NBSP}000`,
      ].map((x, i) => (i === 0 ? x : `+${x}`)),
    );
    (f.nativeElement.querySelectorAll('.quick button')[2] as HTMLButtonElement).click();
    f.detectChanges();
    expect(field(f).value).toBe('527000000');
  });

  it('refuses a sum that is not a number or is below the minimum, without asking the server', async () => {
    const f = await open();
    field(f).value = 'abc';
    field(f).dispatchEvent(new Event('input'));
    await submit(f);
    expect(text(f.nativeElement)).toContain('Summani raqam bilan kiriting.');
    field(f).value = '500000000';
    field(f).dispatchEvent(new Event('input'));
    await submit(f);
    expect(text(f.nativeElement)).toContain('Taklif kamida');
    backend.expectNone('/api/Bid');
    expect(TestBed.inject(Confirm).pending()).toBeNull();
  });

  it('asks before sending, sends the typed sum once, and applies the result at once', async () => {
    const f = await open({ bids: [bid(2, 512_000_000, 1)] });
    const confirm = TestBed.inject(Confirm);
    field(f).value = '520 000 000';
    field(f).dispatchEvent(new Event('input'));
    await submit(f);
    expect(confirm.pending()?.request.title).toBe('Taklifni tasdiqlang');
    expect(confirm.pending()?.request.message).toContain(`520${NBSP}000${NBSP}000`);
    confirm.answer(true);
    await tick();
    const post = request('/api/Bid');
    expect(post.request.body).toEqual({ auctionId: 'a1', amount: 520_000_000 });
    // Pressing again while it is on its way sends nothing more.
    await submit(f);
    confirm.answer(true);
    await tick();
    expect(all('/api/Bid').length).toBe(0);
    post.flush(
      ok({
        bidId: 'b1',
        auctionId: 'a1',
        amount: 520_000_000,
        participantNumber: 7,
        placedAt: hoursFromNow(0),
        currentPrice: 520_000_000,
        minNextBid: 525_000_000,
        endsAt: hoursFromNow(3),
        extended: false,
      }),
    );
    await tick();
    f.detectChanges();
    const t = text(f.nativeElement);
    expect(t).toContain(`525${NBSP}000${NBSP}000`);
    expect(f.nativeElement.querySelectorAll('.bids tbody tr')[0].textContent).toContain('№ 7');
    expect(field(f).value).toBe('525000000');
    expect(t).toContain('Siz yetakchisiz');
    expect(TestBed.inject(Notify).toasts()[0].message).toContain('Taklifingiz qabul qilindi');
  });

  it('"no" at the question sends nothing', async () => {
    const f = await open();
    await submit(f);
    TestBed.inject(Confirm).answer(false);
    await tick();
    backend.expectNone('/api/Bid');
  });

  it('when another bid lands first (409) the numbers are reloaded and the person bids again at the new price', async () => {
    const f = await open();
    const confirm = TestBed.inject(Confirm);
    await submit(f);
    confirm.answer(true);
    await tick();
    request('/api/Bid').flush(
      failure(
        409,
        'Another bid was placed at the same moment. Check the current price and bid again.',
      ),
      {
        status: 409,
        statusText: 'Conflict',
      },
    );
    await tick();
    f.detectChanges();
    // The page asks the server for the real numbers.
    request('/api/Auction/public').flush(
      ok(auction({ currentPrice: 520_000_000, minNextBid: 525_000_000, bidCount: 10 })),
    );
    all('/api/Bid/list').forEach((r) => r.flush(okPage([bid(3, 520_000_000, 5)])));
    all('/api/Participation/my').forEach((r) => r.flush(okPage([ready()])));
    await tick();
    f.detectChanges();
    f.detectChanges();
    const t = text(f.nativeElement);
    expect(t).toContain('Shu orada boshqa taklif tushdi');
    expect(t).toContain(`525${NBSP}000${NBSP}000`);
    expect(field(f).value).toBe('525000000');
    expect(TestBed.inject(Notify).toasts().length).toBe(0);
  });

  it('a rule the server enforces (400) is shown as it is; too many bids (429) makes the button wait', async () => {
    const f = await open();
    const confirm = TestBed.inject(Confirm);
    await submit(f);
    confirm.answer(true);
    await tick();
    request('/api/Bid').flush(failure(400, 'The bid must be a multiple of the step.'), {
      status: 400,
      statusText: 'Bad Request',
    });
    await tick();
    expect(TestBed.inject(Notify).toasts()[0].message).toContain('multiple of the step');

    await submit(f);
    confirm.answer(true);
    await tick();
    request('/api/Bid').flush(failure(429, 'Too many'), {
      status: 429,
      statusText: 'Too Many Requests',
      headers: { 'Retry-After': '4' },
    });
    await tick();
    f.detectChanges();
    const button = f.nativeElement.querySelector(
      'app-bid-panel button[type=submit]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(text(f.nativeElement)).toContain('4 soniya');
  });

  it('shows whether the person leads, and when they were outbid, from the newest bid', async () => {
    let f = await open({ bids: [bid(7, 512_000_000, 5), bid(2, 510_000_000, 1)] });
    expect(text(f.nativeElement)).toContain('Siz yetakchisiz');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: HUB_FACTORY, useValue: () => hubs[hubs.push(new FakeHub()) - 1] },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    f = await open({ bids: [bid(2, 512_000_000, 5), bid(7, 510_000_000, 1)] });
    expect(text(f.nativeElement)).toContain('Taklifingiz oshirildi');
    // A live bid by me turns it back.
    const event: BidPlacedEvent = {
      auctionId: 'a1',
      participantNumber: 7,
      amount: 530_000_000,
      placedAt: new Date(Date.UTC(2026, 9, 23, 10, 9)).toISOString(),
      currentPrice: 530_000_000,
      minNextBid: 535_000_000,
      endsAt: hoursFromNow(3),
      extended: false,
      bidCount: 11,
    };
    await tick();
    hubs[hubs.length - 1].send('BidPlaced', event);
    f.detectChanges();
    expect(text(f.nativeElement)).toContain('Siz yetakchisiz');
    expect(field(f).value).toBe('535000000');
  });

  it('a finished auction has no bid form even for a participant', async () => {
    const f = await open({
      auction: auction({ status: 'FINISHED', outcome: 'SOLD', finalPrice: 520_000_000 }),
      mine: ready({ auctionStatus: 'FINISHED' }),
    });
    expect(panel(f)).toBeNull();
  });
});
