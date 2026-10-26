import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { EimzoError, EimzoKey } from '../../core/eimzo/eimzo.provider';
import { EimzoService } from '../../core/eimzo/eimzo.service';
import { DateTimePipe } from '../../core/format/format';
import { ApiClient } from '../../core/http/api-client';
import { ApiError } from '../../core/http/api-error';
import { plainParams } from '../../core/http/query-params';
import { I18n } from '../../core/i18n/i18n.service';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { TextKey } from '../../core/i18n/uz';
import { Notify } from '../../core/notify/notify.service';
import { Seo } from '../../core/seo/seo.service';
import { valueOf } from '../../core/util/resource';
import { EimzoKeyPicker, eimzoErrorText } from '../../shared/ui/eimzo-key-picker';

interface ApplicationText {
  text: string | null;
  textBase64: string | null;
  applicationDeadline: string;
}

/**
 * Applying for an auction: the person reads the text of the application, agrees, and signs exactly that text with the
 * E-IMZO key. The backend checks the signature, that the key is the account's own, and that the text is the one it showed.
 */
@Component({
  selector: 'app-apply-page',
  imports: [DateTimePipe, EimzoKeyPicker, LinkPipe, RouterLink, TPipe],
  templateUrl: './apply-page.html',
  styleUrl: './apply-page.scss',
})
export class ApplyPage {
  /** The auction (route parameter). */
  readonly id = input.required<string>();

  private readonly eimzo = inject(EimzoService);
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);
  private readonly notify = inject(Notify);
  protected readonly auth = inject(AuthService);

  protected readonly application = rxResource({
    params: () => this.id(),
    stream: ({ params }) =>
      this.api.get<ApplicationText>(
        'api/Participation/application-text',
        plainParams({ AuctionId: params }),
      ),
  });
  protected readonly data = computed(() => valueOf(this.application));
  protected readonly verifyLink = computed(() => ({
    returnUrl: this.i18n.link(`/auksion/${this.id()}/ariza`),
  }));

  protected readonly key = signal<EimzoKey | null>(null);
  protected readonly agreed = signal(false);
  protected readonly working = signal(false);
  protected readonly message = signal<TextKey | null>(null);

  constructor() {
    inject(Seo).set({ title: this.i18n.t('apply.title'), noindex: true });
  }

  protected async submit(): Promise<void> {
    const data = this.data();
    const key = this.key();
    if (this.working() || !data?.text || !data.textBase64) return;
    this.message.set(null);
    if (!this.agreed()) {
      this.message.set('apply.mustAgree');
      return;
    }
    if (!key) {
      this.message.set('eimzo.err.pickKey');
      return;
    }
    this.working.set(true);
    try {
      const signedData = await this.eimzo.signDocument(key, data.text, data.textBase64);
      await firstValueFrom(
        this.api.post<unknown>('api/Participation/apply', { auctionId: this.id(), signedData }),
      );
      this.notify.success(this.i18n.t('apply.done'));
      await this.router.navigateByUrl(this.i18n.link('/kabinet/arizalar'));
    } catch (error) {
      this.fail(error);
    } finally {
      this.working.set(false);
    }
  }

  private fail(error: unknown): void {
    if (error instanceof EimzoError) return void this.message.set(eimzoErrorText(error));
    if (error instanceof ApiError) {
      if (error.status === 409) return void this.message.set('apply.err.conflict');
      if (error.status === 403) return void this.message.set('apply.err.forbidden');
      if (error.status === 400) {
        // The text may have changed since it was shown: read it again.
        this.application.reload();
        return void this.message.set('apply.err.textChanged');
      }
    }
    this.notify.error(error);
  }
}
