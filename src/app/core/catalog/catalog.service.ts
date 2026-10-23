import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { PublicCategory, PublicPropertyDetail, PublicPropertyListItem } from '../../api/models';
import { ApiClient } from '../http/api-client';
import { plainParams } from '../http/query-params';
import { Page } from '../http/response-model';
import { CatalogFilter, PAGE_SIZE, toApiExtra } from './catalog-filter';

export interface CategoryNode {
  category: PublicCategory;
  children: PublicCategory[];
}

/** The categories as a two-level tree: top-level ones with their children (the backend allows one level of nesting). */
export function buildTree(categories: PublicCategory[]): CategoryNode[] {
  const byOrder = (a: PublicCategory, b: PublicCategory) =>
    a.sortOrder - b.sortOrder || (a.name ?? '').localeCompare(b.name ?? '');
  const top = categories.filter((c) => !c.parentCategoryId).sort(byOrder);
  return top.map((category) => ({
    category,
    children: categories.filter((c) => c.parentCategoryId === category.id).sort(byOrder),
  }));
}

/** The public catalog: the object list, one object, the categories. No sign-in needed for any of it. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(ApiClient);

  private categories$: Observable<PublicCategory[]> | null = null;

  /** `page` of the filter is counted from 1; the backend counts from 0. */
  list(filter: CatalogFilter, pageSize = PAGE_SIZE): Observable<Page<PublicPropertyListItem>> {
    return this.api
      .getPage<PublicPropertyListItem>('api/Property/public/list', {
        pageIndex: (filter.page ?? 1) - 1,
        pageSize,
        searchText: filter.q,
        extra: toApiExtra(filter),
      })
      .pipe(map((page) => ({ ...page, pageIndex: (filter.page ?? 1) - 1 })));
  }

  detail(id: string): Observable<PublicPropertyDetail> {
    return this.api.get<PublicPropertyDetail>('api/Property/public', plainParams({ Id: id }));
  }

  categories(): Observable<PublicCategory[]> {
    return (this.categories$ ??= this.api
      .get<PublicCategory[]>('api/PropertyCategory/public')
      .pipe(shareReplay(1)));
  }

  tree(): Observable<CategoryNode[]> {
    return this.categories().pipe(map(buildTree));
  }
}
