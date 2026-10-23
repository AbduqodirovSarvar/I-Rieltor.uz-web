import { Component, inject, input, output, signal, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { Notify } from '../../core/notify/notify.service';
import { FileUpload } from '../../shared/ui/file-upload';
import { DOCUMENT_RULES, DocumentService } from './document.service';

/**
 * Attach the check of a bank or card transfer to a payment. The file is checked before it is sent (type and size); staff
 * confirm the payment by it, so the person is told that confirmation is still to come.
 */
@Component({
  selector: 'app-receipt-upload',
  imports: [FileUpload, TPipe],
  template: `
    <div class="stack">
      <app-file-upload
        [inputId]="'receipt-' + paymentId()"
        [label]="'pay.receipt' | t"
        [rules]="rules"
        [typeNames]="'docs.types' | t"
        (selected)="file.set($event)"
      />
      <button type="button" class="btn" [disabled]="!file() || sending()" (click)="send()">
        {{ 'pay.receiptSend' | t }}
      </button>
    </div>
  `,
})
export class ReceiptUpload {
  readonly paymentId = input.required<string>();
  readonly auctionId = input.required<string>();
  readonly uploaded = output<void>();

  private readonly documents = inject(DocumentService);
  private readonly notify = inject(Notify);
  private readonly i18n = inject(I18n);
  private readonly picker = viewChild(FileUpload);

  protected readonly rules = DOCUMENT_RULES;
  protected readonly file = signal<File | null>(null);
  protected readonly sending = signal(false);

  protected async send(): Promise<void> {
    const file = this.file();
    if (!file || this.sending()) return;
    this.sending.set(true);
    try {
      await firstValueFrom(this.documents.uploadReceipt(file, this.paymentId(), this.auctionId()));
      this.notify.success(this.i18n.t('pay.receiptSent'));
      this.picker()?.clear();
      this.uploaded.emit();
    } catch (error) {
      this.notify.error(error);
    } finally {
      this.sending.set(false);
    }
  }
}
