import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCultureEpisodes } from './useCultureEpisodes';
import { CultureService } from '../../../services/culture';
import type { CultureItem } from '../../../types';

vi.mock('../../../services/culture', () => ({
  CultureService: {
    getEpisodes: vi.fn(),
    toggleEpisodeWatched: vi.fn(),
    markEpisodesWatchedBatch: vi.fn(),
  },
}));

vi.mock('../../../services/culture/culture-episodes-sync', () => ({
  syncTvMazeEpisodes: vi.fn(),
  syncJikanEpisodes: vi.fn(),
}));

describe('useCultureEpisodes Hook', () => {
  const mockItem: CultureItem = {
    id: 'cult_item_1',
    title: 'Breaking Bad',
    type: 'série',
    progress: 5,
    total_progress: 62,
    api_source: 'tvmaze',
    api_id: '169',
    created_at: 1000,
    updated_at: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(CultureService.getEpisodes).mockResolvedValue([
      {
        id: 'ep_1',
        culture_id: 'cult_item_1',
        season_number: 1,
        episode_number: 1,
        name: 'Pilot',
        watched: true,
        air_date: '2008-01-20',
        created_at: 1000,
        updated_at: 1000,
      },
    ]);
  });

  it('loads episodes when modal is open', async () => {
    const onUpdateProgress = vi.fn();

    const { result } = renderHook(() =>
      useCultureEpisodes({
        item: mockItem,
        isOpen: true,
        onUpdateProgress,
      })
    );

    await waitFor(() => {
      expect(result.current.episodes).toHaveLength(1);
      expect(result.current.episodes[0].name).toBe('Pilot');
    });
  });
});
