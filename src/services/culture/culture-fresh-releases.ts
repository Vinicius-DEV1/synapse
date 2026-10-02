import { isJikanAvailable, reportJikanFailure } from './culture-apis';

export interface FreshReleaseAnchor {
  title: string;
  type: 'anime' | 'série' | 'filme';
  releaseNote?: string;
  isUpcoming?: boolean;
  expectedDate?: string;
}

const FRESH_ANCHORS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache
let cachedAnchors: { timestamp: number; data: FreshReleaseAnchor[] } | null = null;

async function fetchWithTimeout(url: string, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

const FALLBACK_UPCOMING_ANCHORS: FreshReleaseAnchor[] = [
  {
    title: 'Dune: Messiah',
    type: 'filme',
    releaseNote: 'Estreia confirmada nos cinemas (Denis Villeneuve)',
    isUpcoming: true,
    expectedDate: '2026',
  },
  {
    title: 'Stranger Things',
    type: 'série',
    releaseNote: 'Temporada final confirmada (Netflix)',
    isUpcoming: true,
    expectedDate: '2025',
  },
  {
    title: 'Chainsaw Man: Reze Arc',
    type: 'anime',
    releaseNote: 'Filme para cinemas confirmado (MAPPA)',
    isUpcoming: true,
    expectedDate: 'Próxima Temporada',
  },
  {
    title: 'The Batman: Part II',
    type: 'filme',
    releaseNote: 'Sequência nos cinemas (Matt Reeves)',
    isUpcoming: true,
    expectedDate: '2026',
  },
  {
    title: 'O Cavaleiro dos Sete Reinos',
    type: 'série',
    releaseNote: 'Spin-off do universo Game of Thrones (HBO Max)',
    isUpcoming: true,
    expectedDate: '2025',
  },
];

/**
 * Fetches real-time fresh broadcast, current season, and upcoming premiering media
 * to give the AI up-to-the-minute release awareness with SWR caching and circuit breaking.
 */
export async function fetchCurrentFreshReleases(): Promise<FreshReleaseAnchor[]> {
  if (cachedAnchors && Date.now() - cachedAnchors.timestamp < FRESH_ANCHORS_CACHE_TTL) {
    return cachedAnchors.data;
  }

  const anchors: FreshReleaseAnchor[] = [];

  // 1. Current anime season (now) - guarded by circuit breaker
  const animeNowPromise = (async () => {
    if (!isJikanAvailable()) return;
    try {
      const res = await fetchWithTimeout('https://api.jikan.moe/v4/seasons/now?limit=8');
      if (res.ok) {
        const data = await res.json();
        for (const item of (data?.data || []).slice(0, 8)) {
          if (item.title) {
            anchors.push({
              title: item.title,
              type: 'anime',
              releaseNote: item.status || 'Em exibição nesta temporada',
              isUpcoming: false,
            });
          }
        }
      } else if (res.status === 504 || res.status === 429 || res.status >= 500) {
        reportJikanFailure(5 * 60 * 1000); // 5 min circuit breaker
      }
    } catch {
      reportJikanFailure(5 * 60 * 1000);
    }
  })();

  // 2. Upcoming anime seasons (future premieres) - guarded by circuit breaker
  const animeUpcomingPromise = (async () => {
    if (!isJikanAvailable()) return;
    try {
      const res = await fetchWithTimeout('https://api.jikan.moe/v4/seasons/upcoming?limit=8');
      if (res.ok) {
        const data = await res.json();
        for (const item of (data?.data || []).slice(0, 8)) {
          if (item.title) {
            const season = item.season ? `${item.season} ` : '';
            const year = item.year ? `${item.year}` : '';
            const dateStr = season || year ? `${season}${year}`.trim() : 'Próxima Temporada';
            anchors.push({
              title: item.title,
              type: 'anime',
              releaseNote: `Estreia futura confirmada: ${dateStr}`,
              isUpcoming: true,
              expectedDate: dateStr,
            });
          }
        }
      } else if (res.status === 504 || res.status === 429 || res.status >= 500) {
        reportJikanFailure(5 * 60 * 1000); // 5 min circuit breaker
      }
    } catch {
      reportJikanFailure(5 * 60 * 1000);
    }
  })();

  // 3. TV broadcast episodes (today)
  const tvPromise = (async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetchWithTimeout(`https://api.tvmaze.com/schedule?country=US&date=${today}`);
      if (res.ok) {
        const data = await res.json();
        const seen = new Set<string>();
        for (const entry of (data || []).slice(0, 15)) {
          const showName = entry?.show?.name;
          if (showName && !seen.has(showName)) {
            seen.add(showName);
            anchors.push({
              title: showName,
              type: 'série',
              releaseNote: `Episódio novo exibido em ${today}`,
              isUpcoming: false,
            });
            if (seen.size >= 6) break;
          }
        }
      }
    } catch {
      // Quiet fallback for network hiccups
    }
  })();

  await Promise.allSettled([animeNowPromise, animeUpcomingPromise, tvPromise]);

  // Ensure high quality upcoming radar even if external public endpoints are experiencing downtime
  if (!anchors.some(a => a.isUpcoming)) {
    anchors.push(...FALLBACK_UPCOMING_ANCHORS);
  }

  cachedAnchors = {
    timestamp: Date.now(),
    data: anchors,
  };

  return anchors;
}
