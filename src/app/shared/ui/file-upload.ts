import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FileSizePipe, formatFileSize } from '../../core/format/format';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';

export type FileProblem = 'tooBig' | 'badType';

export interface FileRules {
  /** Allowed MIME types, exactly (`image/png`). A type not on the list is refused: no guessing from the name. */
  types: string[];
  maxBytes: number;
}

/** Checks a file before it is sent. The server checks again; this only saves the person a slow upload that will fail. */
export function checkFile(
  file: { type: string; size: number },
  rules: FileRules,
): FileProblem | null {
  if (!rules.types.includes(file.type)) return 'badType';
  if (file.size > rules.maxBytes) return 'tooBig';
  return null;
}

/** Choose one file; it is checked against `rules` and handed over only when it passes. */
@Component({
  selector: 'app-file-upload',
  imports: [TPipe, FileSizePipe],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss',
})
export class FileUpload {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly rules = input.required<FileRules>();
  /** Shown as "png, jpeg, pdf". */
  readonly typeNames = input('');

  readonly selected = output<File | null>();

  private readonly i18n = inject(I18n);
  protected readonly file = signal<File | null>(null);
  protected readonly problem = signal<FileProblem | null>(null);

  protected readonly accept = computed(() => this.rules().types.join(','));
  protected readonly hint = computed(() =>
    this.i18n.t('upload.hint', {
      types: this.typeNames(),
      size: formatFileSize(this.rules().maxBytes, {
        b: this.i18n.t('unit.bytes'),
        kb: this.i18n.t('unit.kb'),
        mb: this.i18n.t('unit.mb'),
      }),
    }),
  );
  protected readonly errorText = computed(() => {
    const problem = this.problem();
    if (!problem) return null;
    return problem === 'tooBig'
      ? this.i18n.t('upload.tooBig', {
          size: formatFileSize(this.rules().maxBytes, {
            b: this.i18n.t('unit.bytes'),
            kb: this.i18n.t('unit.kb'),
            mb: this.i18n.t('unit.mb'),
          }),
        })
      : this.i18n.t('upload.badType');
  });

  protected onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const chosen = input.files?.item(0) ?? null;
    if (!chosen) return;
    const problem = checkFile(chosen, this.rules());
    this.problem.set(problem);
    if (problem) {
      input.value = '';
      this.file.set(null);
      this.selected.emit(null);
      return;
    }
    this.file.set(chosen);
    this.selected.emit(chosen);
  }

  /** Forgets the chosen file (the form calls it after a successful upload). */
  clear(input?: HTMLInputElement): void {
    if (input) input.value = '';
    this.file.set(null);
    this.problem.set(null);
    this.selected.emit(null);
  }
}
