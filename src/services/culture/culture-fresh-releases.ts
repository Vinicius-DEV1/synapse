export interface FreshReleaseAnchor {
  title: string;
  type: 'anime' | 'série' | 'filme';
  releaseNote?: string;
  isUpcoming?: boolean;
  expectedDate?: string;
}
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
    title: 'Stranger Things (Temporada 5)',
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
 * to give the AI up-to-the-minute release awareness.
 */
export async function fetchCurrentFreshReleases(): Promise<FreshReleaseAnchor[]> {
  const anchors: FreshReleaseAnchor[] = [];

  // 1. Current anime season (now)
  const animeNowPromise = (async () => {
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
      }
    } catch {
      // Quiet fallback for transient rate limits or 504 timeouts
    }
  })();

  // 2. Upcoming anime seasons (future premieres)
  const animeUpcomingPromise = (async () => {
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
      }
    } catch {
      // Quiet fallback for Jikan 504 / gateway timeouts
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

  return anchors;
}
