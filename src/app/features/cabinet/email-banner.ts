import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiClient } from '../../core/http/api-client';
import { ApiError } from '../../core/http/api-error';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { Notify } from '../../core/notify/notify.service';

/**
 * "Your e-mail is not confirmed" with a button that sends the link again. The server limits how often it sends; after a
 * 429 the button waits for the number of seconds it asked for.
 */
@Component({
  selector: 'app-email-banner',
  imports: [TPipe],
  templateUrl: './email-banner.html',
})
export class EmailBanner {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18n);
  private readonly notify = inject(Notify);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sending = signal(false);
  protected readonly wait = signal(0);
  protected readonly email = computed(() => {
    const user = this.auth.currentUser();
    return user && user.email && !user.emailConfirmedAt ? user.email : null;
  });
  protected readonly canSend = computed(() => !this.sending() && this.wait() === 0);

  protected async resend(): Promise<void> {
    if (!this.canSend()) return;
    this.sending.set(true);
    try {
      await firstValueFrom(this.api.post<boolean>('api/Auth/me/email/resend-confirmation'));
      this.notify.success(this.i18n.t('auth.banner.sent'));
      // Do not offer another send at once: the server would refuse it anyway.
      this.startWait(60);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) this.startWait(error.retryAfter ?? 60);
      else this.notify.error(error);
    } finally {
      this.sending.set(false);
    }
  }

  private startWait(seconds: number): void {
    this.wait.set(Math.max(1, Math.min(seconds, 600)));
    const timer = setInterval(() => {
      this.wait.update((n) => n - 1);
      if (this.wait() <= 0) clearInterval(timer);
    }, 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }
}
