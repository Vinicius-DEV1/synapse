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
}

/**
 * Queries Jikan API (MyAnimeList) for anime or manga
 */
export async function fetchJikan(q: string, t: 'anime' | 'manga'): Promise<CultureSearchResult[]> {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/${t}?q=${encodeURIComponent(q)}&limit=3`);
    const data = await res.json();
    return (data?.data || []).map((item: any) => ({
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
  } catch (err) {
    console.warn('[CultureAPI] Erro ao buscar Jikan:', err);
    return [];
  }
}

/**
 * Queries Google Books API
 */
export async function fetchGoogleBooks(q: string, targetType = 'livro'): Promise<CultureSearchResult[]> {
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=3`);
    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      title: item.volumeInfo.title,
      synopsis: item.volumeInfo.description || '',
      cover: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      total: item.volumeInfo.pageCount || 0,
      type: targetType,
      api_id: item.id,
      api_source: 'books',
      status: 'finished' as const
    }));
  } catch (err) {
    console.warn('[CultureAPI] Erro ao buscar Google Books:', err);
    return [];
  }
}

/**
 * Queries TVMaze API (TV Series)
 */
export async function fetchTVMaze(q: string): Promise<CultureSearchResult[]> {
  try {
    const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    return (data || []).slice(0, 3).map((item: any) => ({
      title: item.show.name,
      synopsis: (item.show.summary || '').replace(/<[^>]+>/g, ''),
      cover: item.show.image?.medium || '',
      total: 0,
      type: 'série',
      api_id: item.show.id.toString(),
      api_source: 'tvmaze',
      status: item.show.status === 'Running' ? 'releasing' : item.show.status === 'Ended' ? 'finished' : 'unknown'
    }));
  } catch (err) {
    console.warn('[CultureAPI] Erro ao buscar TVMaze:', err);
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
  const first = clean[0];
  const url = `https://v3.sg.media-imdb.com/suggestion/${first}/${clean}.json`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
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

    const enriched = await Promise.all(
      items.map(async (item: any) => {
        let synopsis = item.s ? `Estrelando: ${item.s}` : '';

        // Fast attempt to enrich with Portuguese Wikipedia summary
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 1200);
          const wRes = await fetch(
            `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.l)}`,
            {
              headers: { 'User-Agent': 'CadernoApp/1.0' },
              signal: controller.signal,
            }
          );
          clearTimeout(timeout);
          if (wRes.ok) {
            const wData = await wRes.json();
            if (wData.extract && wData.type === 'standard' && !wData.description?.includes('desambiguação')) {
              synopsis = wData.extract;
            }
          }
        } catch {}

        let cover = '';
        if (item.i?.imageUrl) {
          cover = item.i.imageUrl.replace(/_V1_.*\.jpg/, '_V1_UX600_.jpg');
        }

        return {
          title: item.l,
          year: item.y || null,
          synopsis,
          cover,
          total: 0,
          type: 'filme',
          api_id: item.id,
          api_source: 'imdb',
          status: 'finished' as const,
        };
      })
    );

    return enriched;
  } catch (err) {
    console.warn('[CultureAPI] Erro ao buscar IMDb:', err);
    return [];
  }
}

/**
 * Queries the Apple iTunes Search API for movies as a fallback.
 */
export async function fetchITunesMovies(q: string): Promise<CultureSearchResult[]> {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=movie&entity=movie&limit=10`);
    const data = await res.json();
    let movies = (data?.results || []).filter((r: any) => r.kind === 'feature-movie' || r.trackName).slice(0, 5);

    if (movies.length === 0) {
      const fallbackRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&limit=30`);
      const fallbackData = await fallbackRes.json();
      movies = (fallbackData?.results || []).filter((r: any) => r.kind === 'feature-movie').slice(0, 5);
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
