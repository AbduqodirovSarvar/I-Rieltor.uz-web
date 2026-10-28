import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicPropertyListItem } from '../../api/models';
import { DateTimePipe, MoneyPipe, formatNumber } from '../../core/format/format';
import { injectFileUrl } from '../../core/http/file-url';
import { I18n } from '../../core/i18n/i18n.service';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { TextKey } from '../../core/i18n/uz';
import { Countdown } from './countdown';
import { StatusBadge } from './status-badge';

/**
 * One object in a list: picture with the status and lot on it, category, title, where and how big, and (for an object in
 * an auction) the price that matters now with the time that matters now. The whole card is one link.
 */
@Component({
  selector: 'app-property-card',
  imports: [RouterLink, Countdown, StatusBadge, MoneyPipe, DateTimePipe, LinkPipe, TPipe],
  templateUrl: './property-card.html',
  styleUrl: './property-card.scss',
})
export class PropertyCard {
  readonly property = input.required<PublicPropertyListItem>();
  /** The first cards on a page load at once (they are what the visitor sees); the rest load as they are scrolled to. */
  readonly eager = input(false);

  /** The heading level of the title: 2 where the list follows the page title directly, 3 under a section heading. */
  readonly level = input<2 | 3>(3);

  private readonly fileUrl = injectFileUrl();
  private readonly i18n = inject(I18n);

  protected readonly cover = computed(() => this.fileUrl(this.property().cover?.url));
  protected readonly alt = computed(
    () => this.property().cover?.alt || this.property().title || '',
  );

  /** "Region, district · 86 m² · 3 rooms": one short line under the title. */
  protected readonly details = computed(() => {
    const p = this.property();
    const place = [p.region, p.district].filter(Boolean).join(', ');
    const t = (key: TextKey) => this.i18n.t(key);
    const size = [
      p.areaSqm ? `${formatNumber(p.areaSqm)}\u00a0${t('unit.sqm')}` : '',
      p.landAreaSotix ? `${formatNumber(p.landAreaSotix)}\u00a0${t('unit.sotix')}` : '',
      p.rooms ? `${p.rooms}\u00a0${this.i18n.plural('unit.rooms', p.rooms)}` : '',
    ].filter(Boolean);
    return [place, ...size].filter(Boolean).join(' · ');
  });

  protected readonly priceLabel = computed<TextKey>(() => {
    const status = this.property().auction?.status;
    return status === 'ONGOING'
      ? 'card.currentPrice'
      : status === 'FINISHED'
        ? 'card.finalPrice'
        : 'card.startingPrice';
  });

  protected readonly price = computed(() => {
    const a = this.property().auction;
    if (!a) return null;
    return a.status === 'SCHEDULED' ? a.startingPrice : (a.currentPrice ?? a.startingPrice);
  });

  /** What the clock counts to: the end while the auction runs, the start while it is scheduled. */
  protected readonly timer = computed<{ at: string; key: TextKey } | null>(() => {
    const a = this.property().auction;
    if (a?.status === 'ONGOING') return { at: a.endsAt, key: 'card.endsIn' };
    if (a?.status === 'SCHEDULED') return { at: a.startsAt, key: 'card.startsIn' };
    return null;
  });
}
