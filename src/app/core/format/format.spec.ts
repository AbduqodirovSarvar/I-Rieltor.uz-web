import { remaining } from '../time/countdown';
import { formatFileSize, formatMoney, formatNumber, formatPhone, phoneHref } from './format';

const NBSP = ' ';

describe('formatting', () => {
  it('groups thousands with a non-breaking space and keeps up to two decimals', () => {
    expect(formatNumber(1234567)).toBe(`1${NBSP}234${NBSP}567`);
    expect(formatNumber(1500000.5)).toBe(`1${NBSP}500${NBSP}000,5`);
    expect(formatNumber('99.999')).toBe('100');
    expect(formatNumber(-2500)).toBe(`−2${NBSP}500`);
    expect(formatNumber(null)).toBe('');
    expect(formatNumber('abc')).toBe('');
  });

  it('adds the currency word it is given', () => {
    expect(formatMoney(1000, 'so‘m')).toBe(`1${NBSP}000${NBSP}so‘m`);
    expect(formatMoney(1000, 'сум')).toBe(`1${NBSP}000${NBSP}сум`);
    expect(formatMoney(1000)).toBe(`1${NBSP}000`);
    expect(formatMoney(null, 'so‘m')).toBe('');
  });

  it('formats and dials phones', () => {
    expect(formatPhone('+998901234567')).toBe('+998 90 123 45 67');
    expect(formatPhone('12345')).toBe('12345');
    expect(phoneHref('+998 (90) 123-45-67')).toBe('tel:+998901234567');
    expect(phoneHref(null)).toBe('');
  });

  it('formats file sizes', () => {
    expect(formatFileSize(500)).toBe(`500${NBSP}B`);
    expect(formatFileSize(2048)).toBe(`2${NBSP}KB`);
    expect(formatFileSize(5 * 1024 * 1024, { b: 'Б', kb: 'КБ', mb: 'МБ' })).toBe(`5${NBSP}МБ`);
  });
});

describe('countdown math', () => {
  const at = (iso: string) => Date.parse(iso);

  it('splits the time left into days and a clock', () => {
    const left = remaining(at('2026-10-25T12:30:10Z'), at('2026-10-23T10:00:00Z'));
    expect(left.days).toBe(2);
    expect(left.clock).toBe('02:30:10');
    expect(left.finished).toBe(false);
  });

  it('rounds a partial second up, so zero means really over', () => {
    expect(remaining(1500, 0).clock).toBe('00:00:02');
    expect(remaining(1000, 1000).finished).toBe(true);
  });

  it('never goes below zero', () => {
    const left = remaining(0, 5000);
    expect(left.ms).toBe(0);
    expect(left.clock).toBe('00:00:00');
    expect(left.finished).toBe(true);
  });
});
