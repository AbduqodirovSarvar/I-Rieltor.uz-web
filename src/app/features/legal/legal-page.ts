import { Component, computed, effect, inject, input } from '@angular/core';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { TextKey } from '../../core/i18n/uz';
import { Seo } from '../../core/seo/seo.service';

export type LegalKind = 'rules' | 'privacy';

const PAGES: Record<LegalKind, { title: TextKey; sections: { title: TextKey; text: TextKey }[] }> =
  {
    rules: {
      title: 'legal.rules',
      sections: [
        { title: 'rules.1.title', text: 'rules.1.text' },
        { title: 'rules.2.title', text: 'rules.2.text' },
        { title: 'rules.3.title', text: 'rules.3.text' },
      ],
    },
    privacy: {
      title: 'legal.privacy',
      sections: [
        { title: 'privacy.1.title', text: 'privacy.1.text' },
        { title: 'privacy.2.title', text: 'privacy.2.text' },
        { title: 'privacy.3.title', text: 'privacy.3.text' },
      ],
    },
  };

/**
 * A page of plain text: the auction rules or the privacy policy (route `data: { kind }`). The texts are drafts kept in the
 * language dictionaries until the final wording is approved, and the page says so.
 */
@Component({
  selector: 'app-legal-page',
  imports: [TPipe],
  templateUrl: './legal-page.html',
  styleUrl: './legal-page.scss',
})
export class LegalPage {
  /** From the route's `data`. */
  readonly kind = input<LegalKind>('rules');

  private readonly i18n = inject(I18n);
  private readonly seo = inject(Seo);

  protected readonly page = computed(() => PAGES[this.kind()]);

  constructor() {
    effect(() => this.seo.set({ title: this.i18n.t(this.page().title) }));
  }
}
