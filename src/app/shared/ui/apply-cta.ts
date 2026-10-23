import {
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DateTimePipe } from '../../core/format/format';
import { I18n } from '../../core/i18n/i18n.service';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { Hydrated } from '../../core/layout/hydrated';
import { ServerClock } from '../../core/time/server-clock';

export type ApplyState = 'closed' | 'sign-in' | 'verify' | 'deadline-passed' | 'apply';

/**
 * What a visitor should do to take part, as one button or message, depending on who they are and what the auction allows:
 * a guest signs in, a signed-in account without E-IMZO connects it, a verified account applies, and after the deadline (by
 * the SERVER's clock) or once the auction is over there is only a note. The sign-in state is known in the browser only, so
 * on the server (and during hydration) nothing is drawn here.
 */
export function applyState(input: {
  status: string;
  deadlineMs: number;
  nowMs: number;
  authenticated: boolean;
  verified: boolean;
}): ApplyState {
  if (input.status !== 'SCHEDULED' && input.status !== 'ONGOING') return 'closed';
  if (input.nowMs >= input.deadlineMs) return 'deadline-passed';
  if (!input.authenticated) return 'sign-in';
  return input.verified ? 'apply' : 'verify';
}

@Component({
  selector: 'app-apply-cta',
  imports: [RouterLink, TPipe, LinkPipe, DateTimePipe],
  templateUrl: './apply-cta.html',
  styleUrl: './apply-cta.scss',
})
export class ApplyCta {
  readonly auctionId = input.required<string>();
  readonly status = input.required<string>();
  /** ISO date-time. */
  readonly deadline = input.required<string>();

  protected readonly hydrated = inject(Hydrated);
  private readonly auth = inject(AuthService);
  private readonly clock = inject(ServerClock);
  private readonly i18n = inject(I18n);
  private readonly destroyRef = inject(DestroyRef);
  private readonly now = signal(0);

  protected readonly state = computed(() =>
    applyState({
      status: this.status(),
      deadlineMs: Date.parse(this.deadline()),
      nowMs: this.now(),
      authenticated: this.auth.isAuthenticated(),
      verified: this.auth.isVerified(),
    }),
  );

  /** Where sign-in or E-IMZO connection sends the person back to. */
  protected readonly returnTo = computed(() => ({
    returnUrl: this.i18n.link(`/auksion/${this.auctionId()}`),
  }));

  constructor() {
    afterNextRender(() => {
      const tick = () => this.now.set(this.clock.now());
      tick();
      const timer = setInterval(tick, 15_000);
      this.destroyRef.onDestroy(() => clearInterval(timer));
    });
  }
}
