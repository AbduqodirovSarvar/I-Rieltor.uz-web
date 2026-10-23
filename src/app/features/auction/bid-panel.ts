import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MyParticipation, PlacedBid, PublicAuctionDetail, PublicBid } from '../../api/models';
import { DealsService, parseAmount } from '../../core/deals/deals.service';
import { canBid } from '../../core/deals/participation-view';
import { MoneyPipe, formatMoney } from '../../core/format/format';
import { ApiError } from '../../core/http/api-error';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { Confirm } from '../../core/notify/confirm.service';
import { Notify } from '../../core/notify/notify.service';

export interface QuickBid {
  amount: number;
  /** How many steps above the minimum (0 = the minimum itself). */
  steps: number;
}

/** The suggested bids: the minimum, and the minimum plus one, two and five steps. */
export function quickBids(minNextBid: number, step: number): QuickBid[] {
  return [0, 1, 2, 5].map((steps) => ({ amount: minNextBid + steps * step, steps }));
}

/** Who leads, from the person's side: nobody yet, me, or someone else (and whether I have bid at all). */
export function leadership(
  myNumber: number | null,
  bids: Pick<PublicBid, 'participantNumber'>[],
): 'none' | 'leader' | 'outbid' | 'other' {
  if (myNumber === null || bids.length === 0) return 'none';
  if (bids[0].participantNumber === myNumber) return 'leader';
  return bids.some((b) => b.participantNumber === myNumber) ? 'outbid' : 'other';
}

/**
 * The bid form of an approved participant. The server's `minNextBid` is the one truth: the field starts at it, a lower sum
 * is refused here and there, and when another bid lands first (409) the page reloads the numbers and the person bids again
 * at the new price. A bid cannot be taken back, so it is confirmed before it is sent, and pressing twice sends it once.
 */
@Component({
  selector: 'app-bid-panel',
  imports: [MoneyPipe, TPipe],
  templateUrl: './bid-panel.html',
  styleUrl: './bid-panel.scss',
})
export class BidPanel {
  readonly auction = input.required<PublicAuctionDetail>();
  readonly participation = input.required<MyParticipation | null>();
  /** The bid history, newest first (to tell whether the person leads). */
  readonly bids = input.required<PublicBid[]>();

  /** A bid was accepted (the page applies its numbers at once). */
  readonly placed = output<PlacedBid>();
  /** Another bid came first: the page must reload the numbers. */
  readonly stale = output<void>();

  private readonly deals = inject(DealsService);
  private readonly confirm = inject(Confirm);
  private readonly notify = inject(Notify);
  private readonly i18n = inject(I18n);
  private readonly destroyRef = inject(DestroyRef);

  /** What the person typed; `null` means "not touched yet": the field then follows the minimum. */
  private readonly typed = signal<string | null>(null);
  protected readonly text = computed(() => this.typed() ?? String(this.auction().minNextBid));
  protected readonly submitting = signal(false);
  protected readonly problem = signal<'invalid' | 'low' | null>(null);
  protected readonly conflict = signal(false);
  protected readonly wait = signal(0);

  protected readonly allowed = computed(() => canBid(this.participation()));
  protected readonly quick = computed(() =>
    quickBids(this.auction().minNextBid, this.auction().minBidStep),
  );
  protected readonly state = computed(() =>
    leadership(this.participation()?.participantNumber ?? null, this.bids()),
  );
  protected readonly canSubmit = computed(() => !this.submitting() && this.wait() === 0);

  protected onInput(event: Event): void {
    this.typed.set((event.target as HTMLInputElement).value);
    this.problem.set(null);
    this.conflict.set(false);
  }

  protected pick(amount: number): void {
    this.typed.set(String(amount));
    this.problem.set(null);
  }

  protected async submit(): Promise<void> {
    this.conflict.set(false);
    const amount = parseAmount(this.text());
    if (amount === null) return void this.problem.set('invalid');
    if (amount < this.auction().minNextBid) return void this.problem.set('low');
    this.problem.set(null);
    if (!this.canSubmit()) return;

    const ok = await this.confirm.ask({
      title: this.i18n.t('bid.confirmTitle'),
      message: this.i18n.t('bid.confirmText', { amount: formatMoney(amount) }),
      confirmLabel: this.i18n.t('bid.place'),
      cancelLabel: this.i18n.t('common.cancel'),
    });
    if (!ok || this.submitting()) return;

    this.submitting.set(true);
    try {
      const placed = await firstValueFrom(this.deals.placeBid(this.auction().id, amount));
      this.typed.set(null);
      this.notify.success(
        this.i18n.t('bid.placed', { amount: formatMoney(placed.amount, this.i18n.t('unit.som')) }),
      );
      this.placed.emit(placed);
    } catch (error) {
      this.fail(error);
    } finally {
      this.submitting.set(false);
    }
  }

  private fail(error: unknown): void {
    if (error instanceof ApiError && error.status === 409) {
      // "Another bid was placed at the same moment": the numbers on the page are old. Take the new ones and let the person decide.
      this.typed.set(null);
      this.conflict.set(true);
      this.stale.emit();
    } else if (error instanceof ApiError && error.status === 429) {
      this.startWait(error.retryAfter ?? 5);
    } else {
      this.notify.error(error);
    }
  }

  private startWait(seconds: number): void {
    this.wait.set(Math.max(1, Math.min(seconds, 120)));
    const timer = setInterval(() => {
      this.wait.update((n) => n - 1);
      if (this.wait() <= 0) clearInterval(timer);
    }, 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }
}
