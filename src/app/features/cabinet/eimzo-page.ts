import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService, CurrentUser } from '../../core/auth/auth.service';
import { safeReturnUrl } from '../../core/auth/return-url';
import { EimzoError, EimzoKey } from '../../core/eimzo/eimzo.provider';
import { EimzoService } from '../../core/eimzo/eimzo.service';
import { maskIdentifier } from '../../core/format/format';
import { ApiClient } from '../../core/http/api-client';
import { ApiError } from '../../core/http/api-error';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { TextKey } from '../../core/i18n/uz';
import { Notify } from '../../core/notify/notify.service';
import { Seo } from '../../core/seo/seo.service';
import { EimzoKeyPicker, eimzoErrorText } from '../../shared/ui/eimzo-key-picker';

/**
 * Connects an E-IMZO key to the account (the right to apply for auctions). The name and the identifier (PINFL or INN) come
 * from the key. Where the person came from (`?returnUrl=`, an auction) is offered afterwards.
 */
@Component({
  selector: 'app-eimzo-page',
  imports: [EimzoKeyPicker, RouterLink, TPipe],
  templateUrl: './eimzo-page.html',
  styleUrl: './cabinet-pages.scss',
})
export class EimzoPage {
  readonly returnUrl = input<string | undefined>();

  private readonly eimzo = inject(EimzoService);
  private readonly api = inject(ApiClient);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);
  private readonly notify = inject(Notify);
  protected readonly auth = inject(AuthService);

  protected readonly key = signal<EimzoKey | null>(null);
  protected readonly working = signal(false);
  protected readonly message = signal<TextKey | null>(null);
  protected readonly user = this.auth.currentUser;
  protected readonly identifier = computed(() => maskIdentifier(this.user()?.innpinfl));
  protected readonly back = computed(() => {
    const target = this.returnUrl();
    return target ? safeReturnUrl(target, '') || null : null;
  });

  constructor() {
    inject(Seo).set({ title: this.i18n.t('eimzo.link.title'), noindex: true });
  }

  protected async link(): Promise<void> {
    const key = this.key();
    if (this.working()) return;
    this.message.set(null);
    if (!key) {
      this.message.set('eimzo.err.pickKey');
      return;
    }
    this.working.set(true);
    try {
      const user = await firstValueFrom(
        this.api.post<CurrentUser>('api/Auth/me/eimzo', {
          signedData: await this.eimzo.signChallenge(key),
        }),
      );
      this.auth.setUser(user);
      this.notify.success(this.i18n.t('eimzo.link.done'));
      const back = this.back();
      if (back) await this.router.navigateByUrl(back);
    } catch (error) {
      this.fail(error);
    } finally {
      this.working.set(false);
    }
  }

  private fail(error: unknown): void {
    if (error instanceof EimzoError) return void this.message.set(eimzoErrorText(error));
    if (error instanceof ApiError && error.status === 409)
      return void this.message.set('eimzo.link.taken');
    this.notify.error(error);
  }
}
