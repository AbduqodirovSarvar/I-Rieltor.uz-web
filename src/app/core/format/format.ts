import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18n } from '../i18n/i18n.service';
import { formatDate, formatDateTime } from '../time/tashkent';

const NBSP = ' ';

/**
 * Numbers are formatted by hand, not with `Intl`: Node (the server) and the browser can differ in the separators they use,
 * and a difference between the server's HTML and the browser's would break hydration.
 * `1234567.5` → `1 234 567,5` (non-breaking space groups, comma decimals, at most 2 digits).
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  const [whole, fraction] = Math.abs(number).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const decimals = fraction === '00' ? '' : `,${fraction.replace(/0$/, '')}`;
  return `${number < 0 ? '−' : ''}${grouped}${decimals}`;
}

/** `1250000` → `1 250 000 so‘m`; the currency word comes from the caller (it depends on the language). */
export function formatMoney(
  value: number | string | null | undefined,
  currency: string | null = null,
): string {
  const text = formatNumber(value);
  return text && currency ? `${text}${NBSP}${currency}` : text;
}

/** `+998901234567` → `+998 90 123 45 67`; anything else is returned as it is. */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(value);
  return match ? `+998 ${match[1]} ${match[2]} ${match[3]} ${match[4]}` : value;
}

/** A `tel:` address that a phone can dial: digits and the leading plus only. */
export function phoneHref(value: string | null | undefined): string {
  return value ? `tel:${value.replace(/[^\d+]/g, '')}` : '';
}

export interface SizeUnits {
  b: string;
  kb: string;
  mb: string;
}

export function formatFileSize(
  bytes: number | null | undefined,
  units: SizeUnits = { b: 'B', kb: 'KB', mb: 'MB' },
): string {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes}${NBSP}${units.b}`;
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024)}${NBSP}${units.kb}`;
  return `${formatNumber(bytes / (1024 * 1024))}${NBSP}${units.mb}`;
}

@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(value: number | string | null | undefined, withCurrency = true): string {
    return formatMoney(value, withCurrency ? this.i18n.t('unit.som') : null);
  }
}

/** `{{ 85.5 | area }}` → `85,5 m²`; `{{ 6 | area: 'sotix' }}` → `6 sotix`. */
@Pipe({ name: 'area', pure: false })
export class AreaPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(value: number | null | undefined, unit: 'sqm' | 'sotix' = 'sqm'): string {
    const text = formatNumber(value);
    return text ? `${text}${NBSP}${this.i18n.t(unit === 'sqm' ? 'unit.sqm' : 'unit.sotix')}` : '';
  }
}

/** `{{ 3 | rooms }}` → `3 xona` / `3 комнаты`. */
@Pipe({ name: 'rooms', pure: false })
export class RoomsPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(value: number | null | undefined): string {
    return value === null || value === undefined
      ? ''
      : `${value}${NBSP}${this.i18n.plural('unit.rooms', value)}`;
  }
}

@Pipe({ name: 'dateTime' })
export class DateTimePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatDateTime(value);
  }
}

@Pipe({ name: 'dateOnly' })
export class DateOnlyPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatDate(value);
  }
}

@Pipe({ name: 'fileSize', pure: false })
export class FileSizePipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(value: number | null | undefined): string {
    return formatFileSize(value, {
      b: this.i18n.t('unit.bytes'),
      kb: this.i18n.t('unit.kb'),
      mb: this.i18n.t('unit.mb'),
    });
  }
}

@Pipe({ name: 'phone' })
export class PhonePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatPhone(value);
  }
}
