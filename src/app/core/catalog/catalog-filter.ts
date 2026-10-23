import { ParamMap, Params } from '@angular/router';

export const SORTS = [
  'newest',
  'price_asc',
  'price_desc',
  'area_asc',
  'area_desc',
  'auction_soon',
] as const;
export type SortKey = (typeof SORTS)[number];

/** What a visitor can narrow the catalog by. Every field is optional; nothing set means "everything". */
export interface CatalogFilter {
  q?: string;
  category?: string;
  region?: string;
  district?: string;
  minArea?: number;
  maxArea?: number;
  minRooms?: number;
  maxRooms?: number;
  minPrice?: number;
  maxPrice?: number;
  /** Only objects that are in an auction. */
  auction?: boolean;
  /** Include sold objects. */
  sold?: boolean;
  sort?: SortKey;
  /** Counted from 1. */
  page?: number;
}

export const PAGE_SIZE = 12;

const NUMBER_KEYS = ['minArea', 'maxArea', 'minRooms', 'maxRooms', 'minPrice', 'maxPrice'] as const;
const TEXT_KEYS = ['q', 'category', 'region', 'district'] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads the filter from the address. The address is untrusted input: numbers must be real non-negative numbers, the
 * sort must be one the backend knows, the category must look like an id. Anything else is dropped, not passed on.
 */
export function parseFilter(params: ParamMap): CatalogFilter {
  const filter: CatalogFilter = {};
  for (const key of TEXT_KEYS) {
    const value = params.get(key)?.trim();
    if (value) filter[key] = value.slice(0, 100);
  }
  if (filter.category && !UUID.test(filter.category)) delete filter.category;
  for (const key of NUMBER_KEYS) {
    const raw = params.get(key);
    if (raw === null || raw.trim() === '') continue;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0 && value < 1e15) filter[key] = value;
  }
  if (params.get('auction') === '1') filter.auction = true;
  if (params.get('sold') === '1') filter.sold = true;
  const sort = params.get('sort');
  if (sort && (SORTS as readonly string[]).includes(sort) && sort !== 'newest')
    filter.sort = sort as SortKey;
  const page = Number(params.get('page'));
  if (Number.isInteger(page) && page > 1 && page < 10_000) filter.page = page;
  return filter;
}

/** The query string for a filter: defaults and empty values are left out, so the plain catalog has a plain address. */
export function toQuery(filter: CatalogFilter): Params {
  const query: Params = {};
  for (const key of TEXT_KEYS) if (filter[key]) query[key] = filter[key];
  for (const key of NUMBER_KEYS) if (filter[key] !== undefined) query[key] = filter[key];
  if (filter.auction) query['auction'] = '1';
  if (filter.sold) query['sold'] = '1';
  if (filter.sort && filter.sort !== 'newest') query['sort'] = filter.sort;
  if (filter.page && filter.page > 1) query['page'] = filter.page;
  return query;
}

/** How many filters narrow the list (the sort and the page do not). */
export function activeFilters(filter: CatalogFilter): number {
  const { sort, page, ...rest } = filter;
  void sort;
  void page;
  return Object.values(rest).filter((v) => v !== undefined && v !== false && v !== '').length;
}

/** The parameters of `Property/public/list` for a filter. */
export function toApiExtra(filter: CatalogFilter): Record<string, string | number | boolean> {
  const extra: Record<string, string | number | boolean> = {};
  if (filter.category) extra['CategoryId'] = filter.category;
  if (filter.region) extra['Region'] = filter.region;
  if (filter.district) extra['District'] = filter.district;
  if (filter.minArea !== undefined) extra['MinArea'] = filter.minArea;
  if (filter.maxArea !== undefined) extra['MaxArea'] = filter.maxArea;
  if (filter.minRooms !== undefined) extra['MinRooms'] = filter.minRooms;
  if (filter.maxRooms !== undefined) extra['MaxRooms'] = filter.maxRooms;
  if (filter.minPrice !== undefined) extra['MinPrice'] = filter.minPrice;
  if (filter.maxPrice !== undefined) extra['MaxPrice'] = filter.maxPrice;
  if (filter.auction) extra['OnlyInAuction'] = true;
  if (filter.sold) extra['IncludeSold'] = true;
  extra['Sort'] = filter.sort ?? 'newest';
  return extra;
}
