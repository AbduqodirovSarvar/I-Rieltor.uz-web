import { Component, afterNextRender, inject, input, model, output, signal } from '@angular/core';
import { EimzoError, EimzoErrorCode, EimzoKey } from '../../core/eimzo/eimzo.provider';
import { EimzoService } from '../../core/eimzo/eimzo.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { TextKey } from '../../core/i18n/uz';

const ERROR_TEXT: Record<EimzoErrorCode, TextKey> = {
  'library-missing': 'eimzo.err.library-missing',
  'not-installed': 'eimzo.err.not-installed',
  'no-keys': 'eimzo.err.no-keys',
  cancelled: 'eimzo.err.cancelled',
  'bad-password': 'eimzo.err.bad-password',
  failed: 'eimzo.err.failed',
};

/** The message for what went wrong with E-IMZO, in the person's language. */
export function eimzoErrorText(error: unknown): TextKey {
  return ERROR_TEXT[error instanceof EimzoError ? error.code : 'failed'];
}

/**
 * Finds the E-IMZO keys on this computer and lets the person pick one. The page reads the choice from `key` and does the
 * signing itself. When the program or the keys are missing, it says so and offers to look again.
 */
@Component({
  selector: 'app-eimzo-key-picker',
  imports: [TPipe],
  templateUrl: './eimzo-key-picker.html',
  styleUrl: './eimzo-key-picker.scss',
})
export class EimzoKeyPicker {
  /** Makes the ids on the page unique when there are two pickers. */
  readonly controlId = input('eimzo-key');
  /** The key the person chose (`null` until there is one). */
  readonly key = model<EimzoKey | null>(null);

  /** Why no key could be offered (E-IMZO not on the site, program missing, no keys). */
  readonly failed = output<EimzoErrorCode>();

  private readonly eimzo = inject(EimzoService);

  protected readonly keys = signal<EimzoKey[]>([]);
  protected readonly loading = signal(false);
  protected readonly problem = signal<TextKey | null>(null);
  protected readonly fake = this.eimzo.isFake;

  constructor() {
    // The program is on the person's computer, so there is nothing to ask on the server.
    afterNextRender(() => void this.load());
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.problem.set(null);
    try {
      const found = await this.eimzo.keys();
      this.keys.set(found);
      this.key.set(found[0] ?? null);
    } catch (error) {
      this.keys.set([]);
      this.key.set(null);
      this.problem.set(eimzoErrorText(error));
      this.failed.emit(error instanceof EimzoError ? error.code : 'failed');
    } finally {
      this.loading.set(false);
    }
  }

  protected choose(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.key.set(this.keys().find((k) => k.id === id) ?? null);
  }
}
