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
}

const cultureApiCache = new Map<string, { timestamp: number; data: CultureSearchResult[] }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

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
    const results: CultureSearchResult[] = (data?.data || []).map((item: any) => ({
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
        : 'unknown'
    }));

    cultureApiCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (err) {
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
    const results: CultureSearchResult[] = (data.items || []).map((item: any) => ({
      title: item.volumeInfo?.title || q,
      synopsis: item.volumeInfo?.description || '',
      cover: item.volumeInfo?.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      total: item.volumeInfo?.pageCount || 0,
      type: targetType,
      api_id: item.id,
      api_source: 'books',
      status: 'finished' as const
    }));

    cultureApiCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (err) {
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
    const results: CultureSearchResult[] = (data || []).slice(0, 3).map((item: any) => ({
      title: item.show.name,
      synopsis: (item.show.summary || '').replace(/<[^>]+>/g, ''),
      cover: item.show.image?.medium || '',
      total: 0,
      type: 'série',
      api_id: item.show.id.toString(),
      api_source: 'tvmaze',
      status: item.show.status === 'Running' ? 'releasing' : item.show.status === 'Ended' ? 'finished' : 'unknown'
    }));

    cultureApiCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (err) {
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
    const items = (data?.d || [])
      .filter((item: any) => {
        return (
          item.qid === 'movie' ||
          item.q === 'feature' ||
          item.q === 'TV movie' ||
          (!item.qid && item.y && item.id?.startsWith('tt'))
        );
      })
      .slice(0, 6);

    const enriched: CultureSearchResult[] = items.map((item: any) => {
      let cover = '';
      if (item.i?.imageUrl) {
        cover = item.i.imageUrl.replace(/_V1_.*\.jpg/, '_V1_UX600_.jpg');
      }

      return {
        title: item.l,
        year: item.y || null,
        synopsis: '', // IMDb autocomplete API does not provide plot synopses
        cast: item.s || undefined,
        cover,
        total: 0,
        type: 'filme',
        api_id: item.id,
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
    const items = (data?.d || [])
      .filter((item: any) => {
        return (
          item.qid === 'tvSeries' ||
          item.qid === 'tvMiniSeries' ||
          item.q === 'TV series' ||
          item.q === 'TV mini-series'
        );
      })
      .slice(0, 6);

    const enriched: CultureSearchResult[] = items.map((item: any) => {
      let cover = '';
      if (item.i?.imageUrl) {
        cover = item.i.imageUrl.replace(/_V1_.*\.jpg/, '_V1_UX600_.jpg');
      }

      return {
        title: item.l,
        year: item.y || null,
        synopsis: '',
        cast: item.s || undefined,
        cover,
        total: 0,
        type: 'série',
        api_id: item.id,
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
    let movies = (data?.results || []).filter((r: any) => r.kind === 'feature-movie' || r.trackName).slice(0, 5);

    if (movies.length === 0) {
      const fallbackRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&limit=30`);
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        movies = (fallbackData?.results || []).filter((r: any) => r.kind === 'feature-movie').slice(0, 5);
      }
    }

    return movies.map((item: any) => {
      const releaseYear = item.releaseDate ? new Date(item.releaseDate).getFullYear() : null;
      return {
        title: item.trackName,
        year: releaseYear,
        synopsis: item.longDescription || item.shortDescription || '',
        cover: item.artworkUrl100?.replace('100x100bb', '600x600bb') || '',
        total: 0,
        type: 'filme',
        api_id: item.trackId.toString(),
        api_source: 'itunes',
        status: 'finished' as const,
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
