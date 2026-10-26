import { Component, computed, effect, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DateTimePipe } from '../../core/format/format';
import { I18n } from '../../core/i18n/i18n.service';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { Seo } from '../../core/seo/seo.service';
import { valueOf } from '../../core/util/resource';
import { EmptyState } from '../../shared/ui/empty-state';

/**
 * The person's own messages, newest first. What was new when the page opened is marked; once they are shown, everything
 * counts as seen (remembered in this browser only).
 */
@Component({
  selector: 'app-notifications-page',
  imports: [DateTimePipe, EmptyState, LinkPipe, RouterLink, TPipe],
  templateUrl: './notifications-page.html',
  styleUrl: './cabinet-pages.scss',
})
export class NotificationsPage {
  private readonly service = inject(NotificationsService);
  private readonly i18n = inject(I18n);

  /** The moment the person last looked, taken before this visit is counted. */
  private readonly before = this.service.seenMs();

  protected readonly list = rxResource({ stream: () => this.service.load() });
  protected readonly rows = computed(() =>
    (valueOf(this.list) ?? []).map((item) => ({
      item,
      isNew: Date.parse(item.createdAt) > this.before,
    })),
  );

  constructor() {
    inject(Seo).set({ title: this.i18n.t('notifications.title'), noindex: true });
    // The list is on screen: from now on the badge on the menu is clear.
    effect(() => {
      if (this.list.hasValue()) this.service.markSeen();
    });
  }
}
