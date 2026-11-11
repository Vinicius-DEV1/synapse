import { describe, it, expect } from 'vitest';
import { computeAnkiStats } from './ankiStatsCalculator';

describe('computeAnkiStats', () => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const mockReviews = [
    {
      reviewed_at: `${today}T10:00:00Z`,
      rating: 3, // Good
    },
    {
      reviewed_at: `${today}T10:05:00Z`,
      rating: 1, // Again
    },
    {
      reviewed_at: `${yesterday}T12:00:00Z`,
      rating: 4, // Easy
    },
  ];

  const mockCards = [
    {
      id: 'c1',
      state: 2, // Review
      stability: 25, // Mature
      difficulty: 5.5,
      created_at: `${today}T08:00:00Z`,
      due_date: `${today}T23:59:59Z`,
    },
    {
      id: 'c2',
      state: 1, // Learning
      stability: 5,
      difficulty: 6.0,
      created_at: `${today}T08:30:00Z`,
      due_date: `${today}T23:59:59Z`,
    },
    {
      id: 'c3',
      state: 0, // New
      stability: 0,
      difficulty: 0,
      created_at: `${today}T09:00:00Z`,
      due_date: null,
    },
  ];

  it('computes summary metrics accurately (studied today, retention, streak, maturity)', () => {
    const stats = computeAnkiStats(mockReviews, mockCards);

    expect(stats.summaryStats.studiedToday).toBe(2);
    expect(stats.summaryStats.totalCards).toBe(3);
    expect(stats.summaryStats.retentionRate).toBe(50); // 1 correct out of 2 today
    expect(stats.summaryStats.streak).toBeGreaterThanOrEqual(2);
    expect(stats.summaryStats.avgStability).toBe(15); // (25 + 5) / 2 = 15

    const mature = stats.maturityData.find(m => m.name === 'Maduros');
    expect(mature?.value).toBe(1);

    const learning = stats.maturityData.find(m => m.name === 'Aprendendo');
    expect(learning?.value).toBe(1);

    const novos = stats.maturityData.find(m => m.name === 'Novos');
    expect(novos?.value).toBe(1);
  });
});
