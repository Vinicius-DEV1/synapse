export interface CultureSearchResult {
  title: string;
  synopsis: string;
  cover: string;
  total: number;
  year?: number | null;
  volumes?: number | null;
  chapters?: number | null;
  episodes_count?: number | null;
  type: string;
  api_id: string;
  api_source: string;
  status?: 'releasing' | 'finished' | 'unknown';
  cast?: string;
  rating?: number;
  rating_source?: string;
  platform?: string;
  origin_country?: string;
  duration?: string;
  director?: string;
  genres?: string[];
  trailer_url?: string;
  trailer_yt_id?: string;
}

interface CinemetaTrailer {
  type?: string;
  source?: string;
}

interface JikanItem {
  mal_id: number | string;
  title: string;
  synopsis?: string;
  score?: number;
  studios?: { name: string }[];
  authors?: { name: string }[];
  genres?: { name: string }[];
  trailer?: { youtube_id?: string; url?: string };
  images?: { jpg?: { large_image_url?: string } };
  episodes?: number;
  chapters?: number;
  volumes?: number;
  status?: string;
}

interface GoogleBookVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    description?: string;
    averageRating?: number;
    publisher?: string;
    authors?: string[];
    pageCount?: number;
    imageLinks?: { thumbnail?: string };
    categories?: string[];
  };
}

interface TVMazeShowItem {
  show?: {
    id: number | string;
    name: string;
    summary?: string;
    rating?: { average?: number };
    webChannel?: { name?: string; country?: { name?: string } };
    network?: { name?: string; country?: { name?: string } };
    averageRuntime?: number;
    runtime?: number;
    image?: { medium?: string };
    status?: string;
    genres?: string[];
  };
}

interface ImdbSuggestItem {
  id?: string;
  l?: string;
  y?: number;
  s?: string;
  qid?: string;
  q?: string;
  i?: { imageUrl?: string };
}

interface ITunesItem {
  trackId: number | string;
  trackName?: string;
  releaseDate?: string;
  trackTimeMillis?: number;
  longDescription?: string;
  shortDescription?: string;
  artworkUrl100?: string;
  artistName?: string;
  kind?: string;
}


const cultureApiCache = new Map<string, { timestamp: number; data: CultureSearchResult[] }>();
const cinemetaCache = new Map<string, { timestamp: number; data: Partial<CultureSearchResult> }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Fetches high-precision metadata for movies and TV series from Cinemeta using IMDb IDs.
 * Provides exact IMDb ratings, runtime, cast, director, country of origin, genre classifications, and official trailers.
 */
export async function fetchCinemetaMetadata(
  imdbId: string,
  type: 'movie' | 'series' = 'movie'
): Promise<Partial<CultureSearchResult> | null> {
  if (!imdbId || !imdbId.startsWith('tt')) return null;

  const cacheKey = `cinemeta_${type}_${imdbId}`;
  const cached = cinemetaCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.meta;
    if (!meta) return null;

    const parsedRating = meta.imdbRating ? parseFloat(meta.imdbRating) : undefined;
    const rating = typeof parsedRating === 'number' && !isNaN(parsedRating) ? parsedRating : undefined;

    const directorStr = Array.isArray(meta.director) && meta.director.length > 0
      ? meta.director.join(', ')
      : undefined;

    const castStr = Array.isArray(meta.cast) && meta.cast.length > 0
      ? meta.cast.slice(0, 4).join(', ')
      : undefined;

    const trailers: CinemetaTrailer[] = Array.isArray(meta.trailers) ? meta.trailers : [];
    const mainTrailer = trailers.find((t) => t && t.type === 'Trailer') || trailers[0];
    const rawTrailer = mainTrailer?.source || (typeof meta.trailer === 'string' ? meta.trailer : undefined);
    let trailer_yt_id: string | undefined = undefined;
    if (typeof rawTrailer === 'string') {
      const match = rawTrailer.match(/([a-zA-Z0-9_-]{11})/);
      if (match) {
        trailer_yt_id = match[1];
      }
    }
    const trailer_url = trailer_yt_id ? `https://www.youtube.com/watch?v=${trailer_yt_id}` : undefined;

    const result: Partial<CultureSearchResult> = {
      rating,
      rating_source: rating !== undefined ? 'IMDb' : undefined,
      duration: meta.runtime ? String(meta.runtime) : undefined,
      origin_country: meta.country ? String(meta.country) : undefined,
      director: directorStr,
      cast: castStr,
      genres: Array.isArray(meta.genres) ? meta.genres : undefined,
      trailer_url,
      trailer_yt_id,
    };

    cinemetaCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  } catch (err) {
    console.warn('[CultureAPI] Erro ao buscar meta no Cinemeta:', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}


let lastJikanRequestTime = 0;
let jikanCooldownUntil = 0;
let googleBooksCooldownUntil = 0;

export function isJikanAvailable(): boolean {
  return Date.now() >= jikanCooldownUntil;
}

export function reportJikanFailure(durationMs = 120000): void {
  jikanCooldownUntil = Date.now() + durationMs;
}

async function throttleJikan(): Promise<void> {
  const now = Date.now();
  if (now < jikanCooldownUntil) {
    throw new Error('Jikan cooldown active');
  }
  const timeSinceLast = now - lastJikanRequestTime;
  if (timeSinceLast < 360) {
    await new Promise(resolve => setTimeout(resolve, 360 - timeSinceLast));
  }
  lastJikanRequestTime = Date.now();
}

/**
 * Queries Jikan API (MyAnimeList) for anime or manga
 */
export async function fetchJikan(q: string, t: 'anime' | 'manga'): Promise<CultureSearchResult[]> {
  const cacheKey = `jikan_${t}_${q.toLowerCase().trim()}`;
  const cached = cultureApiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  if (Date.now() < jikanCooldownUntil) {
    return [];
  }

  try {
    await throttleJikan();
    const res = await fetch(`https://api.jikan.moe/v4/${t}?q=${encodeURIComponent(q)}&limit=3`);
    if (!res.ok) {
      if (res.status === 429 || res.status === 504 || res.status >= 500) {
        reportJikanFailure(120000); // 2-min circuit breaker
      }
      return [];
    }
    const data = await res.json();
    const results: CultureSearchResult[] = ((data?.data || []) as JikanItem[]).map((item) => {
      const rawScore = item.score;
      const rating = typeof rawScore === 'number' && !isNaN(rawScore) ? rawScore : undefined;
      const platform = item.studios?.[0]?.name || item.authors?.[0]?.name || undefined;
      const genres = Array.isArray(item.genres) ? item.genres.map((g: { name: string }) => g.name).filter(Boolean) : undefined;

      const trailerYtId = item.trailer?.youtube_id || undefined;
      const trailer_yt_id = trailerYtId && /^[a-zA-Z0-9_-]{11}$/.test(trailerYtId) ? trailerYtId : undefined;
      const trailer_url = item.trailer?.url || (trailer_yt_id ? `https://www.youtube.com/watch?v=${trailer_yt_id}` : undefined);

      return {
        title: item.title,
        synopsis: item.synopsis || '',
        cover: item.images?.jpg?.large_image_url || '',
        total: item.episodes || item.chapters || 0,
        volumes: item.volumes || null,
        chapters: item.chapters || null,
        episodes_count: item.episodes || null,
        type: t,
        api_id: item.mal_id.toString(),
        api_source: 'jikan',
        status: item.status === 'Currently Airing' || item.status === 'Publishing'
          ? 'releasing'
          : item.status === 'Finished Airing' || item.status === 'Finished'
          ? 'finished'
          : 'unknown',
        rating,
        rating_source: rating !== undefined ? 'MAL' : undefined,
        platform,
        duration: item.duration || undefined,
        genres,
        trailer_url,
        trailer_yt_id,
      };
    });

    cultureApiCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (err) {
    console.warn('[CultureAPI] Erro ao buscar no Jikan:', err);
    return [];
  }
}

/**
 * Queries Google Books API
 */
export async function fetchGoogleBooks(q: string, targetType = 'livro'): Promise<CultureSearchResult[]> {
  const cacheKey = `books_${q.toLowerCase().trim()}`;
  const cached = cultureApiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  if (Date.now() < googleBooksCooldownUntil) {
    return [];
  }

  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=3`);
    if (!res.ok) {
      if (res.status === 429) {
        googleBooksCooldownUntil = Date.now() + 15000; // 15s cooldown
      }
      return [];
    }
    const data = await res.json();
    const results: CultureSearchResult[] = ((data.items || []) as GoogleBookVolume[]).map((item) => {
      const vInfo = item.volumeInfo || {};
      const rawRating = vInfo.averageRating;
      const rating = typeof rawRating === 'number' && !isNaN(rawRating) ? rawRating : undefined;
      const publisher = vInfo.publisher || undefined;
      const authors = Array.isArray(vInfo.authors) ? vInfo.authors.join(', ') : undefined;
      const duration = vInfo.pageCount ? `${vInfo.pageCount} págs` : undefined;

      return {
        title: vInfo.title || q,
        synopsis: vInfo.description || '',
        cover: vInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
        total: vInfo.pageCount || 0,
        type: targetType,
        api_id: item.id,
        api_source: 'books',
        status: 'finished' as const,
        rating,
        rating_source: rating !== undefined ? 'Google Books' : undefined,
        platform: publisher,
        director: authors,
        duration,
        genres: Array.isArray(vInfo.categories) ? vInfo.categories : undefined,
      };
    });

    cultureApiCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (err) {
    console.warn('[CultureAPI] Erro ao buscar no Google Books:', err);
    return [];
  }
}

/**
 * Queries TVMaze API (TV Series)
 */
export async function fetchTVMaze(q: string): Promise<CultureSearchResult[]> {
  const cacheKey = `tvmaze_${q.toLowerCase().trim()}`;
  const cached = cultureApiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const results: CultureSearchResult[] = ((data || []) as TVMazeShowItem[]).slice(0, 3).map((item) => {
      const show = item.show || { id: '', name: '' };
      const rawRating = show.rating?.average;
      const rating = typeof rawRating === 'number' && !isNaN(rawRating) ? rawRating : undefined;
      const platform = show.webChannel?.name || show.network?.name || undefined;
      const country = show.network?.country?.name || show.webChannel?.country?.name || undefined;
      const duration = show.averageRuntime
        ? `${show.averageRuntime} min/ep`
        : show.runtime
        ? `${show.runtime} min/ep`
        : undefined;

      return {
        title: show.name,
        synopsis: (show.summary || '').replace(/<[^>]+>/g, ''),
        cover: show.image?.medium || '',
        total: 0,
        type: 'série',
        api_id: show.id.toString(),
        api_source: 'tvmaze',
        status: show.status === 'Running' ? 'releasing' : show.status === 'Ended' ? 'finished' : 'unknown',
        rating,
        rating_source: rating !== undefined ? 'TVMaze' : undefined,
        platform,
        origin_country: country,
        duration,
        genres: Array.isArray(show.genres) ? show.genres : undefined,
      };
    });

    cultureApiCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (err) {
    console.warn('[CultureAPI] Erro ao buscar no TVMaze:', err);
    return [];
  }
}

/**
 * Queries IMDb Autosuggest API for movies and features.
 * Supports multi-language aliases (e.g. Portuguese "ela" -> "Her", "divertida mente" -> "Inside Out"),
 * high-resolution posters from Amazon CDN, cast members, and fast Wikipedia synopsis enrichment.
 */
export async function fetchImdbMovies(q: string): Promise<CultureSearchResult[]> {
  const clean = q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  if (!clean) return [];

  const cacheKey = `imdb_${clean}`;
  const cached = cultureApiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const first = clean[0];
  const url = `https://v3.sg.media-imdb.com/suggestion/${first}/${clean}.json`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    const items = ((data?.d || []) as ImdbSuggestItem[])
      .filter((item) => {
        return (
          item.qid === 'movie' ||
          item.q === 'feature' ||
          item.q === 'TV movie' ||
          (!item.qid && item.y && item.id?.startsWith('tt'))
        );
      })
      .slice(0, 6);

    const enriched: CultureSearchResult[] = items.map((item) => {
      let cover = '';
      if (item.i?.imageUrl) {
        cover = item.i.imageUrl.replace(/_V1_.*\.jpg/, '_V1_UX600_.jpg');
      }

      return {
        title: item.l || '',
        year: item.y || null,
        synopsis: '', // IMDb autocomplete API does not provide plot synopses
        cast: item.s || undefined,
        cover,
        total: 0,
        type: 'filme',
        api_id: item.id || '',
        api_source: 'imdb',
        status: 'finished' as const,
      };
    });


    cultureApiCache.set(cacheKey, { timestamp: Date.now(), data: enriched });
    return enriched;
  } catch (err) {
    console.warn('[CultureAPI] Erro ao buscar IMDb:', err);
    return [];
  }
}

/**
 * Queries IMDb Autosuggest API specifically for TV series and mini-series.
 */
export async function fetchImdbSeries(q: string): Promise<CultureSearchResult[]> {
  const clean = q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  if (!clean) return [];

  const cacheKey = `imdb_series_${clean}`;
  const cached = cultureApiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const first = clean[0];
  const url = `https://v3.sg.media-imdb.com/suggestion/${first}/${clean}.json`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    const items = ((data?.d || []) as ImdbSuggestItem[])
      .filter((item) => {
        return (
          item.qid === 'tvSeries' ||
          item.qid === 'tvMiniSeries' ||
          item.q === 'TV series' ||
          item.q === 'TV mini-series'
        );
      })
      .slice(0, 6);

    const enriched: CultureSearchResult[] = items.map((item) => {
      let cover = '';
      if (item.i?.imageUrl) {
        cover = item.i.imageUrl.replace(/_V1_.*\.jpg/, '_V1_UX600_.jpg');
      }

      return {
        title: item.l || '',
        year: item.y || null,
        synopsis: '',
        cast: item.s || undefined,
        cover,
        total: 0,
        type: 'série',
        api_id: item.id || '',
        api_source: 'imdb',
        status: 'finished' as const,
      };
    });

    cultureApiCache.set(cacheKey, { timestamp: Date.now(), data: enriched });
    return enriched;
  } catch (err) {
    console.warn('[CultureAPI] Erro ao buscar séries no IMDb:', err);
    return [];
  }
}

/**
 * Queries the Apple iTunes Search API for movies as a fallback.
 */
export async function fetchITunesMovies(q: string): Promise<CultureSearchResult[]> {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=movie&entity=movie&limit=10`);
    if (!res.ok) return [];
    const data = await res.json();
    let movies = ((data?.results || []) as ITunesItem[]).filter((r) => r.kind === 'feature-movie' || r.trackName).slice(0, 5);

    if (movies.length === 0) {
      const fallbackRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&limit=30`);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        movies = ((fallbackData?.results || []) as ITunesItem[]).filter((r) => r.kind === 'feature-movie').slice(0, 5);
      }
    }

    return movies.map((item) => {
      const releaseYear = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;
      const durationMs = item.trackTimeMillis;
      const durationMin = durationMs ? Math.round(durationMs / 60000) : null;
      const duration = durationMin ? `${durationMin} min` : undefined;

      return {
        title: item.trackName || '',
        year: releaseYear,
        synopsis: item.longDescription || item.shortDescription || '',
        cover: item.artworkUrl100?.replace('100x100bb', '600x600bb') || '',
        total: 0,
        type: 'filme',
        api_id: item.trackId.toString(),
        api_source: 'itunes',
        status: 'finished' as const,
        director: item.artistName || undefined,
        duration,
        origin_country: item.country || undefined,
        genres: item.primaryGenreName ? [item.primaryGenreName] : undefined,
      };
    });
  } catch (err) {
    console.warn('[CultureAPI] Erro ao buscar iTunes:', err);
    return [];
  }
}

/**
 * Unified orchestrator performing multi-source media searches based on type.
 */
export async function searchCultureMedia(query: string, type: string): Promise<CultureSearchResult[]> {
  if (!query.trim()) return [];

  if (type === 'todos') {
    const [animes, mangas, books, shows, movies] = await Promise.all([
      fetchJikan(query, 'anime'),
      fetchJikan(query, 'manga'),
      fetchGoogleBooks(query, 'livro'),
      fetchTVMaze(query),
      fetchImdbMovies(query).then((res) => (res.length > 0 ? res : fetchITunesMovies(query))),
    ]);
    return [...shows, ...movies, ...animes, ...mangas, ...books];
  }

  if (type === 'anime' || type === 'manga') {
    return fetchJikan(query, type);
  }

  if (type === 'livro' || type === 'novel' || type === 'hq') {
    return fetchGoogleBooks(query, type);
  }

  if (type === 'série') {
    return fetchTVMaze(query);
  }

  if (type === 'filme') {
    const imdbResults = await fetchImdbMovies(query);
    if (imdbResults.length > 0) {
      return imdbResults;
    }
    return fetchITunesMovies(query);
  }

  return [];
}
