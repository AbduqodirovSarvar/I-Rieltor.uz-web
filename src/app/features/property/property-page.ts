import { Component, computed, effect, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { CatalogService } from '../../core/catalog/catalog.service';
import { AreaPipe, MoneyPipe, RoomsPipe, formatNumber } from '../../core/format/format';
import { ApiError } from '../../core/http/api-error';
import { injectFileUrl } from '../../core/http/file-url';
import { I18n } from '../../core/i18n/i18n.service';
import { LinkPipe, TPipe } from '../../core/i18n/t.pipe';
import { Seo } from '../../core/seo/seo.service';
import { injectResponseStatus } from '../../core/util/response-status';
import { valueOf } from '../../core/util/resource';
import { ApplyCta } from '../../shared/ui/apply-cta';
import { AuctionSummary } from '../../shared/ui/auction-summary';
import { ErrorState, kindOfError } from '../../shared/ui/error-state';
import { Gallery } from '../../shared/ui/gallery';
import { MapLink } from '../../shared/ui/map-link';
import { PropertyCard } from '../../shared/ui/property-card';
import { ShareBar } from '../../shared/ui/share-bar';
import { StatusBadge } from '../../shared/ui/status-badge';
import { documentsOf, galleryItems, productJsonLd, summaryOf } from './property-view';

/**
 * One object: pictures, facts, description, documents, where it is, and the auction it is in with what to do next.
 * Public and rendered on the server. An object that does not exist (or is a draft or archived) answers 404, in the HTTP
 * status as well as on the page.
 */
@Component({
  selector: 'app-property-page',
  imports: [
    ApplyCta,
    AreaPipe,
    AuctionSummary,
    ErrorState,
    Gallery,
    LinkPipe,
    MapLink,
    MoneyPipe,
    PropertyCard,
    RoomsPipe,
    RouterLink,
    ShareBar,
    StatusBadge,
    TPipe,
  ],
  templateUrl: './property-page.html',
  styleUrl: './property-page.scss',
})
export class PropertyPage {
  /** The `:id` of the route. */
  readonly id = input.required<string>();

  private readonly catalog = inject(CatalogService);
  private readonly i18n = inject(I18n);
  private readonly seo = inject(Seo);
  private readonly fileUrl = injectFileUrl();
  private readonly setStatus = injectResponseStatus();

  protected readonly resource = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.catalog.detail(params),
  });
  protected readonly property = computed(() => valueOf(this.resource));

  protected readonly error = computed(() => {
    const error = this.resource.error();
    const cause = error && 'cause' in error && error.cause ? error.cause : error;
    return cause instanceof ApiError ? cause : null;
  });
  /** A malformed id (400) is as "not found" as an unknown one. */
  protected readonly errorKind = computed(() =>
    this.error()?.status === 400 ? 'not-found' : kindOfError(this.error()),
  );

  protected readonly gallery = computed(() => {
    const p = this.property();
    return p
      ? galleryItems(p, this.fileUrl, (title, n) => this.i18n.t('object.mediaAlt', { title, n }))
      : [];
  });
  protected readonly documents = computed(() => {
    const p = this.property();
    return p ? documentsOf(p) : [];
  });
  protected readonly address = computed(() => {
    const p = this.property();
    return p ? this.seo.absolute(this.i18n.link(`/obyekt/${p.id}`)) : '';
  });
  protected readonly floorText = computed(() => {
    const p = this.property();
    if (!p?.floor) return '';
    return p.totalFloors
      ? this.i18n.t('unit.floor', { floor: p.floor, total: p.totalFloors })
      : String(p.floor);
  });
  protected readonly views = computed(() =>
    this.i18n.t('object.views', { count: formatNumber(this.property()?.viewCount ?? 0) }),
  );

  /** Objects of the same category, not this one. */
  protected readonly similar = rxResource({
    params: () => this.property()?.categoryId,
    stream: ({ params }) =>
      this.catalog.list({ category: params }, 5).pipe(map((page) => page.items)),
  });
  protected readonly similarItems = computed(() =>
    (valueOf(this.similar) ?? []).filter((p) => p.id !== this.id()).slice(0, 4),
  );

  protected readonly fileHref = (url: string | null | undefined) => this.fileUrl(url);

  constructor() {
    effect(() => {
      const p = this.property();
      if (p) {
        const url = this.address();
        const images = this.gallery()
          .filter((g) => g.kind === 'image')
          .map((g) => this.seo.absolute(g.url));
        const description = summaryOf(p);
        this.seo.set({
          title: p.title ?? '',
          description,
          image: images[0] ?? null,
          type: 'article',
          canonicalPath: `/obyekt/${p.id}`,
          jsonLd: [
            productJsonLd(p, url, images, description),
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: this.i18n.t('catalog.title'),
                  item: this.seo.absolute(this.i18n.link('/katalog')),
                },
                { '@type': 'ListItem', position: 2, name: p.title, item: url },
              ],
            },
          ],
        });
      } else if (this.error()) {
        this.setStatus(this.errorKind() === 'not-found' ? 404 : 500);
        this.seo.set({ title: this.i18n.t('error.notFound.title'), noindex: true });
      }
    });
  }
}
