import { describe, it, expect, vi } from 'vitest';
import { hydrateRecommendations, searchMediaForRecommendation } from './culture-recommendation-hydrator';
import type { CultureItem } from '../../types';
import type { RawAIRecommendation } from '../../types/culture-recommendations';
import * as cultureApis from './culture-apis';

describe('culture-recommendation-hydrator', () => {
  it('deduplicates items against existing library using normalized titles', async () => {
    const existingLibrary: CultureItem[] = [
      {
        id: '1',
        title: 'Her: O Filme',
        type: 'filme',
        progress: 1,
        total_progress: 1,
        is_goal: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ];

    const rawItems: RawAIRecommendation[] = [
      {
        title: 'Her: O Filme',
        type: 'filme',
        tier: 'classic',
        cluster: 'Sci-Fi',
        affinity_reason: 'Você assistiu Her',
        confidence_score: 0.99,
      },
    ];

    const results = await hydrateRecommendations(rawItems, existingLibrary);
    expect(results).toHaveLength(0); // Filtered out because it's already in the library
  });

  it('tries fallback queries when primary search hint yields no results', async () => {
    const imdbSpy = vi.spyOn(cultureApis, 'fetchImdbMovies').mockImplementation(async (query: string) => {
      if (query === 'Denis Villeneuve Dune 3') return [];
      if (query === 'Dune: Messiah') {
        return [
          {
            title: 'Dune: Messiah',
            type: 'filme',
            api_id: 'tt99999',
            api_source: 'imdb',
            synopsis: 'Third part of Dune series.',
            cover: 'https://example.com/dune3.jpg',
            total: 0,
          },
        ];
      }
      return [];
    });

    const itunesSpy = vi.spyOn(cultureApis, 'fetchITunesMovies').mockResolvedValue([]);

    const item: RawAIRecommendation = {
      title: 'Dune: Messiah',
      search_hint: 'Denis Villeneuve Dune 3',
      type: 'filme',
      tier: 'upcoming',
      cluster: 'Sci-Fi',
      affinity_reason: 'Sequência direta',
      confidence_score: 0.95,
      expected_release_date: '2026',
    };

    const match = await searchMediaForRecommendation(item);
    expect(match).not.toBeNull();
    expect(match?.title).toBe('Dune: Messiah');
    expect(imdbSpy).toHaveBeenCalledWith('Denis Villeneuve Dune 3');
    expect(imdbSpy).toHaveBeenCalledWith('Dune: Messiah');

    imdbSpy.mockRestore();
    itunesSpy.mockRestore();
  });

  it('rejects unrelated or wrong covers from API searches (preventing cover contamination)', async () => {
    // API returns a 1979 Alien movie when searching for 2024 Alien: Romulus
    const imdbSpy = vi.spyOn(cultureApis, 'fetchImdbMovies').mockResolvedValue([
      {
        title: 'Alien',
        type: 'filme',
        api_id: 'tt0078748',
        api_source: 'imdb',
        synopsis: 'Classic 1979 film.',
        cover: 'https://example.com/alien1979.jpg',
        total: 0,
      },
    ]);

    const itunesSpy = vi.spyOn(cultureApis, 'fetchITunesMovies').mockResolvedValue([]);

    const item: RawAIRecommendation = {
      title: 'Alien: Romulus',
      type: 'filme',
      tier: 'recent',
      cluster: 'Sci-Fi Horror',
      affinity_reason: 'Novo filme da franquia',
      confidence_score: 0.95,
    };

    const match = await searchMediaForRecommendation(item);
    // Must be null because Alien (1979) does not match Alien: Romulus!
    expect(match).toBeNull();

    imdbSpy.mockRestore();
    itunesSpy.mockRestore();
  });
});
