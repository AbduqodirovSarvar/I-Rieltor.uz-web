import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { PublicAuctionDetail, PublicBid } from '../../api/models';
import { AuctionService } from '../../core/auction/auction.service';
import { DateTimePipe, MoneyPipe, TimeSecondsPipe, formatMoney } from '../../core/format/format';
import { ApiError } from '../../core/http/api-error';
import { I18n } from '../../core/i18n/i18n.service';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { Hydrated } from '../../core/layout/hydrated';
import { AuctionLive } from '../../core/realtime/auction-live';
import { Seo } from '../../core/seo/seo.service';
import { ServerClock } from '../../core/time/server-clock';
import { valueOf } from '../../core/util/resource';
import { injectResponseStatus } from '../../core/util/response-status';
import { ApplyCta } from '../../shared/ui/apply-cta';
import { Countdown } from '../../shared/ui/countdown';
import { ErrorState, kindOfError } from '../../shared/ui/error-state';
import { Price } from '../../shared/ui/price';
import { StatusBadge } from '../../shared/ui/status-badge';
import {
  BID_HISTORY_LIMIT,
  LivePatch,
  bidFromEvent,
  mergeBids,
  OUTCOME_TEXT,
  STATUS_TEXT,
  headlinePrice,
  isLiveStatus,
  patchFromBid,
  patchFromStatus,
} from './auction-view';

/** After a countdown reaches zero the server needs a moment to change the state; ask again after this pause. */
const RELOAD_AFTER_ZERO_MS = 1500;
/** How long the "time extended" note stays. */
const EXTENDED_NOTE_MS = 8000;

/**
 * One auction for everyone: the numbers, the dates, what state it is in, and — while it can still change — a live
 * connection that keeps the price, the end time and the counts current without reloading. Rendered on the server for the
 * first view (search engines); the live part starts in the browser only.
 */
@Component({
  selector: 'app-auction-page',
  imports: [
    ApplyCta,
    Countdown,
    DateTimePipe,
    ErrorState,
    LinkPipe,
    MoneyPipe,
    Price,
    RouterLink,
    StatusBadge,
    TPipe,
    TimeSecondsPipe,
  ],
  providers: [AuctionLive],
  templateUrl: './auction-page.html',
  styleUrl: './auction-page.scss',
})
export class AuctionPage {
  /** The `:id` of the route. */
  readonly id = input.required<string>();

  private readonly service = inject(AuctionService);
  private readonly i18n = inject(I18n);
  private readonly seo = inject(Seo);
  private readonly clock = inject(ServerClock);
  private readonly hydrated = inject(Hydrated);
  private readonly setStatus = injectResponseStatus();
  private readonly destroyRef = inject(DestroyRef);
  protected readonly live = inject(AuctionLive);

  protected readonly resource = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.service.detail(params),
  });

  protected readonly bidList = rxResource({
    params: () => this.id(),
    stream: ({ params }) =>
      this.service.bids(params, BID_HISTORY_LIMIT).pipe(map((page) => page.items)),
  });
  /** Bids that arrived live since the list was loaded. */
  private readonly liveBids = signal<PublicBid[]>([]);
  protected readonly bids = computed(() => mergeBids(valueOf(this.bidList) ?? [], this.liveBids()));

  /** Live changes on top of the loaded auction. */
  private readonly patch = signal<LivePatch>({});
  /** Said to screen readers when a bid arrives. */
  protected readonly announcement = signal('');
  protected readonly extended = signal(false);

  protected readonly auction = computed<PublicAuctionDetail | null>(() => {
    const base = valueOf(this.resource);
    return base ? { ...base, ...this.patch() } : null;
  });

  protected readonly error = computed(() => {
    const error = this.resource.error();
    const cause = error && 'cause' in error && error.cause ? error.cause : error;
    return cause instanceof ApiError ? cause : null;
  });
  protected readonly errorKind = computed(() =>
    this.error()?.status === 400 ? 'not-found' : kindOfError(this.error()),
  );

  protected readonly headline = computed(() => {
    const a = this.auction();
    return a ? headlinePrice(a) : null;
  });
  protected readonly statusText = computed(() => {
    const a = this.auction();
    if (!a) return '';
    const outcome = a.status === 'FINISHED' && a.outcome ? OUTCOME_TEXT[a.outcome] : null;
    return this.i18n.t(outcome ?? STATUS_TEXT[a.status]);
  });
  /** Where the clock counts to now, and what it is called. */
  protected readonly timers = computed(() => {
    const a = this.auction();
    if (!a) return [];
    const now = this.clock.now();
    const list: {
      at: string;
      label: 'auction.untilDeadline' | 'auction.untilStart' | 'auction.untilEnd';
    }[] = [];
    if (a.status === 'SCHEDULED') {
      if (Date.parse(a.applicationDeadline) > now)
        list.push({ at: a.applicationDeadline, label: 'auction.untilDeadline' });
      list.push({ at: a.startsAt, label: 'auction.untilStart' });
    } else if (a.status === 'ONGOING') {
      list.push({ at: a.endsAt, label: 'auction.untilEnd' });
    }
    return list;
  });
  protected readonly liveText = computed(() =>
    this.i18n.t(`auction.live.${this.live.state()}` as 'auction.live.idle'),
  );
  protected readonly showLive = computed(() => {
    const a = this.auction();
    return !!a && isLiveStatus(a.status) && this.hydrated.ready();
  });

  private reloadTimer: ReturnType<typeof setTimeout> | null = null;
  private extendedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // A fresh load already contains everything the live changes said.
    effect(() => {
      valueOf(this.resource);
      untracked(() => this.patch.set({}));
    });
    effect(() => {
      valueOf(this.bidList);
      untracked(() => this.liveBids.set([]));
    });

    // Live part: only in the browser, only while the auction can still change.
    effect(() => {
      const a = this.auction();
      if (!a || !this.hydrated.ready()) return;
      untracked(() => (isLiveStatus(a.status) ? this.live.watch(a.id) : this.live.stop()));
    });

    this.live.bids$.pipe(takeUntilDestroyed()).subscribe((event) => {
      const a = this.auction();
      const patch = a ? patchFromBid(a.id, a, event) : null;
      if (!patch) return;
      this.patch.update((p) => ({ ...p, ...patch }));
      this.liveBids.update((list) => [bidFromEvent(event), ...list]);
      this.announcement.set(
        this.i18n.t('auction.newBid', {
          amount: formatMoney(event.amount, this.i18n.t('unit.som')),
        }),
      );
      if (event.extended) this.showExtended();
    });
    this.live.status$.pipe(takeUntilDestroyed()).subscribe((event) => {
      const a = this.auction();
      const patch = a ? patchFromStatus(a.id, event) : null;
      if (!patch) return;
      this.patch.update((p) => ({ ...p, ...patch }));
      // The outcome and the final price come from the server, not from the message.
      this.reload();
    });
    this.live.resync$.pipe(takeUntilDestroyed()).subscribe(() => this.reload());

    effect(() => {
      const a = this.auction();
      if (a) {
        const lot = a.lotNumber ? `${this.i18n.t('auction.lot', { number: a.lotNumber })}: ` : '';
        this.seo.set({
          title: `${lot}${a.propertyTitle ?? a.title ?? ''}`,
          description: this.statusText(),
          canonicalPath: `/auksion/${a.id}`,
        });
      } else if (this.error()) {
        this.setStatus(this.errorKind() === 'not-found' ? 404 : 500);
        this.seo.set({ title: this.i18n.t('error.notFound.title'), noindex: true });
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.reloadTimer) clearTimeout(this.reloadTimer);
      if (this.extendedTimer) clearTimeout(this.extendedTimer);
    });
  }

  /** A countdown reached zero: the state is about to change; ask the server shortly. */
  protected onZero(): void {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => this.reload(), RELOAD_AFTER_ZERO_MS);
  }

  protected reload(): void {
    this.resource.reload();
    this.bidList.reload();
  }

  private showExtended(): void {
    this.extended.set(true);
    if (this.extendedTimer) clearTimeout(this.extendedTimer);
    this.extendedTimer = setTimeout(() => this.extended.set(false), EXTENDED_NOTE_MS);
  }
}
