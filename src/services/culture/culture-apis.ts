export interface CultureSearchResult {
  title: string;
  synopsis: string;
  cover: string;
  total: number;
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
 * Busca na API do iTunes (Filmes)
 */
export async function fetchITunesMovies(q: string): Promise<CultureSearchResult[]> {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&limit=15`);
    const data = await res.json();
    const movies = (data?.results || []).filter((r: any) => r.kind === 'feature-movie').slice(0, 3);
    return movies.map((item: any) => ({
      title: item.trackName,
      synopsis: item.longDescription || item.shortDescription || '',
      cover: item.artworkUrl100?.replace('100x100bb', '600x600bb') || '',
      total: 0,
      type: 'filme',
      api_id: item.trackId.toString(),
      api_source: 'itunes'
    }));
  } catch (err) {
    console.warn('[CultureAPI] Erro ao buscar iTunes:', err);
    return [];
  }
}

/**
 * Orquestrador unificado de busca inteligente por tipo de mídia
 */
export async function searchCultureMedia(query: string, type: string): Promise<CultureSearchResult[]> {
  if (!query.trim()) return [];

  if (type === 'todos') {
    const [animes, mangas, books, shows, movies] = await Promise.all([
      fetchJikan(query, 'anime'),
      fetchJikan(query, 'manga'),
      fetchGoogleBooks(query, 'livro'),
      fetchTVMaze(query),
      fetchITunesMovies(query)
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
    return fetchITunesMovies(query);
  }

  return [];
}
