import { Component, RESPONSE_INIT, inject, input, OnInit } from '@angular/core';
import { I18n } from '../../core/i18n/i18n.service';
import { Seo } from '../../core/seo/seo.service';
import { ErrorKind, ErrorState } from '../../shared/ui/error-state';
import { TextKey } from '../../core/i18n/uz';

const STATUS: Record<ErrorKind, number> = {
  'not-found': 404,
  forbidden: 403,
  server: 500,
  'sign-in-required': 401,
  offline: 503,
};

const TITLE: Record<ErrorKind, TextKey> = {
  'not-found': 'error.notFound.title',
  forbidden: 'error.forbidden.title',
  server: 'error.server.title',
  'sign-in-required': 'error.signInRequired.title',
  offline: 'error.offline.title',
};

/**
 * A route that shows an error page: `data: { kind: 'not-found' }`. On the server the response gets the matching HTTP status,
 * so a search engine sees a real 404 and does not index the page.
 */
@Component({
  selector: 'app-error-page',
  imports: [ErrorState],
  template: `<app-error-state [kind]="kind()" />`,
})
export class ErrorPage implements OnInit {
  /** From the route's `data`. */
  readonly kind = input<ErrorKind>('not-found');

  private readonly response = inject(RESPONSE_INIT, { optional: true });
  private readonly seo = inject(Seo);
  private readonly i18n = inject(I18n);

  ngOnInit(): void {
    if (this.response) this.response.status = STATUS[this.kind()];
    this.seo.set({ title: this.i18n.t(TITLE[this.kind()]), noindex: true });
  }
}
