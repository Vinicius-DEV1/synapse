import type { CultureItem } from '../../types';
import type { RawAIRecommendation, HydratedRecommendation } from '../../types/culture-recommendations';
import {
  fetchImdbMovies,
  fetchImdbSeries,
  fetchITunesMovies,
  fetchTVMaze,
  fetchJikan,
  fetchGoogleBooks,
  fetchCinemetaMetadata,
  type CultureSearchResult,
} from './culture-apis';
import {
  fetchOpenLibraryBooks,
  fetchAniListMedia,
  fetchKitsuManga,
} from './culture-media-providers';
import {
  normalizeTitle,
  areTitlesEquivalent,
  cleanEditionModifiers,
  cleanSeasonModifiers,
  isItemInLibrary,
} from './culture-title-utils';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validates that an external media search result actually corresponds to the recommendation,
 * preventing cross-medium cover contamination or attaching unrelated popular movie covers.
 */
export function isMediaMatchValid(
  candidate: RawAIRecommendation,
  match: CultureSearchResult
): boolean {
  if (!match || !match.title) return false;

  const candTitle = candidate.title || '';
  const candOriginal = candidate.original_title || '';
  const candHint = candidate.search_hint || '';
  const isSeries = candidate.type === 'série' || candidate.type === 'anime';

  // 1. Direct title equivalence check (handles accents, editions, seasons)
  if (areTitlesEquivalent(candTitle, match.title, { isSeries })) {
    return true;
  }
  if (candOriginal && areTitlesEquivalent(candOriginal, match.title, { isSeries })) {
    return true;
  }
  if (candHint && areTitlesEquivalent(candHint, match.title, { isSeries })) {
    return true;
  }

  // 2. Token overlap check
  const normCand = normalizeTitle(candTitle);
  const normMatch = normalizeTitle(match.title);
  const normOriginal = candOriginal ? normalizeTitle(candOriginal) : '';

  // For movies and books, if numbers differ, reject (e.g. Dune 1 vs Dune 2)
  const numCand = normCand.match(/\b\d+\b/g)?.join('') || '';
  const numMatch = normMatch.match(/\b\d+\b/g)?.join('') || '';
  if (!isSeries && numCand !== numMatch) {
    return false;
  }

  const tokensCand = normCand.split(' ').filter(t => t.length > 1);
  const tokensMatch = normMatch.split(' ').filter(t => t.length > 1);

  if (tokensCand.length > 0 && tokensMatch.length > 0) {
    const candSet = new Set(tokensCand);
    const common = tokensMatch.filter(t => candSet.has(t));
    const overlapRatio = common.length / Math.min(tokensCand.length, tokensMatch.length);

    if (overlapRatio >= 0.75 && common.length >= 2) {
      return true;
    }
  }

  if (normOriginal) {
    const tokensOrig = normOriginal.split(' ').filter(t => t.length > 1);
    if (tokensOrig.length > 0 && tokensMatch.length > 0) {
      const origSet = new Set(tokensOrig);
      const commonOrig = tokensMatch.filter(t => origSet.has(t));
      const overlapRatioOrig = commonOrig.length / Math.min(tokensOrig.length, tokensMatch.length);
      if (overlapRatioOrig >= 0.75 && commonOrig.length >= 2) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Searches candidates among results and picks the first valid match.
 */
function pickValidMatch(
  matches: CultureSearchResult[],
  item: RawAIRecommendation
): CultureSearchResult | null {
  for (const match of matches) {
    if (match.cover && isMediaMatchValid(item, match)) {
      return match;
    }
  }
  return null;
}

/**
 * Searches the appropriate API for a single raw recommendation with multi-tiered provider fallbacks.
 */
export async function searchMediaForRecommendation(item: RawAIRecommendation): Promise<CultureSearchResult | null> {
  const queriesToTry: string[] = [];
  if (item.search_hint && !queriesToTry.includes(item.search_hint)) queriesToTry.push(item.search_hint);
  if (item.title && !queriesToTry.includes(item.title)) queriesToTry.push(item.title);
  if (item.original_title && !queriesToTry.includes(item.original_title)) queriesToTry.push(item.original_title);

  // Clean edition modifiers for search if title contains them (e.g. "Ex-Machina: Versão Longa" -> "Ex-Machina")
  const cleanEdition = cleanEditionModifiers(item.title || '');
  if (cleanEdition && cleanEdition !== item.title && !queriesToTry.includes(cleanEdition)) {
    queriesToTry.push(cleanEdition);
  }

  // Clean season modifiers for series/anime (e.g. "Succession: Temporada 3" -> "Succession")
  if (item.type === 'série' || item.type === 'anime') {
    const cleanSeason = cleanSeasonModifiers(item.title || '');
    if (cleanSeason && cleanSeason !== item.title && !queriesToTry.includes(cleanSeason)) {
      queriesToTry.push(cleanSeason);
    }
  }

  for (const query of queriesToTry.slice(0, 4)) {
    try {
      if (item.type === 'filme') {
        const imdbMatches = await fetchImdbMovies(query);
        const validImdb = pickValidMatch(imdbMatches, item);
        if (validImdb) return validImdb;

        const itunesMatches = await fetchITunesMovies(query);
        const validItunes = pickValidMatch(itunesMatches, item);
        if (validItunes) return validItunes;
      } else if (item.type === 'série') {
        const tvMatches = await fetchTVMaze(query);
        const validTv = pickValidMatch(tvMatches, item);
        if (validTv) return validTv;

        const imdbMatches = await fetchImdbSeries(query);
        const validImdb = pickValidMatch(imdbMatches, item);
        if (validImdb) return validImdb;

        const itunesMatches = await fetchITunesMovies(query);
        const validItunes = pickValidMatch(itunesMatches, item);
        if (validItunes) return validItunes;
      } else if (item.type === 'anime') {
        // 1. AniList (instant GraphQL, ultra high-res covers, zero 504s)
        const aniMatches = await fetchAniListMedia(query, 'ANIME');
        const validAni = pickValidMatch(aniMatches, item);
        if (validAni) return validAni;

        // 2. TVMaze (comprehensive TV anime series catalog)
        const tvMatches = await fetchTVMaze(query);
        const validTv = pickValidMatch(tvMatches, item);
        if (validTv) return validTv;

        // 3. Jikan (if circuit breaker is open)
        const jikanMatches = await fetchJikan(query, 'anime');
        const validJikan = pickValidMatch(jikanMatches, item);
        if (validJikan) return validJikan;

        // 4. IMDb TV fallback
        const imdbMatches = await fetchImdbSeries(query);
        const validImdb = pickValidMatch(imdbMatches, item);
        if (validImdb) return validImdb;
      } else if (item.type === 'manga') {
        // 1. AniList (instant, high-res manga covers and chapter data)
        const aniMatches = await fetchAniListMedia(query, 'MANGA');
        const validAni = pickValidMatch(aniMatches, item);
        if (validAni) return validAni;

        // 2. Kitsu (reliable public manga API)
        const kitsuMatches = await fetchKitsuManga(query);
        const validKitsu = pickValidMatch(kitsuMatches, item);
        if (validKitsu) return validKitsu;

        // 3. Open Library (published manga volumes and editions)
        const olMatches = await fetchOpenLibraryBooks(query, 'manga');
        const validOl = pickValidMatch(olMatches, item);
        if (validOl) return validOl;

        // 4. Google Books fallback
        const bookMatches = await fetchGoogleBooks(query, 'manga');
        const validBook = pickValidMatch(bookMatches, item);
        if (validBook) return validBook;

        // 5. Jikan fallback
        const jikanMatches = await fetchJikan(query, 'manga');
        const validJikan = pickValidMatch(jikanMatches, item);
        if (validJikan) return validJikan;
      } else if (item.type === 'livro' || item.type === 'novel' || item.type === 'hq') {
        // 1. Open Library (no daily quotas, 100% cover success rate on national & international books)
        const olMatches = await fetchOpenLibraryBooks(query, item.type);
        const validOl = pickValidMatch(olMatches, item);
        if (validOl) return validOl;

        // 2. Google Books
        const bookMatches = await fetchGoogleBooks(query, item.type);
        const validBook = pickValidMatch(bookMatches, item);
        if (validBook) return validBook;

        // 3. AniList for Light Novels and HQs
        const aniMatches = await fetchAniListMedia(query, 'MANGA');
        const validAni = pickValidMatch(aniMatches, item);
        if (validAni) return validAni;
      }
    } catch (err) {
      console.warn(`[Hydrator] Erro ao buscar dados para "${query}":`, err);
    }
  }

  return null;
}

/**
 * Hydrates AI recommendations with real-world metadata, high-res posters, and synopses.
 * Uses batching, rate limiting, and dual pre/post-search library deduplication.
 */
export async function hydrateRecommendations(
  rawItems: RawAIRecommendation[],
  existingLibrary: CultureItem[],
  seenTracker: Set<string> = new Set<string>()
): Promise<HydratedRecommendation[]> {
  const hydratedResults: HydratedRecommendation[] = [];
  const BATCH_SIZE = 4;
  const DELAY_MS = 60;

  for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
    const batch = rawItems.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (rawItem): Promise<HydratedRecommendation | null> => {
        try {
          const normTitle = normalizeTitle(rawItem.title || '');
          const normOriginal = rawItem.original_title ? normalizeTitle(rawItem.original_title) : '';
          const cleanEdition = normalizeTitle(cleanEditionModifiers(rawItem.title || ''));
          const cleanSeason = (rawItem.type === 'série' || rawItem.type === 'anime')
            ? normalizeTitle(cleanSeasonModifiers(cleanEdition || rawItem.title || ''))
            : '';

          // 1. Pre-search check: already in library or already processed in current generation
          if (
            isItemInLibrary(rawItem, existingLibrary) ||
            seenTracker.has(normTitle) ||
            (normOriginal && seenTracker.has(normOriginal)) ||
            (cleanEdition && seenTracker.has(cleanEdition)) ||
            (cleanSeason && seenTracker.has(cleanSeason))
          ) {
            return null;
          }

          let match: CultureSearchResult | null = null;
          try {
            match = await searchMediaForRecommendation(rawItem);
          } catch (fetchErr) {
            console.warn(`[Hydrator] Falha ao consultar metadados para "${rawItem.title}":`, fetchErr);
          }

          // 2. Post-search check: verify API metadata matches against library or seen items
          if (match) {
            const isMatchInLib = isItemInLibrary(
              {
                title: match.title,
                api_id: match.api_id,
                api_source: match.api_source,
                type: rawItem.type,
              },
              existingLibrary
            );

            const normMatchTitle = normalizeTitle(match.title);
            if (isMatchInLib || (match.api_id && seenTracker.has(match.api_id)) || seenTracker.has(normMatchTitle)) {
              return null;
            }
          }

          // Mark as seen in this generation session
          seenTracker.add(normTitle);
          if (normOriginal) seenTracker.add(normOriginal);
          if (cleanEdition) seenTracker.add(cleanEdition);
          if (cleanSeason) seenTracker.add(cleanSeason);
          if (match?.title) seenTracker.add(normalizeTitle(match.title));
          if (match?.api_id) seenTracker.add(match.api_id);

          // Enrich with Cinemeta if match has an IMDb ID
          let cinemetaExtra: Partial<CultureSearchResult> | null = null;
          if (match && (match.api_id?.startsWith('tt') || match.api_source === 'imdb')) {
            try {
              cinemetaExtra = await fetchCinemetaMetadata(
                match.api_id,
                rawItem.type === 'série' ? 'series' : 'movie'
              );
            } catch (cinErr) {
              // Gracefully continue with base match
            }
          }

          const deterministicId = `rec_${rawItem.type}_${slugify(rawItem.title)}_${rawItem.year || ''}`;

          // Select the richest plot synopsis, rejecting any actor listings or shallow placeholders
          const cleanApiSynopsis =
            match?.synopsis &&
            !match.synopsis.startsWith('Estrelando:') &&
            !match.synopsis.startsWith('Starring:') &&
            match.synopsis.trim().length > 40
              ? match.synopsis.trim()
              : '';

          const finalSynopsis =
            rawItem.synopsis?.trim() || cleanApiSynopsis || rawItem.affinity_reason;

          const resolvedRating = cinemetaExtra?.rating ?? match?.rating ?? rawItem.rating;
          const resolvedRatingSource =
            cinemetaExtra?.rating_source ??
            match?.rating_source ??
            (rawItem.rating !== undefined ? 'Estimativa' : undefined);

          const resolvedPlatform = match?.platform ?? rawItem.platform;
          const resolvedCountry = cinemetaExtra?.origin_country ?? match?.origin_country ?? rawItem.origin_country;
          const resolvedDuration = cinemetaExtra?.duration ?? match?.duration ?? rawItem.duration;
          const resolvedDirector = cinemetaExtra?.director ?? match?.director ?? rawItem.creator;
          const resolvedCast = cinemetaExtra?.cast ?? match?.cast ?? rawItem.cast;
          const resolvedGenres = cinemetaExtra?.genres?.length
            ? cinemetaExtra.genres
            : match?.genres?.length
            ? match.genres
            : rawItem.genres;
          const resolvedTrailerUrl = cinemetaExtra?.trailer_url ?? match?.trailer_url ?? rawItem.trailer_url;
          const resolvedTrailerYtId = cinemetaExtra?.trailer_yt_id ?? match?.trailer_yt_id ?? rawItem.trailer_yt_id;

          return {
            ...rawItem,
            id: deterministicId,
            title: rawItem.title,
            synopsis: finalSynopsis,
            cover_image: match?.cover || undefined,
            api_id: match?.api_id,
            api_source: match?.api_source as HydratedRecommendation['api_source'],
            episodes_count: match?.episodes_count || null,
            status: rawItem.tier === 'upcoming' ? 'upcoming' : match?.status,
            expected_release_date: rawItem.expected_release_date,
            creator: resolvedDirector,
            director: resolvedDirector,
            cast: resolvedCast,
            rating: resolvedRating,
            rating_source: resolvedRatingSource,
            platform: resolvedPlatform,
            origin_country: resolvedCountry,
            duration: resolvedDuration,
            genres: resolvedGenres,
            trailer_url: resolvedTrailerUrl,
            trailer_yt_id: resolvedTrailerYtId,
            already_in_library: false,
          };
        } catch (unexpectedErr) {
          console.error(`[Hydrator] Erro inesperado ao processar "${rawItem.title}", preservando recomendação bruta:`, unexpectedErr);
          const fallbackId = `rec_${rawItem.type}_${slugify(rawItem.title || 'item')}_${rawItem.year || ''}`;
          return {
            ...rawItem,
            id: fallbackId,
            title: rawItem.title,
            synopsis: rawItem.synopsis?.trim() || rawItem.affinity_reason,
            already_in_library: false,
          };
        }

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

