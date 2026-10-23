import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Checkout, MyParticipation, PaymentProvider, PaymentPurpose } from '../../api/models';
import { DealsService, isRedirectProvider, safeProviderUrl } from '../../core/deals/deals.service';
import { DateTimePipe, MoneyPipe } from '../../core/format/format';
import { I18n } from '../../core/i18n/i18n.service';
import { EnumLabelPipe, LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { Notify } from '../../core/notify/notify.service';
import { Seo } from '../../core/seo/seo.service';
import { valueOf } from '../../core/util/resource';
import { ReceiptUpload } from './receipt-upload';

/** What there is to pay for the chosen purpose, from the person's own participation; `null` when there is nothing to pay. */
export function dueFor(
  p: MyParticipation | undefined,
  purpose: PaymentPurpose,
): { amount: number; paid: boolean; until: string | null } | null {
  if (!p || p.status !== 'APPROVED') return null;
  if (purpose === 'DEPOSIT') {
    if (p.depositAmount <= 0) return null;
    return { amount: p.depositAmount, paid: p.depositStatus !== 'NOT_PAID', until: null };
  }
  const award = p.award;
  if (!award) return null;
  return {
    amount: award.amountDue,
    paid: award.status === 'PAID',
    until: award.status === 'ACCEPTED' ? award.paymentDueAt : null,
  };
}

/**
 * Pay the deposit or the price of an auction. The methods offered are those the server has switched on. A provider (Payme,
 * Click) gives a page to go to; a transfer gives the bank or card details and the person attaches the check afterwards.
 * Asking again for the same payment gives the same payment, so a reload or a second tab does not start another one.
 */
@Component({
  selector: 'app-pay-page',
  imports: [DateTimePipe, EnumLabelPipe, LinkPipe, MoneyPipe, ReceiptUpload, RouterLink, TPipe],
  templateUrl: './pay-page.html',
  styleUrl: './cabinet-pages.scss',
})
export class PayPage {
  /** The `:auctionId` of the route. */
  readonly auctionId = input.required<string>();
  /** `?purpose=`: DEPOSIT (the default) or FINAL_PAYMENT. */
  readonly purpose = input<string | undefined>();

  private readonly deals = inject(DealsService);
  private readonly i18n = inject(I18n);
  private readonly notify = inject(Notify);

  protected readonly purposeValue = computed<PaymentPurpose>(() =>
    this.purpose() === 'FINAL_PAYMENT' ? 'FINAL_PAYMENT' : 'DEPOSIT',
  );
  protected readonly providers = rxResource({ stream: () => this.deals.providers() });
  protected readonly participations = rxResource({ stream: () => this.deals.myParticipations() });

  protected readonly mine = computed(() =>
    valueOf(this.participations)?.find(
      (p) => p.auctionId === this.auctionId() && p.status === 'APPROVED',
    ),
  );
  protected readonly due = computed(() => dueFor(this.mine(), this.purposeValue()));
  protected readonly methods = computed(() => valueOf(this.providers) ?? []);

  protected readonly chosen = signal<PaymentProvider | null>(null);
  protected readonly provider = computed(() => this.chosen() ?? this.methods()[0] ?? null);
  protected readonly starting = signal(false);
  protected readonly checkout = signal<Checkout | null>(null);
  protected readonly receiptSent = signal(false);

  protected readonly providerUrl = computed(() => safeProviderUrl(this.checkout()?.url));
  protected readonly instructions = computed(() => this.checkout()?.instructions ?? null);

  constructor() {
    inject(Seo).set({ title: this.i18n.t('pay.title'), noindex: true });
  }

  protected choose(provider: PaymentProvider): void {
    this.chosen.set(provider);
  }

  protected isRedirect(provider: PaymentProvider): boolean {
    return isRedirectProvider(provider);
  }

  protected async start(): Promise<void> {
    const provider = this.provider();
    const due = this.due();
    if (!provider || !due || due.paid || this.starting()) return;
    this.starting.set(true);
    try {
      const result = await firstValueFrom(
        this.deals.checkout(this.auctionId(), this.purposeValue(), provider),
      );
      this.checkout.set(result);
    } catch (error) {
      this.notify.error(error);
    } finally {
      this.starting.set(false);
    }
  }
}
