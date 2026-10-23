import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { Notify } from '../../core/notify/notify.service';

export interface ShareLinks {
  telegram: string;
  whatsapp: string;
}

/** Links that open a chat app with the page address in it. The address and title are encoded, so nothing can break out. */
export function shareLinks(url: string, title: string): ShareLinks {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  };
}

/** Copy the link, or send it through Telegram or WhatsApp. */
@Component({
  selector: 'app-share-bar',
  imports: [TPipe],
  templateUrl: './share-bar.html',
})
export class ShareBar {
  /** The absolute address to share. */
  readonly url = input.required<string>();
  readonly title = input.required<string>();

  private readonly window = inject(DOCUMENT).defaultView;
  private readonly notify = inject(Notify);
  private readonly i18n = inject(I18n);

  protected readonly links = computed(() => shareLinks(this.url(), this.title()));

  protected async copy(): Promise<void> {
    try {
      await this.window?.navigator.clipboard.writeText(this.url());
      this.notify.success(this.i18n.t('share.copied'));
    } catch {
      // No clipboard permission (or an old browser): say so, the address is also in the page's address bar.
      this.notify.info(this.i18n.t('share.copyFailed'));
    }
  }
}
