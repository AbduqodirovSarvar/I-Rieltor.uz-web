import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicPropertyListItem } from '../../api/models';
import { AreaPipe, RoomsPipe } from '../../core/format/format';
import { injectFileUrl } from '../../core/http/file-url';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { AuctionSummary } from './auction-summary';
import { StatusBadge } from './status-badge';

/** One object in a list: picture, title, where, how big, and the auction (if any). The whole card is one link. */
@Component({
  selector: 'app-property-card',
  imports: [RouterLink, AuctionSummary, StatusBadge, AreaPipe, RoomsPipe, LinkPipe, TPipe],
  templateUrl: './property-card.html',
  styleUrl: './property-card.scss',
})
export class PropertyCard {
  readonly property = input.required<PublicPropertyListItem>();
  /** The first cards on a page load at once (they are what the visitor sees); the rest load as they are scrolled to. */
  readonly eager = input(false);

  private readonly fileUrl = injectFileUrl();

  protected readonly cover = computed(() => this.fileUrl(this.property().cover?.url));
  protected readonly alt = computed(
    () => this.property().cover?.alt || this.property().title || '',
  );
  protected readonly location = computed(() =>
    [this.property().region, this.property().district].filter(Boolean).join(', '),
  );
}
