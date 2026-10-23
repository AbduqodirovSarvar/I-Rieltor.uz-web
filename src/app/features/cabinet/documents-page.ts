import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { DateTimePipe, FileSizePipe } from '../../core/format/format';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { TextKey } from '../../core/i18n/uz';
import { Confirm } from '../../core/notify/confirm.service';
import { Notify } from '../../core/notify/notify.service';
import { Seo } from '../../core/seo/seo.service';
import { valueOf } from '../../core/util/resource';
import { EmptyState } from '../../shared/ui/empty-state';
import { FileUpload } from '../../shared/ui/file-upload';
import {
  DOCUMENT_PURPOSES,
  DOCUMENT_RULES,
  DocumentPurpose,
  DocumentService,
  PrivateDocument,
} from './document.service';

/** The person's documents: upload (checked before sending), the list, open or save, delete. */
@Component({
  selector: 'app-documents-page',
  imports: [DateTimePipe, EmptyState, FileSizePipe, FileUpload, FormsModule, TPipe],
  templateUrl: './documents-page.html',
  styleUrl: './cabinet-pages.scss',
})
export class DocumentsPage {
  private readonly service = inject(DocumentService);
  private readonly i18n = inject(I18n);
  private readonly notify = inject(Notify);
  private readonly confirm = inject(Confirm);
  private readonly picker = viewChild(FileUpload);

  protected readonly rules = DOCUMENT_RULES;
  protected readonly purposes = DOCUMENT_PURPOSES.map((value) => ({
    value,
    text: `docs.purpose.${value}` as TextKey,
  }));

  protected readonly list = rxResource({ stream: () => this.service.mine() });
  protected readonly documents = computed(() => valueOf(this.list)?.items ?? []);

  protected readonly file = signal<File | null>(null);
  protected readonly purpose = signal<DocumentPurpose>('IDENTITY');
  protected readonly description = signal('');
  protected readonly uploading = signal(false);
  protected readonly noFile = signal(false);

  constructor() {
    inject(Seo).set({ title: this.i18n.t('docs.title'), noindex: true });
  }

  protected purposeText(purpose: DocumentPurpose): TextKey {
    return `docs.purpose.${purpose}` as TextKey;
  }

  protected setPurpose(event: Event): void {
    this.purpose.set((event.target as HTMLSelectElement).value as DocumentPurpose);
  }

  protected setDescription(event: Event): void {
    this.description.set((event.target as HTMLInputElement).value);
  }

  protected async upload(): Promise<void> {
    const file = this.file();
    this.noFile.set(!file);
    if (!file || this.uploading()) return;
    this.uploading.set(true);
    try {
      await firstValueFrom(this.service.upload(file, this.purpose(), this.description()));
      this.notify.success(this.i18n.t('docs.uploaded'));
      this.picker()?.clear();
      this.description.set('');
      this.list.reload();
    } catch (error) {
      this.notify.error(error);
    } finally {
      this.uploading.set(false);
    }
  }

  protected open(document: PrivateDocument): void {
    this.service.open(document);
  }

  protected save(document: PrivateDocument): void {
    this.service.save(document);
  }

  protected async remove(document: PrivateDocument): Promise<void> {
    const ok = await this.confirm.ask({
      title: this.i18n.t('docs.deleteQuestion'),
      message: document.originalName ?? '',
      confirmLabel: this.i18n.t('docs.delete'),
      cancelLabel: this.i18n.t('common.cancel'),
      danger: true,
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.service.delete(document.id));
      this.notify.success(this.i18n.t('docs.deleted'));
      this.list.reload();
    } catch (error) {
      this.notify.error(error);
    }
  }
}
