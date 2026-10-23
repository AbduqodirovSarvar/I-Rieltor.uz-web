import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Payment } from '../../api/models';
import { DateTimePipe, MoneyPipe } from '../../core/format/format';
import { I18n } from '../../core/i18n/i18n.service';
import { EnumLabelPipe, LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { Seo } from '../../core/seo/seo.service';
import { valueOf } from '../../core/util/resource';
import { DealsService } from '../../core/deals/deals.service';
import { EmptyState } from '../../shared/ui/empty-state';
import { DocumentService } from './document.service';
import { ReceiptUpload } from './receipt-upload';

/** A payment waits for money that arrives by transfer: the check can still be attached. */
export function canAttachReceipt(
  payment: Pick<Payment, 'status' | 'provider' | 'purpose'>,
): boolean {
  return (
    payment.status === 'PENDING' &&
    payment.purpose !== 'REFUND' &&
    (payment.provider === 'BANK_TRANSFER' || payment.provider === 'CARD_TRANSFER')
  );
}

/** The person's payments with their state and the checks attached to them. */
@Component({
  selector: 'app-payments-page',
  imports: [
    DateTimePipe,
    EmptyState,
    EnumLabelPipe,
    LinkPipe,
    MoneyPipe,
    ReceiptUpload,
    RouterLink,
    TPipe,
  ],
  templateUrl: './payments-page.html',
  styleUrl: './cabinet-pages.scss',
})
export class PaymentsPage {
  private readonly deals = inject(DealsService);
  private readonly documents = inject(DocumentService);
  private readonly i18n = inject(I18n);

  protected readonly list = rxResource({ stream: () => this.deals.myPayments() });
  protected readonly payments = computed(() => valueOf(this.list) ?? []);
  protected readonly canAttach = canAttachReceipt;

  constructor() {
    inject(Seo).set({ title: this.i18n.t('payments.title'), noindex: true });
  }

  protected openReceipt(id: string, originalName: string | null): void {
    this.documents.open({ id, originalName });
  }
}
