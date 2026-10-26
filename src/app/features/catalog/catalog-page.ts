import { Component, computed, effect, inject } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, map } from 'rxjs';
import {
  CatalogFilter,
  PAGE_SIZE,
  SORTS,
  SortKey,
  activeFilters,
  parseFilter,
  toQuery,
} from '../../core/catalog/catalog-filter';
import { CatalogService } from '../../core/catalog/catalog.service';
import { kindOfError } from '../../shared/ui/error-state';
import { ApiError } from '../../core/http/api-error';
import { I18n } from '../../core/i18n/i18n.service';
import { TPipe } from '../../core/i18n/t.pipe';
import { TextKey } from '../../core/i18n/uz';
import { Seo } from '../../core/seo/seo.service';
import { injectResponseStatus } from '../../core/util/response-status';
import { valueOf } from '../../core/util/resource';
import { EmptyState } from '../../shared/ui/empty-state';
import { ErrorState } from '../../shared/ui/error-state';
import { FilterPanel } from '../../shared/ui/filter-panel';
import { Pagination } from '../../shared/ui/pagination';
import { PropertyCard } from '../../shared/ui/property-card';
import { SkeletonCards } from '../../shared/ui/skeleton';

const SEARCH_DELAY_MS = 400;

/** `'12'` → 12; an empty or wrong entry → `undefined` (the filter is cleared). */
export function numberOrUndefined(value: string): number | undefined {
  const text = value.trim().replace(/\s+/g, '').replace(',', '.');
  if (!text) return undefined;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

/**
 * The catalog: a list of objects that a visitor narrows with filters. The whole state (search, filters, sort, page) lives in
 * the address, so a link to a filtered list shows the same list, the back button works, and the page is rendered on the
 * server for whatever address it is asked for.
 */
@Component({
  selector: 'app-catalog-page',
  imports: [EmptyState, ErrorState, FilterPanel, Pagination, PropertyCard, SkeletonCards, TPipe],
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.scss',
})
export class CatalogPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly i18n = inject(I18n);
  private readonly seo = inject(Seo);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly filter = toSignal(this.route.queryParamMap.pipe(map(parseFilter)), {
    initialValue: parseFilter(this.route.snapshot.queryParamMap),
  });
  protected readonly active = computed(() => activeFilters(this.filter()));
  protected readonly page = computed(() => this.filter().page ?? 1);

  protected readonly results = rxResource({
    params: () => this.filter(),
    stream: ({ params }) => this.catalog.list(params),
  });
  protected readonly tree = rxResource({ stream: () => this.catalog.tree() });
  /** The result list, or nothing while there is none (never the error: see `valueOf`). */
  protected readonly data = computed(() => valueOf(this.results));

  protected readonly sorts = SORTS.map((value) => ({
    value,
    label: `catalog.sort.${value}` as TextKey,
  }));
  protected readonly roomOptions = [1, 2, 3, 4, 5];

  /** The categories as one list for a `<select>`: top level, then the children below each. */
  protected readonly categoryOptions = computed(() =>
    (valueOf(this.tree) ?? []).flatMap((node) => [
      { id: node.category.id, label: node.category.name ?? '' },
      ...node.children.map((child) => ({ id: child.id, label: `— ${child.name ?? ''}` })),
    ]),
  );

  protected readonly error = computed(() => {
    const error = this.results.error();
    const cause = error && 'cause' in error && error.cause ? error.cause : error;
    return cause instanceof ApiError ? cause : null;
  });
  protected readonly errorKind = computed(() => kindOfError(this.error()));

  private readonly setStatus = injectResponseStatus();
  private readonly typed = new Subject<string>();

  constructor() {
    this.typed
      .pipe(debounceTime(SEARCH_DELAY_MS), takeUntilDestroyed())
      .subscribe((q) => this.apply({ q: q.trim() || undefined }));

    effect(() => {
      const filter = this.filter();
      const page = this.data();
      const category = this.categoryOptions().find((c) => c.id === filter.category)?.label;
      const title = this.i18n.t('catalog.title');
      // A list that could not be loaded must not be taken for the page itself: "try later" for crawlers, not content.
      const failed = this.error() !== null;
      if (failed) this.setStatus(503);
      this.seo.set({
        title: category ? `${category.replace(/^— /, '')} | ${title}` : title,
        description: this.i18n.t('catalog.metaDescription'),
        // A filtered list is a variation of the catalog, not a page of its own: it stays out of search results.
        noindex: failed || activeFilters(filter) > 0,
        canonicalPath: '/katalog',
        jsonLd: page
          ? {
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              itemListElement: page.items.map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: this.seo.absolute(this.i18n.link(`/obyekt/${p.id}`)),
                name: p.title,
              })),
            }
          : undefined,
      });
    });
  }

  /** Puts a change into the address; the page number starts again from 1. */
  protected apply(patch: Partial<CatalogFilter>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toQuery({ ...this.filter(), ...patch, page: undefined }),
    });
  }

  protected clear(): void {
    // The sort stays: it is a way of reading the list, not a narrowing of it.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toQuery({ sort: this.filter().sort }),
    });
  }

  protected onType(event: Event): void {
    this.typed.next((event.target as HTMLInputElement).value);
  }

  /** Search pressed Enter or the button: apply at once, without waiting for the pause in typing. */
  protected onSearch(event: Event, input: HTMLInputElement): void {
    event.preventDefault();
    this.apply({ q: input.value.trim() || undefined });
  }

  protected onText(key: 'region' | 'district', event: Event): void {
    this.apply({ [key]: (event.target as HTMLInputElement).value.trim() || undefined });
  }

  protected onNumber(
    key: 'minArea' | 'maxArea' | 'minPrice' | 'maxPrice' | 'minRooms',
    event: Event,
  ): void {
    this.apply({ [key]: numberOrUndefined((event.target as HTMLInputElement).value) });
  }

  protected onCategory(event: Event): void {
    this.apply({ category: (event.target as HTMLSelectElement).value || undefined });
  }

  protected onSort(event: Event): void {
    this.apply({ sort: (event.target as HTMLSelectElement).value as SortKey });
  }

  protected onCheck(key: 'auction' | 'sold', event: Event): void {
    this.apply({ [key]: (event.target as HTMLInputElement).checked || undefined });
  }
}
