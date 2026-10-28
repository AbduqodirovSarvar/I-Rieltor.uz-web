import { Component, computed, inject, input } from '@angular/core';
import { I18n } from '../../core/i18n/i18n.service';

type Tone = '' | 'badge-info' | 'badge-success' | 'badge-warning' | 'badge-danger' | 'badge-live';

const TONES: Record<string, Record<string, Tone>> = {
  AuctionStatus: {
    SCHEDULED: 'badge-info',
    ONGOING: 'badge-live',
    FAILED: 'badge-danger',
    CANCELLED: 'badge-warning',
  },
  PropertyStatus: { IN_AUCTION: 'badge-info', SOLD: 'badge-danger' },
};

/** A status as a coloured pill. The text says it; the colour only supports it. `enum` is the backend enum's name. */
@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [class]="tone()">{{ label() }}</span>`,
})
export class StatusBadge {
  readonly enum = input.required<'AuctionStatus' | 'PropertyStatus'>();
  readonly value = input.required<string | null | undefined>();

  private readonly i18n = inject(I18n);
  protected readonly label = computed(() => this.i18n.enumLabel(this.enum(), this.value()));
  protected readonly tone = computed<Tone>(() => TONES[this.enum()]?.[this.value() ?? ''] ?? '');
}
