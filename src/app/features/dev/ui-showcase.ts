import { Component, signal } from '@angular/core';
import { PublicPropertyListItem } from '../../api/models';
import { Notify } from '../../core/notify/notify.service';
import { Confirm } from '../../core/notify/confirm.service';
import { inject } from '@angular/core';
import { EmptyState } from '../../shared/ui/empty-state';
import { FileUpload, FileRules } from '../../shared/ui/file-upload';
import { FilterPanel } from '../../shared/ui/filter-panel';
import { FormField } from '../../shared/ui/form-field';
import { Gallery, GalleryItem } from '../../shared/ui/gallery';
import { MapLink } from '../../shared/ui/map-link';
import { Pagination } from '../../shared/ui/pagination';
import { PropertyCard } from '../../shared/ui/property-card';
import { SkeletonCards } from '../../shared/ui/skeleton';

const svg = (color: string, text: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" fill="#fff" font-size="48" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`,
  )}`;

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

/** A page that shows every shared style and component in one place (development only: the route does not exist in production). */
@Component({
  selector: 'app-ui-showcase',
  imports: [
    EmptyState,
    FileUpload,
    FilterPanel,
    FormField,
    Gallery,
    MapLink,
    Pagination,
    PropertyCard,
    SkeletonCards,
  ],
  templateUrl: './ui-showcase.html',
  styleUrl: './ui-showcase.scss',
})
export class UiShowcase {
  private readonly notify = inject(Notify);
  private readonly confirm = inject(Confirm);

  protected readonly theme = signal<'system' | 'light' | 'dark'>('system');
  protected readonly rules: FileRules = {
    types: ['image/png', 'image/jpeg', 'application/pdf'],
    maxBytes: 2 * 1024 * 1024,
  };
  protected readonly gallery: GalleryItem[] = [
    { url: svg('#1d4ed8', '1'), alt: 'First', kind: 'image' },
    { url: svg('#15803d', '2'), alt: 'Second', kind: 'image' },
    { url: svg('#b45309', '3'), alt: 'Third', kind: 'image' },
  ];

  protected readonly sample = (
    status: 'ONGOING' | 'SCHEDULED' | 'FINISHED',
  ): PublicPropertyListItem => ({
    id: '1',
    title: '3 xonali kvartira, Chilonzor',
    categoryId: 'c',
    categoryName: 'Kvartira',
    status: 'IN_AUCTION',
    region: 'Toshkent',
    district: 'Chilonzor',
    areaSqm: 85.5,
    landAreaSotix: null,
    rooms: 3,
    floor: 4,
    totalFloors: 9,
    cover: null as never,
    createdAt: new Date().toISOString(),
    auction: {
      id: 'a',
      lotNumber: '2026-014',
      status,
      startingPrice: 450_000_000,
      currentPrice: status === 'SCHEDULED' ? null : 512_000_000,
      minBidStep: 5_000_000,
      depositAmount: 20_000_000,
      applicationDeadline: inHours(20),
      startsAt: inHours(status === 'SCHEDULED' ? 26 : -2),
      endsAt: inHours(status === 'FINISHED' ? -1 : 3.5),
    },
  });

  protected setTheme(theme: 'system' | 'light' | 'dark'): void {
    this.theme.set(theme);
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }

  protected toast(kind: 'info' | 'success' | 'error'): void {
    if (kind === 'info') this.notify.info('Information');
    else if (kind === 'success') this.notify.success('Saved');
    else this.notify.error(new Error('x'));
  }

  protected async ask(): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Withdraw the application?',
      message: 'This cannot be undone.',
      confirmLabel: 'Withdraw',
      cancelLabel: 'Cancel',
      danger: true,
    });
    this.notify.info(ok ? 'Confirmed' : 'Cancelled');
  }
}
