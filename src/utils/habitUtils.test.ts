import { describe, it, expect } from 'vitest';
import {
  calculateHabitStreak,
  resolveDateFromPageTitle,
  getLocalDateString,
  shiftDateString,
} from './habitUtils';

describe('habitUtils', () => {
  describe('getLocalDateString & shiftDateString', () => {
    it('formats a date as YYYY-MM-DD correctly', () => {
      const d = new Date(2026, 8, 25); // Sept 25, 2026
      expect(getLocalDateString(d)).toBe('2026-09-25');
    });

    it('shifts dates forward and backward across month boundaries', () => {
      expect(shiftDateString('2026-09-01', -1)).toBe('2026-08-31');
      expect(shiftDateString('2026-09-30', 1)).toBe('2026-10-01');
      expect(shiftDateString('2026-02-28', 1)).toBe('2026-03-01');
    });
  });

  describe('resolveDateFromPageTitle', () => {
    it('resolves DD-MM-YYYY format', () => {
      expect(resolveDateFromPageTitle('25-09-2026')).toBe('2026-09-25');
      expect(resolveDateFromPageTitle('01-01-2026')).toBe('2026-01-01');
    });

    it('resolves DD/MM/YYYY and DD.MM.YYYY formats', () => {
      expect(resolveDateFromPageTitle('25/09/2026')).toBe('2026-09-25');
      expect(resolveDateFromPageTitle('25.09.2026')).toBe('2026-09-25');
    });

    it('resolves YYYY-MM-DD format', () => {
      expect(resolveDateFromPageTitle('2026-09-25')).toBe('2026-09-25');
      expect(resolveDateFromPageTitle('2026/09/25')).toBe('2026-09-25');
    });

    it('resolves dates embedded inside complex titles', () => {
      expect(resolveDateFromPageTitle('Daily Note 25-09-2026')).toBe('2026-09-25');
      expect(resolveDateFromPageTitle('25-09-2026 - Quinta-Feira')).toBe('2026-09-25');
    });

    it('falls back to provided fallback or today when no date matches', () => {
      expect(resolveDateFromPageTitle('Anotações Gerais', '2026-09-25')).toBe('2026-09-25');
      expect(resolveDateFromPageTitle('', '2026-09-25')).toBe('2026-09-25');
    });
  });

  describe('calculateHabitStreak', () => {
    const today = '2026-09-25';

    it('calculates current streak when today is completed', () => {
      const logs = [
        '2026-09-23',
        '2026-09-24',
        '2026-09-25', // Today
      ];
      const stats = calculateHabitStreak(logs, today);
      expect(stats.currentStreak).toBe(3);
      expect(stats.bestStreak).toBe(3);
      expect(stats.totalCompleted).toBe(3);
    });

    it('preserves current streak if today is not yet completed but yesterday was', () => {
      const logs = [
        '2026-09-23',
        '2026-09-24', // Yesterday
      ];
      const stats = calculateHabitStreak(logs, today);
      expect(stats.currentStreak).toBe(2);
      expect(stats.bestStreak).toBe(2);
      expect(stats.totalCompleted).toBe(2);
    });

    it('resets current streak to 0 if both today and yesterday were missed', () => {
      const logs = [
        '2026-09-20',
        '2026-09-21',
        '2026-09-22', // Missed 23, 24, 25
      ];
      const stats = calculateHabitStreak(logs, today);
      expect(stats.currentStreak).toBe(0);
      expect(stats.bestStreak).toBe(3);
      expect(stats.totalCompleted).toBe(3);
    });

    it('computes historical best streak correctly across gaps', () => {
      const logs = [
        '2026-01-01',
        '2026-01-02',
        '2026-01-03',
        '2026-01-04',
        '2026-01-05', // 5-day streak
        // gap
        '2026-09-24',
        '2026-09-25', // 2-day streak
      ];
      const stats = calculateHabitStreak(logs, today);
      expect(stats.currentStreak).toBe(2);
      expect(stats.bestStreak).toBe(5);
      expect(stats.totalCompleted).toBe(7);
    });

    it('calculates 30-day completion rate percentage correctly', () => {
      // 15 days out of last 30 = 50%
      const logs: string[] = [];
      for (let i = 0; i < 15; i++) {
        logs.push(shiftDateString(today, -i));
      }
      const stats = calculateHabitStreak(logs, today);
      expect(stats.completionRate30Days).toBe(50);
    });
  });
});
