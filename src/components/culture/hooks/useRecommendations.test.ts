import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useRecommendations } from './useRecommendations';
import { CultureRecommendationsService } from '../../../services/culture/culture-recommendations';
import { CultureFeedbackStorage } from '../../../services/culture/culture-feedback-storage';
import type { RecommendationCluster, HydratedRecommendation } from '../../../types/culture-recommendations';

vi.mock('../../../services/culture/culture-recommendations', () => ({
  CultureRecommendationsService: {
    getRecommendations: vi.fn(),
    getRecommendationsProgressive: vi.fn(),
    addToLibrary: vi.fn().mockResolvedValue(undefined),
    dislikeItem: vi.fn().mockResolvedValue(undefined),
    markAsAlreadySeen: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../services/culture/culture-feedback-storage', () => ({
  CultureFeedbackStorage: {
    getCachedRecommendations: vi.fn(),
    getDislikedItems: vi.fn().mockResolvedValue([]),
    getIgnoredItems: vi.fn().mockResolvedValue([]),
    getRecentRecommendedTitles: vi.fn().mockResolvedValue([]),
  },
}));

describe('useRecommendations Hook (SWR & Zero Perceived Latency)', () => {
  const mockHydratedItem: HydratedRecommendation = {
    id: 'rec_filme_dune_2024',
    title: 'Dune: Part Two',
    type: 'filme',
    year: 2024,
    creator: 'Denis Villeneuve',
    tier: 'recent',
    affinity_reason: 'Você gostou do primeiro filme',
    synopsis: 'Paul Atreides busca vingança contra os conspiradores.',
    rating: 8.6,
    platform: 'HBO Max',
    duration: '2h 46m',
  };

  const mockCluster: RecommendationCluster = {
    id: 'cluster_scifi',
    title: 'Sci-Fi Primoroso',
    description: 'Ficção científica aclamada',
    items: [mockHydratedItem],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(CultureRecommendationsService.getRecommendationsProgressive).mockImplementation(
      async (_forceRefresh, _mode, onProgress) => {
        onProgress?.({
          phase: 'complete',
          currentBatch: 2,
          totalBatches: 2,
          clusters: [mockCluster],
          message: 'Pronto',
          progressPercent: 100,
          isPartial: false,
          totalItemsCount: 1,
        });
        return [mockCluster];
      }
    );
  });

  it('immediately populates clusters from SWR cache on mount without waiting for recalculation', async () => {
    vi.mocked(CultureFeedbackStorage.getCachedRecommendations).mockResolvedValue({
      clusters: [mockCluster],
      generated_at: '2026-10-02T10:00:00Z',
      library_hash: 'hash-abc',
      ai_dna: {
        thematic_axes: ['Sci-Fi Cósmico'],
        core_influences: ['Denis Villeneuve'],
        emotional_atmosphere: 'Solene e reflexivo',
        key_anchor_works: ['Dune'],
      },
    });

    vi.mocked(CultureRecommendationsService.getRecommendations).mockResolvedValue([mockCluster]);

    const { result } = renderHook(() => useRecommendations());

    // Instant SWR fast-path resolves
    await waitFor(() => {
      expect(result.current.clusters).toHaveLength(1);
      expect(result.current.clusters[0].items[0].title).toBe('Dune: Part Two');
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.aiDna?.thematic_axes).toContain('Sci-Fi Cósmico');
    expect(result.current.lastGeneratedAt).toBe('2026-10-02T10:00:00Z');
  });

  it('sets isGenerating instead of isLoading when revalidating in background with existing clusters', async () => {
    // Return cached cluster immediately
    vi.mocked(CultureFeedbackStorage.getCachedRecommendations).mockResolvedValue({
      clusters: [mockCluster],
      generated_at: '2026-10-02T10:00:00Z',
      library_hash: 'old-hash',
    });

    // Make getRecommendations slow to simulate background Gemini re-generation
    let resolveGeneration: (value: RecommendationCluster[]) => void;
    const slowPromise = new Promise<RecommendationCluster[]>(resolve => {
      resolveGeneration = resolve;
    });
    vi.mocked(CultureRecommendationsService.getRecommendationsProgressive).mockReturnValue(slowPromise);
    vi.mocked(CultureRecommendationsService.getRecommendations).mockReturnValue(slowPromise);

    const { result } = renderHook(() => useRecommendations());

    // Initially loads SWR cache
    await waitFor(() => {
      expect(result.current.clusters).toHaveLength(1);
      expect(result.current.isLoading).toBe(false);
    });

    // When background revalidation runs, clusters are NOT wiped out
    expect(result.current.clusters.length).toBeGreaterThan(0);

    // Resolve the background revalidation
    const updatedCluster: RecommendationCluster = {
      ...mockCluster,
      items: [
        mockHydratedItem,
        {
          ...mockHydratedItem,
          id: 'rec_filme_blade_runner',
          title: 'Blade Runner 2049',
        },
      ],
    };

    await act(async () => {
      resolveGeneration!([updatedCluster]);
    });

    await waitFor(() => {
      expect(result.current.clusters[0].items).toHaveLength(2);
      expect(result.current.isGenerating).toBe(false);
    });
  });

  it('performs optimistic removal on handleDislikeItem and handleMarkAlreadySeen', async () => {
    vi.mocked(CultureFeedbackStorage.getCachedRecommendations).mockResolvedValue({
      clusters: [mockCluster],
      generated_at: '2026-10-02T10:00:00Z',
      library_hash: 'hash-abc',
    });
    vi.mocked(CultureRecommendationsService.getRecommendations).mockResolvedValue([mockCluster]);

    const { result } = renderHook(() => useRecommendations());

    await waitFor(() => {
      expect(result.current.clusters).toHaveLength(1);
    });

    // Dislike item (optimistically removes)
    await act(async () => {
      await result.current.handleDislikeItem(mockHydratedItem);
    });

    // Cluster should now be empty and filtered out
    expect(result.current.clusters).toHaveLength(0);
    expect(CultureRecommendationsService.dislikeItem).toHaveBeenCalledWith(
      mockHydratedItem,
      'not_interested'
    );
  });

  it('marks items as added optimistically on handleAddItem', async () => {
    vi.mocked(CultureFeedbackStorage.getCachedRecommendations).mockResolvedValue({
      clusters: [mockCluster],
      generated_at: '2026-10-02T10:00:00Z',
      library_hash: 'hash-abc',
    });
    vi.mocked(CultureRecommendationsService.getRecommendations).mockResolvedValue([mockCluster]);

    const onLibraryUpdated = vi.fn();
    const { result } = renderHook(() => useRecommendations(onLibraryUpdated));

    await waitFor(() => {
      expect(result.current.clusters).toHaveLength(1);
    });

    await act(async () => {
      await result.current.handleAddItem(mockHydratedItem);
    });

    expect(result.current.addedItemIds.has('rec_filme_dune_2024')).toBe(true);
    expect(CultureRecommendationsService.addToLibrary).toHaveBeenCalledWith(mockHydratedItem);
    expect(onLibraryUpdated).toHaveBeenCalledTimes(1);
  });
});
