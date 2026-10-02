import type { CultureItem } from '../../types';
import type { RawAIRecommendation, HydratedRecommendation } from '../../types/culture-recommendations';
import {
  fetchImdbMovies,
  fetchITunesMovies,
  fetchTVMaze,
  fetchJikan,
  fetchGoogleBooks,
  type CultureSearchResult,
} from './culture-apis';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalizes title strings for fuzzy deduplication against existing library items.
 */
function normalizeTitleForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Searches the appropriate API for a single raw recommendation with query retry fallbacks.
 */
export async function searchMediaForRecommendation(item: RawAIRecommendation): Promise<CultureSearchResult | null> {
  const queriesToTry: string[] = [];
  if (item.search_hint) queriesToTry.push(item.search_hint);
  if (item.title && !queriesToTry.includes(item.title)) queriesToTry.push(item.title);
  if (item.original_title && !queriesToTry.includes(item.original_title)) queriesToTry.push(item.original_title);

  for (const query of queriesToTry) {
    try {
      if (item.type === 'filme') {
        const imdbMatches = await fetchImdbMovies(query);
        if (imdbMatches.length > 0) return imdbMatches[0];
        const itunesMatches = await fetchITunesMovies(query);
        if (itunesMatches.length > 0) return itunesMatches[0];
      } else if (item.type === 'série') {
        const tvMatches = await fetchTVMaze(query);
        if (tvMatches.length > 0) return tvMatches[0];
        // Fallback to IMDb for international shows or limited series
        const imdbMatches = await fetchImdbMovies(query);
        if (imdbMatches.length > 0) return imdbMatches[0];
      } else if (item.type === 'anime' || item.type === 'manga') {
        const jikanMatches = await fetchJikan(query, item.type);
        if (jikanMatches.length > 0) return jikanMatches[0];
      } else if (item.type === 'livro' || item.type === 'novel' || item.type === 'hq') {
        const bookMatches = await fetchGoogleBooks(query, item.type);
        if (bookMatches.length > 0) return bookMatches[0];
      }
    } catch (err) {
      console.warn(`[Hydrator] Erro ao buscar dados para "${query}":`, err);
    }
  }

  return null;
}

/**
 * Hydrates AI recommendations with real-world metadata, high-res posters, and synopses.
 * Uses batching and rate limiting to avoid tripping API quotas.
 */
export async function hydrateRecommendations(
  rawItems: RawAIRecommendation[],
  existingLibrary: CultureItem[]
): Promise<HydratedRecommendation[]> {
  const existingNormalizedTitles = new Set(
    existingLibrary.map(i => normalizeTitleForComparison(i.title || ''))
  );

  const hydratedResults: HydratedRecommendation[] = [];
  const BATCH_SIZE = 3;
  const DELAY_MS = 300;

  for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
    const batch = rawItems.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (rawItem): Promise<HydratedRecommendation | null> => {
        const normalized = normalizeTitleForComparison(rawItem.title || '');
        const normalizedOriginal = rawItem.original_title
          ? normalizeTitleForComparison(rawItem.original_title)
          : '';

        if (existingNormalizedTitles.has(normalized) || (normalizedOriginal && existingNormalizedTitles.has(normalizedOriginal))) {
          // Already in user's library, skip to maintain 100% fresh suggestions
          return null;
        }

        const match = await searchMediaForRecommendation(rawItem);

        // Anti-hallucination guard: If no match found and no release anchor, reject hallucination
        if (!match && !rawItem.release_date && !rawItem.expected_release_date) {
          return null;
        }

        const deterministicId = `rec_${rawItem.type}_${slugify(rawItem.title)}_${rawItem.year || ''}`;

        return {
          ...rawItem,
          id: deterministicId,
          title: match?.title || rawItem.title,
          synopsis: match?.synopsis || rawItem.affinity_reason,
          cover_image: match?.cover || undefined,
          api_id: match?.api_id,
          api_source: match?.api_source as HydratedRecommendation['api_source'],
          episodes_count: match?.episodes_count || null,
          status: rawItem.tier === 'upcoming' ? 'upcoming' : match?.status,
          expected_release_date: rawItem.expected_release_date,
          creator: rawItem.creator,
          already_in_library: false,
        };
      })
    );

    for (const item of batchResults) {
      if (item) {
        hydratedResults.push(item);
      }
    }

    if (i + BATCH_SIZE < rawItems.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  return hydratedResults;
}
