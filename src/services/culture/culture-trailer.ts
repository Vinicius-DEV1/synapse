import { getVideoId } from '../../components/editor-extensions/links/youtubeUtils';
import {
  fetchCinemetaMetadata,
  fetchImdbMovies,
  fetchImdbSeries,
} from './culture-apis';
import type { CultureType } from '../../types';

export interface TrailerInfo {
  youtubeId: string;
  embedUrl: string;
  watchUrl: string;
  source: 'direct' | 'cinemeta' | 'jikan' | 'imdb';
}

export interface CultureTrailerLookup {
  id?: string;
  title: string;
  type?: CultureType | string;
  year?: number | null;
  api_id?: string;
  api_source?: string;
  trailer_url?: string;
  trailer_yt_id?: string;
  access_link?: string;
}

const trailerCache = new Map<string, { timestamp: number; data: TrailerInfo | null }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Validates and extracts an 11-character YouTube video ID.
 */
export function extractYoutubeId(input?: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  return getVideoId(trimmed);
}

/**
 * Formats a clean standard YouTube watch URL.
 */
export function getYoutubeWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

/**
 * Formats a clean privacy-enhanced YouTube embed URL (youtube-nocookie.com).
 * Automatically respects Web origin vs Tauri protocol to avoid YouTube Error 153.
 */
export function getYoutubeEmbedUrl(youtubeId: string, autoPlay = false): string {
  const origin = typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')
    ? `&origin=${encodeURIComponent(window.location.origin)}`
    : '';
  const autoplayParam = autoPlay ? '&autoplay=1' : '';
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0${autoplayParam}${origin}`;
}

/**
 * Generates an external fallback search query URL on YouTube.
 */
export function getYoutubeSearchUrl(title: string, type?: string): string {
  const typeHint = type === 'filme' ? 'trailer oficial' : type === 'anime' ? 'anime trailer oficial' : 'trailer oficial';
  const query = `${title} ${typeHint}`.trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/**
 * High-speed resolver for official movie, series, and anime trailers.
 * Caches results in memory to achieve 0ms perceived latency on repeated openings.
 */
export async function resolveTrailer(item: CultureTrailerLookup): Promise<TrailerInfo | null> {
  if (!item || !item.title) return null;

  const normalizedTitle = item.title.trim().toLowerCase();
  const cacheKey = `${item.type || 'all'}_${normalizedTitle}_${item.year || ''}_${item.api_id || ''}`;

  const cached = trailerCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 1. Direct YouTube ID from item metadata
  const directId = extractYoutubeId(item.trailer_yt_id) ||
    extractYoutubeId(item.trailer_url) ||
    (item.access_link ? extractYoutubeId(item.access_link) : null);

  if (directId) {
    const info: TrailerInfo = {
      youtubeId: directId,
      embedUrl: getYoutubeEmbedUrl(directId),
      watchUrl: getYoutubeWatchUrl(directId),
      source: 'direct',
    };
    trailerCache.set(cacheKey, { timestamp: Date.now(), data: info });
    return info;
  }

  // 2. Direct Cinemeta check if IMDb ID is already present
  if (item.api_id && item.api_id.startsWith('tt')) {
    try {
      const mediaType = item.type === 'série' ? 'series' : 'movie';
      const meta = await fetchCinemetaMetadata(item.api_id, mediaType);
      const ytId = extractYoutubeId(meta?.trailer_yt_id) || extractYoutubeId(meta?.trailer_url);
      if (ytId) {
        const info: TrailerInfo = {
          youtubeId: ytId,
          embedUrl: getYoutubeEmbedUrl(ytId),
          watchUrl: getYoutubeWatchUrl(ytId),
          source: 'cinemeta',
        };
        trailerCache.set(cacheKey, { timestamp: Date.now(), data: info });
        return info;
      }
    } catch {
      // Continue to search fallbacks
    }
  }

  // 3. Search for movies and series via IMDb autosuggest -> Cinemeta
  if (item.type === 'filme' || item.type === 'série' || !item.type) {
    try {
      const isSeries = item.type === 'série';
      const results = isSeries
        ? await fetchImdbSeries(item.title)
        : await fetchImdbMovies(item.title);

      const firstImdb = results.find(r => r.api_id?.startsWith('tt'));
      if (firstImdb?.api_id) {
        const meta = await fetchCinemetaMetadata(firstImdb.api_id, isSeries ? 'series' : 'movie');
        const ytId = extractYoutubeId(meta?.trailer_yt_id) || extractYoutubeId(meta?.trailer_url);
        if (ytId) {
          const info: TrailerInfo = {
            youtubeId: ytId,
            embedUrl: getYoutubeEmbedUrl(ytId),
            watchUrl: getYoutubeWatchUrl(ytId),
            source: 'imdb',
          };
          trailerCache.set(cacheKey, { timestamp: Date.now(), data: info });
          return info;
        }
      }
    } catch {
      // Fallback
    }
  }

  // 4. Search anime via Cinemeta catalog or Jikan
  if (item.type === 'anime') {
    try {
      const cleanTitle = encodeURIComponent(item.title.trim());
      const searchRes = await fetch(
        `https://v3-cinemeta.strem.io/catalog/series/top/search=${cleanTitle}.json`
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const firstMatch = (searchData?.metas || []).find((m: { id?: string }) => m.id?.startsWith('tt'));
        if (firstMatch?.id) {
          const meta = await fetchCinemetaMetadata(firstMatch.id, 'series');
          const ytId = extractYoutubeId(meta?.trailer_yt_id) || extractYoutubeId(meta?.trailer_url);
          if (ytId) {
            const info: TrailerInfo = {
              youtubeId: ytId,
              embedUrl: getYoutubeEmbedUrl(ytId),
              watchUrl: getYoutubeWatchUrl(ytId),
              source: 'cinemeta',
            };
            trailerCache.set(cacheKey, { timestamp: Date.now(), data: info });
            return info;
          }
        }
      }
    } catch {
      // Fallback
    }
  }

  // Store negative result in cache to prevent repeated failed network sweeps
  trailerCache.set(cacheKey, { timestamp: Date.now(), data: null });
  return null;
}

export const CultureTrailerService = {
  resolveTrailer,
  extractYoutubeId,
  getYoutubeWatchUrl,
  getYoutubeEmbedUrl,
  getYoutubeSearchUrl,
  clearCache: () => trailerCache.clear(),
};
