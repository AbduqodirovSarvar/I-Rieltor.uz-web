import {
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { I18n } from '../../core/i18n/i18n.service';
import { remaining } from '../../core/time/countdown';
import { ServerClock } from '../../core/time/server-clock';

/**
 * Time left until `target`, counted by the SERVER's clock. It starts ticking in the browser only: on the server (and during
 * hydration) it shows a dash, because a time computed on the server would already be wrong when the page reaches the visitor.
 * `finished` fires once when the time runs out.
 */
@Component({
  selector: 'app-countdown',
  templateUrl: './countdown.html',
  styleUrl: './countdown.scss',
})
export class Countdown {
  /** ISO date-time. */
  readonly target = input.required<string>();
  readonly finished = output<void>();

  private readonly clock = inject(ServerClock);
  private readonly i18n = inject(I18n);
  private readonly now = signal<number | null>(null);
  private readonly destroyRef = inject(DestroyRef);
  private fired = false;

  protected readonly left = computed(() => {
    const now = this.now();
    return now === null ? null : remaining(Date.parse(this.target()), now);
  });

  protected readonly text = computed(() => {
    const left = this.left();
    if (!left) return '—';
    if (left.finished) return this.i18n.t('countdown.ended');
    return left.days > 0
      ? `${left.days} ${this.i18n.plural('unit.days', left.days)} ${left.clock}`
      : left.clock;
  });

  constructor() {
    afterNextRender(() => {
      const tick = () => {
        this.now.set(this.clock.now());
        if (this.left()?.finished && !this.fired) {
          this.fired = true;
          this.finished.emit();
        }
      };
      tick();
      const timer = setInterval(tick, 1000);
      this.destroyRef.onDestroy(() => clearInterval(timer));
    });
  }
}
