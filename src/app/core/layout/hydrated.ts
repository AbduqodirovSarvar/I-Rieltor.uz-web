import { Injectable, afterNextRender, signal } from '@angular/core';

/**
 * False on the server and during hydration, true once the page runs in the browser. Anything that depends on the person
 * (the sign-in state, the saved theme) is shown only when this is true, so the HTML the browser builds matches the HTML
 * the server sent.
 */
@Injectable({ providedIn: 'root' })
export class Hydrated {
  private readonly state = signal(false);
  readonly ready = this.state.asReadonly();

  constructor() {
    afterNextRender(() => this.state.set(true));
  }
}
