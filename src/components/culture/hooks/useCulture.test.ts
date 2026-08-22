import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCulture, sortItems } from './useCulture';
import { CultureService } from '../../../services/culture';
import type { CultureItem } from '../../../types';

vi.mock('../../../services/culture', () => ({
  CultureService: {
    getItems: vi.fn(),
    getAllEpisodes: vi.fn(),
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  },
}));

describe('useCulture Hook & sortItems', () => {
  const mockItems: CultureItem[] = [
    {
      id: 'c1',
      title: 'Steins;Gate',
      type: 'anime',
      progress: 12,
      total_progress: 24,
      is_goal: true,
      created_at: 1000,
      updated_at: 1000,
    },
    {
      id: 'c2',
      title: 'Attack on Titan',
      type: 'anime',
      progress: 24,
      total_progress: 24,
      is_goal: false,
      created_at: 900,
      updated_at: 900,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(CultureService.getItems).mockResolvedValue(mockItems);
    vi.mocked(CultureService.getAllEpisodes).mockResolvedValue([]);
  });

  it('sorts items alphabetically', () => {
    const sorted = sortItems(mockItems, 'alpha');
    expect(sorted[0].title).toBe('Attack on Titan');
    expect(sorted[1].title).toBe('Steins;Gate');
  });

  it('loads items and computes goalItems and finishedItems', async () => {
    const { result } = renderHook(() => useCulture());

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });

    expect(result.current.goalItems).toHaveLength(1);
    expect(result.current.finishedItems).toHaveLength(1);
  });
});
