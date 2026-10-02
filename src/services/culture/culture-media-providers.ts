import type { CultureSearchResult } from './culture-apis';

const providerCache = new Map<string, { timestamp: number; data: CultureSearchResult[] }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Executes a fetch with an automatic AbortController timeout to prevent hanging requests.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches book covers and metadata from Open Library.
 * Open Library provides high-resolution book covers with no strict daily quotas.
 */
export async function fetchOpenLibraryBooks(
  query: string,
  targetType = 'livro'
): Promise<CultureSearchResult[]> {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const cacheKey = `openlibrary_${targetType}_${clean}`;
  const cached = providerCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,publisher,ratings_average,ratings_count,number_of_pages_median,first_publish_year,cover_i,subject&limit=4`;
    const res = await fetchWithTimeout(url, {}, 4500);
    if (!res.ok) return [];

    const data = await res.json();
    const docs = Array.isArray(data.docs) ? data.docs : [];

    const results: CultureSearchResult[] = docs
      .filter((doc: any) => doc.cover_i)
      .slice(0, 3)
      .map((doc: any) => {
        const coverId = doc.cover_i;
        const cover = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
        const year = doc.first_publish_year || (doc.publish_year ? doc.publish_year[0] : null);
        const rating = typeof doc.ratings_average === 'number'
          ? Number(doc.ratings_average.toFixed(1))
          : undefined;
        const publisher = Array.isArray(doc.publisher) && doc.publisher.length > 0
          ? doc.publisher[0]
          : undefined;
        const authors = Array.isArray(doc.author_name) && doc.author_name.length > 0
          ? doc.author_name.join(', ')
          : undefined;
        const duration = doc.number_of_pages_median
          ? `${doc.number_of_pages_median} págs`
          : undefined;
        const genres = Array.isArray(doc.subject) ? doc.subject.slice(0, 3) : undefined;

        return {
          title: doc.title || query,
          synopsis: '',
          cover,
          total: doc.number_of_pages_median || 0,
          year,
          type: targetType,
          api_id: `ol_${doc.key || coverId}`,
          api_source: 'openlibrary',
          status: 'finished' as const,
          rating,
          rating_source: rating !== undefined ? 'OpenLibrary' : undefined,
          platform: publisher,
          director: authors,
          duration,
          genres,
        };
      });

    providerCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (err) {
    console.warn(`[OpenLibrary] Erro ao buscar livro "${query}":`, err);
    return [];
  }
}

/**
 * Fetches anime or manga metadata and high-resolution posters from AniList GraphQL API.
 * Free, public, highly reliable, and covers both Japanese and localized Western titles.
 */
export async function fetchAniListMedia(
  query: string,
  mediaType: 'MANGA' | 'ANIME'
): Promise<CultureSearchResult[]> {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const cacheKey = `anilist_${mediaType.toLowerCase()}_${clean}`;
  const cached = providerCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const gqlQuery = `
    query ($search: String, $type: MediaType) {
      Page(page: 1, perPage: 3) {
        media(search: $search, type: $type) {
          id
          title {
            userPreferred
            english
            romaji
          }
          coverImage {
            extraLarge
            large
          }
          description
          status
          episodes
          chapters
          volumes
          averageScore
          countryOfOrigin
          duration
          genres
          studios(isMain: true) {
            nodes {
              name
            }
          }
          startDate {
            year
          }
        }
      }
    }
  `;

  try {
    const res = await fetchWithTimeout(
      'https://graphql.anilist.co',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: gqlQuery,
          variables: { search: query, type: mediaType },
        }),
      },
      4500
    );

    if (!res.ok) return [];
    const data = await res.json();
    const mediaList = data?.data?.Page?.media;
    if (!Array.isArray(mediaList)) return [];

    const results: CultureSearchResult[] = mediaList.map((m: any) => {
      const cover = m.coverImage?.extraLarge || m.coverImage?.large || '';
      const rawSynopsis = m.description ? m.description.replace(/<[^>]+>/g, '').trim() : '';
      const rating = typeof m.averageScore === 'number'
        ? Number((m.averageScore / 10).toFixed(1))
        : undefined;
      const studio = m.studios?.nodes?.[0]?.name;
      const country = m.countryOfOrigin === 'JP'
        ? 'Japão'
        : m.countryOfOrigin === 'KR'
        ? 'Coreia do Sul'
        : m.countryOfOrigin === 'CN'
        ? 'China'
        : m.countryOfOrigin || undefined;
      const duration = m.duration ? `${m.duration} min/ep` : undefined;

      return {
        title: m.title?.userPreferred || m.title?.english || m.title?.romaji || query,
        synopsis: rawSynopsis,
        cover,
        total: mediaType === 'ANIME' ? (m.episodes || 0) : (m.chapters || m.volumes || 0),
        year: m.startDate?.year || null,
        episodes_count: m.episodes || null,
        chapters: m.chapters || null,
        volumes: m.volumes || null,
        type: mediaType === 'ANIME' ? 'anime' : 'manga',
        api_id: `al_${m.id}`,
        api_source: 'anilist',
        status: m.status === 'RELEASING' ? 'releasing' : 'finished',
        rating,
        rating_source: rating !== undefined ? 'AniList' : undefined,
        platform: studio,
        origin_country: country,
        duration,
        genres: Array.isArray(m.genres) ? m.genres : undefined,
      };
    });

    providerCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (err) {
    console.warn(`[AniList] Erro ao buscar ${mediaType} "${query}":`, err);
    return [];
  }
}

/**
 * Fetches manga metadata and posters from Kitsu API.
 */
export async function fetchKitsuManga(query: string): Promise<CultureSearchResult[]> {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const cacheKey = `kitsu_manga_${clean}`;
  const cached = providerCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(query)}&page[limit]=2`;
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          Accept: 'application/vnd.api+json',
        },
      },
      4500
    );

    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data.data) ? data.data : [];

    const results: CultureSearchResult[] = list.map((item: any) => {
      const attrs = item.attributes || {};
      const cover = attrs.posterImage?.large || attrs.posterImage?.medium || attrs.posterImage?.original || '';
      const year = attrs.startDate ? new Date(attrs.startDate).getFullYear() : null;
      const rawRating = attrs.averageRating ? parseFloat(attrs.averageRating) : NaN;
      const rating = !isNaN(rawRating) ? Number((rawRating / 10).toFixed(1)) : undefined;
      const serialization = attrs.serialization || undefined;

      return {
        title: attrs.canonicalTitle || query,
        synopsis: attrs.synopsis || '',
        cover,
        total: attrs.chapterCount || attrs.volumeCount || 0,
        year,
        chapters: attrs.chapterCount || null,
        volumes: attrs.volumeCount || null,
        type: 'manga',
        api_id: `kitsu_${item.id}`,
        api_source: 'kitsu',
        status: attrs.status === 'current' ? 'releasing' : 'finished',
        rating,
        rating_source: rating !== undefined ? 'Kitsu' : undefined,
        platform: serialization,
        origin_country: 'Japão',
      };
    });

    providerCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (err) {
    console.warn(`[Kitsu] Erro ao buscar manga "${query}":`, err);
    return [];
  }
}
