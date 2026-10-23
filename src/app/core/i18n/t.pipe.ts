import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18n } from './i18n.service';
import { TextKey } from './uz';

/** `{{ 'nav.home' | t }}`. Impure on purpose: it follows the language, which changes with the address. */
@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(key: TextKey, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}

/** `[routerLink]="'/katalog' | link"` keeps a link inside the current language. */
@Pipe({ name: 'link', pure: false })
export class LinkPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(path: string): string {
    return this.i18n.link(path);
  }
}

/** `{{ status | enumLabel: 'AuctionStatus' }}` */
@Pipe({ name: 'enumLabel', pure: false })
export class EnumLabelPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(value: string | null | undefined, name: string): string {
    return this.i18n.enumLabel(name, value);
  }
}
