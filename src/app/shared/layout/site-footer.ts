import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CompanyService } from '../../core/company/company.service';
import { formatPhone, phoneHref } from '../../core/format/format';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';

/** Links and the company contacts (from `Company/public`; hidden until the company is filled in). */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, TPipe, LinkPipe],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})
export class SiteFooter {
  protected readonly company = toSignal(inject(CompanyService).company$, { initialValue: null });
  protected readonly year = new Date().getFullYear();
  protected readonly phoneHref = phoneHref;
  protected readonly formatPhone = formatPhone;
}
