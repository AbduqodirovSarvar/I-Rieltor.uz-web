import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { PublicPropertyListItem, PublicSlide } from '../../api/models';
import { CatalogService } from '../../core/catalog/catalog.service';
import { toQuery } from '../../core/catalog/catalog-filter';
import { ApiClient } from '../../core/http/api-client';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { Seo } from '../../core/seo/seo.service';
import { valueOf } from '../../core/util/resource';
import { PropertyCard } from '../../shared/ui/property-card';
import { SkeletonCards } from '../../shared/ui/skeleton';
import { HeroSlider } from './hero-slider';
import { HowToJoin } from './how-to-join';

const SECTION_SIZE = 6;

/** Keeps the objects whose auction is in the given state, at most one row of cards. */
export function withAuctionStatus(
  items: PublicPropertyListItem[],
  status: 'ONGOING' | 'SCHEDULED',
): PublicPropertyListItem[] {
  return items.filter((p) => p.auction?.status === status).slice(0, SECTION_SIZE);
}

/**
 * The home page: slides, categories, what is on now, what starts soon, what is new, how to take part, and answers to the
 * usual questions. Every block loads on its own, so one slow or failed call does not blank the page. Everything here is
 * public data and is rendered on the server.
 */
@Component({
  selector: 'app-home-page',
  imports: [HeroSlider, HowToJoin, PropertyCard, SkeletonCards, RouterLink, TPipe],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  private readonly api = inject(ApiClient);
  private readonly catalog = inject(CatalogService);
  private readonly i18n = inject(I18n);
  private readonly seo = inject(Seo);

  protected readonly slides = rxResource({
    stream: () => this.api.get<PublicSlide[]>('api/Slide/public'),
  });
  protected readonly categories = rxResource({ stream: () => this.catalog.tree() });
  /** The objects that are in an auction, the nearest first; split into "now" and "soon" here. */
  protected readonly auctions = rxResource({
    stream: () =>
      this.catalog
        .list({ auction: true, sort: 'auction_soon' }, 50)
        .pipe(map((page) => page.items)),
  });
  protected readonly newest = rxResource({
    stream: () => this.catalog.list({ sort: 'newest' }, SECTION_SIZE).pipe(map((p) => p.items)),
  });

  protected readonly slideList = computed(() => valueOf(this.slides));
  protected readonly tree = computed(() => valueOf(this.categories));
  protected readonly newestItems = computed(() => valueOf(this.newest) ?? []);
  private readonly auctionItems = computed(() => valueOf(this.auctions) ?? []);

  protected readonly ongoing = computed(() => withAuctionStatus(this.auctionItems(), 'ONGOING'));
  protected readonly upcoming = computed(() => withAuctionStatus(this.auctionItems(), 'SCHEDULED'));
  protected readonly catalogLink = computed(() => this.i18n.link('/katalog'));

  constructor() {
    this.seo.set({
      title: '',
      description: this.i18n.t('home.heroText'),
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: this.i18n.t('site.name'),
        url: this.seo.absolute(this.i18n.link('/')),
        potentialAction: {
          '@type': 'SearchAction',
          target: `${this.seo.absolute(this.i18n.link('/katalog'))}?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    });
  }

  /** A category card leads to the catalog narrowed to it. */
  protected categoryQuery(id: string): Record<string, string | number> {
    return toQuery({ category: id }) as Record<string, string>;
  }
}
