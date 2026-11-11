import { describe, it, expect } from 'vitest';
import {
  parseEventDate,
  getEventDayStr,
  getEventTimeStr,
  getLocalIsoDate,
  formatDateTime,
  formatDateTimeWithSeconds,
  formatDayMonth,
} from './date-utils';

describe('dateUtils', () => {
  it('formats local ISO date correctly', () => {
    const d = new Date(2026, 7, 22, 12, 0, 0);
    expect(getLocalIsoDate(d)).toBe('2026-08-22');
  });

  it('parses YYYY-MM-DD safely into local Date without UTC offset shifts', () => {
    const d = parseEventDate('2026-08-19');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // 0-indexed (August is 7)
    expect(d.getDate()).toBe(19);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('parses ISO dates with T00:00:00.000Z in local time', () => {
    const d = parseEventDate('2026-12-25T00:00:00.000Z');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(11); // December is 11
    expect(d.getDate()).toBe(25);
  });

  it('extracts event day string correctly', () => {
    expect(getEventDayStr('2026-08-19')).toBe('2026-08-19');
    expect(getEventDayStr('2026-08-19T00:00:00.000Z')).toBe('2026-08-19');
    expect(getEventDayStr('')).toBe('');
    expect(getEventDayStr(null)).toBe('');
  });

  it('extracts event time string correctly', () => {
    expect(getEventTimeStr('')).toBe('');
    expect(getEventTimeStr(null)).toBe('');
    // For midnight local
    expect(getEventTimeStr('2026-08-19')).toBe('00:00');
  });

  it('formats date strings safely without timezone shifts', () => {
    expect(formatDayMonth('2026-08-19')).toContain('19');
    expect(formatDateTime('2026-08-19')).toContain('19/08/2026');
    expect(formatDateTimeWithSeconds('2026-08-19')).toContain('19');
    expect(formatDayMonth(null)).toBe('Recente');
    expect(formatDateTime(null)).toBe('');
  });
});
