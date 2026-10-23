import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TPipe } from '../../core/i18n/t.pipe';

/**
 * The page numbers to show: the first, the last, and a few around the current one; `null` is a gap ("…").
 * `pageWindow(5, 12)` → 1 … 4 5 6 … 12
 */
export function pageWindow(page: number, pages: number, around = 1): (number | null)[] {
  const wanted = new Set<number>([1, pages]);
  for (let n = page - around; n <= page + around; n++) if (n >= 1 && n <= pages) wanted.add(n);
  const sorted = [...wanted].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) result.push(null);
    result.push(n);
  });
  return result;
}

/**
 * Page links. They are real links (`?page=3`), so a search engine can follow them and a page can be shared; other query
 * parameters (filters) stay as they are. `page` is counted from 1.
 */
@Component({
  selector: 'app-pagination',
  imports: [RouterLink, TPipe],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
})
export class Pagination {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();

  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  protected readonly items = computed(() => pageWindow(this.page(), this.pages()));

  /** Page 1 has no parameter: its address is the plain one. */
  protected query(n: number): { page: number | null } {
    return { page: n === 1 ? null : n };
  }
}
