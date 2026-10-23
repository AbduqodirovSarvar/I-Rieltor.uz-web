import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MyParticipation } from '../../api/models';
import { DealsService } from '../../core/deals/deals.service';
import {
  ParticipationView,
  STEP_TEXT,
  STEP_TITLE,
  describeParticipation,
} from '../../core/deals/participation-view';
import { DateTimePipe, MoneyPipe } from '../../core/format/format';
import { I18n } from '../../core/i18n/i18n.service';
import { EnumLabelPipe, LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { Confirm } from '../../core/notify/confirm.service';
import { Notify } from '../../core/notify/notify.service';
import { Seo } from '../../core/seo/seo.service';
import { ServerClock } from '../../core/time/server-clock';
import { valueOf } from '../../core/util/resource';
import { EmptyState } from '../../shared/ui/empty-state';

interface Row {
  p: MyParticipation;
  view: ParticipationView;
}

/**
 * The person's applications, each with where it stands and the one thing to do next: pay the deposit, wait, bid, pay the
 * price, accept an offer. Actions that cannot be undone (taking an application back, giving up a purchase) ask first.
 */
@Component({
  selector: 'app-applications-page',
  imports: [DateTimePipe, EmptyState, EnumLabelPipe, LinkPipe, MoneyPipe, RouterLink, TPipe],
  templateUrl: './applications-page.html',
  styleUrl: './cabinet-pages.scss',
})
export class ApplicationsPage {
  private readonly deals = inject(DealsService);
  private readonly i18n = inject(I18n);
  private readonly notify = inject(Notify);
  private readonly confirm = inject(Confirm);
  private readonly clock = inject(ServerClock);

  protected readonly list = rxResource({ stream: () => this.deals.myParticipations() });
  protected readonly rows = computed<Row[]>(() => {
    const now = this.clock.now();
    return (valueOf(this.list) ?? []).map((p) => ({ p, view: describeParticipation(p, now) }));
  });

  protected readonly titleOf = (step: ParticipationView['step']) => STEP_TITLE[step];
  protected readonly textOf = (step: ParticipationView['step']) => STEP_TEXT[step];

  constructor() {
    inject(Seo).set({ title: this.i18n.t('apps.title'), noindex: true });
  }

  protected async withdraw(row: Row): Promise<void> {
    await this.act(
      row,
      'apps.withdrawQuestion',
      'apps.withdrawText',
      'apps.withdraw',
      () => this.deals.withdraw(row.p.auctionId),
      'apps.withdrawn',
      false,
    );
  }

  protected async refuse(row: Row): Promise<void> {
    await this.act(
      row,
      'apps.refuseQuestion',
      'apps.refuseText',
      'apps.refuse',
      () => this.deals.refuse(row.p.auctionId),
      'apps.refused',
      true,
    );
  }

  protected async decline(row: Row): Promise<void> {
    await this.act(
      row,
      'apps.declineQuestion',
      'apps.declineText',
      'apps.decline',
      () => this.deals.declineOffer(row.p.auctionId),
      'apps.declined',
      true,
    );
  }

  /** Accepting an offer is not destructive, so it needs no question. */
  protected async accept(row: Row): Promise<void> {
    try {
      await firstValueFrom(this.deals.acceptOffer(row.p.auctionId));
      this.notify.success(this.i18n.t('apps.accepted'));
    } catch (error) {
      this.notify.error(error);
    } finally {
      this.list.reload();
    }
  }

  private async act(
    row: Row,
    title: 'apps.withdrawQuestion' | 'apps.refuseQuestion' | 'apps.declineQuestion',
    text: 'apps.withdrawText' | 'apps.refuseText' | 'apps.declineText',
    label: 'apps.withdraw' | 'apps.refuse' | 'apps.decline',
    run: () => ReturnType<DealsService['withdraw']>,
    done: 'apps.withdrawn' | 'apps.refused' | 'apps.declined',
    danger: boolean,
  ): Promise<void> {
    const ok = await this.confirm.ask({
      title: this.i18n.t(title),
      message: this.i18n.t(text),
      confirmLabel: this.i18n.t(label),
      cancelLabel: this.i18n.t('common.cancel'),
      danger,
    });
    if (!ok) return;
    try {
      await firstValueFrom(run());
      this.notify.success(this.i18n.t(done));
    } catch (error) {
      this.notify.error(error);
    } finally {
      // The server may have refused because things changed (the sale started): show the truth either way.
      this.list.reload();
    }
  }
}
