import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHomeDashboard } from './useHomeDashboard';

describe('useHomeDashboard Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      calendar: {
        getEvents: vi.fn().mockResolvedValue([
          {
            id: 'ev_today',
            title: 'Revisão Geral',
            start_date: new Date().toISOString(),
            status: 'pending',
          },
        ]),
      },
      anki: {
        getDecks: vi.fn().mockResolvedValue({
          success: true,
          decks: [{ id: 'd1', name: 'Inglês' }],
        }),
        getDueCards: vi.fn().mockResolvedValue({
          success: true,
          cards: [{ id: 'c1' }, { id: 'c2' }],
        }),
      },
    };
  });

  it('computes greeting, loads calendar events and calculates due cards count', async () => {
    const { result } = renderHook(() => useHomeDashboard());

    expect(typeof result.current.greeting).toBe('string');
    expect(result.current.greeting.length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(result.current.todayEvents).toHaveLength(1);
      expect(result.current.dueCardsCount).toBe(2);
    });

    expect(result.current.todayEvents[0].title).toBe('Revisão Geral');
  });
});
