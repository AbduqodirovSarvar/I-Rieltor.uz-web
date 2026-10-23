import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '../../api/schema';
import { ApiClient } from '../../core/http/api-client';
import { previewBlob, saveBlob } from '../../core/http/download';
import { plainParams } from '../../core/http/query-params';
import { Page } from '../../core/http/response-model';
import { FileRules } from '../../shared/ui/file-upload';

export type PrivateDocument = components['schemas']['PrivateDocumentViewModel'];
export type DocumentPurpose = components['schemas']['DocumentPurpose'];

export const DOCUMENT_PURPOSES: DocumentPurpose[] = [
  'IDENTITY',
  'POWER_OF_ATTORNEY',
  'PAYMENT_RECEIPT',
  'APPLICATION_ATTACHMENT',
  'OTHER',
];

/** What the server accepts (it checks the content too): pdf, png, jpeg, docx, up to 10 MB. */
export const DOCUMENT_RULES: FileRules = {
  types: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  maxBytes: 10 * 1024 * 1024,
};

/**
 * Only plain pictures and PDF open in a tab. A blob opens on this site's own origin, so an uploaded SVG or HTML would run
 * its script with the visitor's session: everything else is saved, never opened.
 */
export function isSafeToPreview(contentType: string | null | undefined): boolean {
  return /^(image\/(png|jpeg|webp|gif)|application\/pdf)$/i.test(contentType ?? '');
}

/** The person's own documents (the server lists only theirs). */
@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly api = inject(ApiClient);

  mine(): Observable<Page<PrivateDocument>> {
    return this.api.getPage<PrivateDocument>('api/Document/my/list', {
      pageSize: 50,
      sortBy: 'CreatedAt',
      sortDirection: 'desc',
    });
  }

  upload(file: File, purpose: DocumentPurpose, description: string): Observable<PrivateDocument> {
    const form = new FormData();
    form.append('File', file);
    form.append('Purpose', purpose);
    if (description.trim()) form.append('Description', description.trim());
    return this.api.postForm<PrivateDocument>('api/Document', form);
  }

  delete(id: string): Observable<boolean> {
    return this.api.delete<boolean>('api/Document', { id });
  }

  /** Fetches the file with the access token (a plain link would not carry it) and shows it, or saves it if it is not safe to show. */
  open(document: Pick<PrivateDocument, 'id' | 'originalName'>): void {
    this.api.blob('api/Document/download', plainParams({ id: document.id })).subscribe((blob) => {
      if (isSafeToPreview(blob.type)) previewBlob(blob);
      else saveBlob(blob, document.originalName ?? 'document');
    });
  }

  save(document: Pick<PrivateDocument, 'id' | 'originalName'>): void {
    this.api
      .blob('api/Document/download', plainParams({ id: document.id }))
      .subscribe((blob) => saveBlob(blob, document.originalName ?? 'document'));
  }
}
