import { Component, computed, inject, input } from '@angular/core';
import { PublicAuctionSummary } from '../../api/models';
import { DateTimePipe } from '../../core/format/format';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { TextKey } from '../../core/i18n/uz';
import { Countdown } from './countdown';
import { Price } from './price';
import { StatusBadge } from './status-badge';

/**
 * The auction part of an object card: status, the price that matters now, and the time that matters now (until the
 * start while it is scheduled, until the end while it runs). The dates are printed as text too, so the HTML a search
 * engine reads carries them without the ticking clock.
 */
@Component({
  selector: 'app-auction-summary',
  imports: [Countdown, Price, StatusBadge, DateTimePipe, TPipe],
  templateUrl: './auction-summary.html',
  styleUrl: './auction-summary.scss',
})
export class AuctionSummary {
  readonly auction = input.required<PublicAuctionSummary>();

  private readonly i18n = inject(I18n);

  protected readonly priceLabel = computed(() => {
    const status = this.auction().status;
    const key: TextKey =
      status === 'ONGOING'
        ? 'card.currentPrice'
        : status === 'FINISHED'
          ? 'card.finalPrice'
          : 'card.startingPrice';
    return this.i18n.t(key);
  });

  protected readonly price = computed(() => {
    const a = this.auction();
    return a.status === 'SCHEDULED' ? a.startingPrice : (a.currentPrice ?? a.startingPrice);
  });

  /** What the clock counts to, and what it is called. */
  protected readonly timer = computed<{ at: string; key: TextKey } | null>(() => {
    const a = this.auction();
    if (a.status === 'ONGOING') return { at: a.endsAt, key: 'card.endsIn' };
    if (a.status === 'SCHEDULED') return { at: a.startsAt, key: 'card.startsIn' };
    return null;
  });
}
