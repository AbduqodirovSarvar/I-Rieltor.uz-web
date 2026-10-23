import { convertToParamMap } from '@angular/router';
import { PublicCategory } from '../../api/models';
import { activeFilters, parseFilter, toApiExtra, toQuery } from './catalog-filter';
import { buildTree } from './catalog.service';

const params = (values: Record<string, string>) => convertToParamMap(values);
const ID = '01a1684b-01e6-7ede-b062-60e0892e7407';

describe('parseFilter', () => {
  it('reads every filter from the address', () => {
    const filter = parseFilter(
      params({
        q: ' kvartira ',
        category: ID,
        region: 'Toshkent',
        district: 'Chilonzor',
        minArea: '40',
        maxArea: '120.5',
        minRooms: '2',
        minPrice: '100000000',
        maxPrice: '900000000',
        auction: '1',
        sold: '1',
        sort: 'price_desc',
        page: '3',
      }),
    );
    expect(filter).toEqual({
      q: 'kvartira',
      category: ID,
      region: 'Toshkent',
      district: 'Chilonzor',
      minArea: 40,
      maxArea: 120.5,
      minRooms: 2,
      minPrice: 100000000,
      maxPrice: 900000000,
      auction: true,
      sold: true,
      sort: 'price_desc',
      page: 3,
    });
  });

  it('drops values that are not what they should be', () => {
    const filter = parseFilter(
      params({
        category: 'not-an-id',
        minArea: 'abc',
        maxArea: '-5',
        minPrice: '1e99',
        auction: 'yes',
        sort: 'drop table',
        page: '0',
        q: '   ',
      }),
    );
    expect(filter).toEqual({});
  });

  it('cuts a very long search and ignores page numbers that are not whole', () => {
    expect(parseFilter(params({ q: 'x'.repeat(500) })).q?.length).toBe(100);
    expect(parseFilter(params({ page: '2.5' })).page).toBeUndefined();
    expect(parseFilter(params({ page: '1' })).page).toBeUndefined();
  });

  it('treats the default sort as no sort', () => {
    expect(parseFilter(params({ sort: 'newest' })).sort).toBeUndefined();
  });
});

describe('toQuery', () => {
  it('writes only what is set, so the plain catalog has a plain address', () => {
    expect(toQuery({})).toEqual({});
    expect(toQuery({ sort: 'newest', page: 1, auction: false })).toEqual({});
    expect(toQuery({ q: 'uy', minArea: 0, auction: true, sort: 'area_asc', page: 2 })).toEqual({
      q: 'uy',
      minArea: 0,
      auction: '1',
      sort: 'area_asc',
      page: 2,
    });
  });

  it('is the inverse of parseFilter', () => {
    const filter = {
      q: 'uy',
      category: ID,
      minPrice: 5,
      sold: true,
      sort: 'price_asc',
      page: 4,
    } as const;
    const query = toQuery(filter);
    const text: Record<string, string> = Object.fromEntries(
      Object.entries(query).map(([k, v]) => [k, String(v)]),
    );
    expect(parseFilter(params(text))).toEqual(filter);
  });
});

describe('activeFilters', () => {
  it('counts the narrowing filters, not the sort or the page', () => {
    expect(activeFilters({})).toBe(0);
    expect(activeFilters({ sort: 'price_asc', page: 3 })).toBe(0);
    expect(activeFilters({ q: 'a', category: ID, minArea: 0, auction: true })).toBe(4);
  });
});

describe('toApiExtra', () => {
  it('names the backend parameters and always sends the sort', () => {
    expect(toApiExtra({})).toEqual({ Sort: 'newest' });
    expect(
      toApiExtra({
        category: ID,
        region: 'Toshkent',
        minArea: 0,
        maxRooms: 3,
        auction: true,
        sold: true,
        sort: 'auction_soon',
      }),
    ).toEqual({
      CategoryId: ID,
      Region: 'Toshkent',
      MinArea: 0,
      MaxRooms: 3,
      OnlyInAuction: true,
      IncludeSold: true,
      Sort: 'auction_soon',
    });
  });
});

describe('buildTree', () => {
  const c = (id: string, name: string, parent: string | null, order = 0): PublicCategory => ({
    id,
    name,
    description: null,
    parentCategoryId: parent,
    sortOrder: order,
  });

  it('puts children under their parent, ordered by sort order then name', () => {
    const tree = buildTree([
      c('b', 'Uy', null, 2),
      c('a', 'Kvartira', null, 1),
      c('a2', 'Yangi', 'a', 2),
      c('a1', 'Eski', 'a', 1),
    ]);
    expect(tree.map((n) => n.category.id)).toEqual(['a', 'b']);
    expect(tree[0].children.map((x) => x.id)).toEqual(['a1', 'a2']);
    expect(tree[1].children).toEqual([]);
  });
});
