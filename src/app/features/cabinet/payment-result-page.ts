import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Payment } from '../../api/models';
import { DealsService } from '../../core/deals/deals.service';
import { MoneyPipe } from '../../core/format/format';
import { I18n } from '../../core/i18n/i18n.service';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { Seo } from '../../core/seo/seo.service';
import { valueOf } from '../../core/util/resource';

const POLL_MS = 4000;
/** About two minutes: after that the person is told it may take longer and can refresh by hand. */
export const MAX_POLLS = 30;

/** The payment the person came back for: the one named in `?payment=`, else the newest. */
export function pickPayment(payments: Payment[], id: string | undefined): Payment | null {
  if (id) return payments.find((p) => p.id === id) ?? null;
  return payments[0] ?? null;
}

/**
 * Where a payment provider sends the person back to (set as the backend's `Payments:ReturnUrl`). The provider confirms the
 * payment to the backend by itself, which can take a moment, so the page asks for the state every few seconds until it is
 * no longer pending.
 */
@Component({
  selector: 'app-payment-result-page',
  imports: [LinkPipe, MoneyPipe, RouterLink, TPipe],
  templateUrl: './payment-result-page.html',
  styleUrl: './cabinet-pages.scss',
})
export class PaymentResultPage {
  readonly payment = input<string | undefined>();

  private readonly deals = inject(DealsService);
  private readonly i18n = inject(I18n);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly list = rxResource({ stream: () => this.deals.myPayments() });
  protected readonly current = computed(() =>
    pickPayment(valueOf(this.list) ?? [], this.payment()),
  );
  protected readonly polls = signal(0);
  protected readonly status = computed(() => this.current()?.status ?? null);
  protected readonly gaveUp = computed(
    () => this.status() === 'PENDING' && this.polls() >= MAX_POLLS,
  );

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(Seo).set({ title: this.i18n.t('result.title'), noindex: true });
    this.destroyRef.onDestroy(() => this.stop());
    this.schedule();
  }

  protected refresh(): void {
    this.polls.set(0);
    this.list.reload();
    this.schedule();
  }

  private schedule(): void {
    this.stop();
    this.timer = setTimeout(() => {
      if (this.status() === 'PENDING' || this.status() === null) {
        if (this.polls() < MAX_POLLS) {
          this.polls.update((n) => n + 1);
          this.list.reload();
          this.schedule();
        }
      }
    }, POLL_MS);
  }

  private stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
