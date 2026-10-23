import { Component, computed, effect, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CompanyService } from '../../core/company/company.service';
import { formatPhone, phoneHref } from '../../core/format/format';
import { injectFileUrl } from '../../core/http/file-url';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { Seo } from '../../core/seo/seo.service';
import { valueOf } from '../../core/util/resource';
import { EmptyState } from '../../shared/ui/empty-state';
import { MapLink } from '../../shared/ui/map-link';

/** About the company: name, description, mission, contacts and the place on a map. Without company data, a friendly empty page. */
@Component({
  selector: 'app-about-page',
  imports: [EmptyState, MapLink, TPipe],
  templateUrl: './about-page.html',
  styleUrl: './about-page.scss',
})
export class AboutPage {
  private readonly i18n = inject(I18n);
  private readonly seo = inject(Seo);
  private readonly fileUrl = injectFileUrl();
  private readonly companies = inject(CompanyService);

  protected readonly company = rxResource({ stream: () => this.companies.company$ });
  protected readonly data = computed(() => valueOf(this.company));
  protected readonly logo = computed(() => this.fileUrl(this.data()?.logo?.url));
  protected readonly phoneHref = phoneHref;
  protected readonly formatPhone = formatPhone;

  constructor() {
    // The head is written again when the company arrives, so the description and the structured data describe it.
    effect(() => {
      const c = this.data();
      this.seo.set({
        title: this.i18n.t('about.title'),
        description: c?.description,
        jsonLd: c
          ? {
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: c.name,
              url: this.seo.absolute(this.i18n.link('/')),
              ...(c.email ? { email: c.email } : {}),
              ...(c.phoneNumber ? { telephone: c.phoneNumber } : {}),
              ...(c.address ? { address: c.address } : {}),
            }
          : undefined,
      });
    });
  }
}
