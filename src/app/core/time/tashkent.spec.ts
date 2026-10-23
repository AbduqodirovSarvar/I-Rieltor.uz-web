import {
  calendarDay,
  endOfTashkentDayUtc,
  formatDate,
  formatDateTime,
  startOfTashkentDayUtc,
  tashkentInputToUtcIso,
  utcIsoToTashkentInput,
} from './tashkent';

describe('Tashkent time', () => {
  it('converts a typed Tashkent time to UTC and back', () => {
    expect(tashkentInputToUtcIso('2026-10-23T14:30')).toBe('2026-10-23T09:30:00.000Z');
    expect(utcIsoToTashkentInput('2026-10-23T09:30:00Z')).toBe('2026-10-23T14:30');
  });

  it('crosses midnight correctly', () => {
    expect(formatDateTime('2026-10-23T20:30:00Z')).toBe('24.10.2026 01:30');
    expect(startOfTashkentDayUtc('2026-10-24')).toBe('2026-10-23T19:00:00.000Z');
    expect(endOfTashkentDayUtc('2026-10-24')).toBe('2026-10-24T18:59:59.999Z');
  });

  it('formats dates and leaves empty values empty', () => {
    expect(formatDate('2026-01-05T00:00:00Z')).toBe('05.01.2026');
    expect(formatDate(null)).toBe('');
    expect(calendarDay(new Date(2026, 0, 9))).toBe('2026-01-09');
  });
});
