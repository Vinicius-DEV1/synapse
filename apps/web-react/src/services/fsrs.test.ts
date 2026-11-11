import { describe, it, expect } from 'vitest';
import { State } from 'ts-fsrs';
import {
  getFSRS,
  migrateCardToFSRS,
  parseState,
  processReview,
  formatAnkiInterval,
  previewIntervals,
  parseStepMinutes,
} from './fsrs';

describe('FSRS Service', () => {
  describe('parseState', () => {
    it('correctly maps string states to FSRS State enum', () => {
      expect(parseState('0')).toBe(State.New);
      expect(parseState('new')).toBe(State.New);
      expect(parseState('1')).toBe(State.Learning);
      expect(parseState('learning')).toBe(State.Learning);
      expect(parseState('2')).toBe(State.Review);
      expect(parseState('review')).toBe(State.Review);
      expect(parseState('3')).toBe(State.Relearning);
      expect(parseState('relearning')).toBe(State.Relearning);
      expect(parseState('unknown')).toBe(State.New);
    });
  });

  describe('parseStepMinutes', () => {
    it('parses step string into minutes properly', () => {
      expect(parseStepMinutes('1m,10m')).toBe(1);
      expect(parseStepMinutes('10m')).toBe(10);
      expect(parseStepMinutes('2h')).toBe(120);
      expect(parseStepMinutes('1d')).toBe(1440);
      expect(parseStepMinutes(null, 5)).toBe(5);
      expect(parseStepMinutes('', 5)).toBe(5);
      expect(parseStepMinutes('invalid', 5)).toBe(5);
    });
  });

  describe('migrateCardToFSRS', () => {
    it('creates initial FSRS Card object from raw database card', () => {
      const dbCard = {
        due_date: '2026-08-19T12:00:00.000Z',
        stability: 3.5,
        difficulty: 4.2,
        state: '2',
        reps: 5,
        lapses: 1,
      };

      const card = migrateCardToFSRS(dbCard);
      expect(card.state).toBe(State.Review);
      expect(card.stability).toBe(3.5);
      expect(card.difficulty).toBe(4.2);
      expect(card.reps).toBe(5);
      expect(card.lapses).toBe(1);
    });
  });

  describe('formatAnkiInterval', () => {
    it('formats minutes, hours, days, months and years appropriately', () => {
      expect(formatAnkiInterval(5 * 60 * 1000)).toBe('<5m');
      expect(formatAnkiInterval(2 * 3600 * 1000)).toBe('2h');
      expect(formatAnkiInterval(5 * 24 * 3600 * 1000)).toBe('5d');
      expect(formatAnkiInterval(60 * 24 * 3600 * 1000)).toBe('2mo');
      expect(formatAnkiInterval(730 * 24 * 3600 * 1000)).toBe('2y');
    });
  });

  describe('processReview & previewIntervals', () => {
    it('processes review rating and increments reps and updates card state', () => {
      const rawCard = {
        due_date: new Date().toISOString(),
        stability: 0,
        difficulty: 0,
        state: '0',
        reps: 0,
        lapses: 0,
      };

      const updatedCard = processReview(rawCard, 3); // Good
      expect(updatedCard.reps).toBe(1);
      expect(updatedCard.state).toBe(State.Learning);
      expect(updatedCard.stability).toBeGreaterThan(0);
    });

    it('returns preview intervals array for [Again, Hard, Good, Easy]', () => {
      const rawCard = {
        due_date: new Date().toISOString(),
        stability: 2,
        difficulty: 3,
        state: '2',
        reps: 2,
      };

      const intervals = previewIntervals(rawCard);
      expect(intervals).toHaveLength(4);
      intervals.forEach(interval => {
        expect(typeof interval).toBe('string');
        expect(interval.length).toBeGreaterThan(0);
      });
    });

    it('ensures due date is never scheduled in the past or NaN', () => {
      const pastCard = {
        due_date: new Date(Date.now() - 10000000).toISOString(),
        last_review: new Date(Date.now() + 500000).toISOString(), // future last review edge case
        stability: 0,
        difficulty: 0,
        state: '0',
      };

      const now = Date.now();
      const updated = processReview(pastCard, 1); // Again
      expect(updated.due.getTime()).toBeGreaterThanOrEqual(now);
      expect(Number.isFinite(updated.stability)).toBe(true);
      expect(updated.stability).toBeGreaterThan(0);
      expect(updated.difficulty).toBeGreaterThanOrEqual(1);
      expect(updated.difficulty).toBeLessThanOrEqual(10);
      expect(updated.scheduled_days).toBeGreaterThanOrEqual(0);
    });

    it('handles negative or NaN diffMs in formatAnkiInterval gracefully', () => {
      expect(formatAnkiInterval(-500)).toBe('<1m');
      expect(formatAnkiInterval(0)).toBe('<1m');
      expect(formatAnkiInterval(NaN)).toBe('<1m');
      expect(formatAnkiInterval(Infinity)).toBe('<1m');
    });
  });
});

