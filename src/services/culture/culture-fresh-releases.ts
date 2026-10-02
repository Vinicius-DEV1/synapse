export interface FreshReleaseAnchor {
  title: string;
  type: 'anime' | 'série' | 'filme';
  releaseNote?: string;
  isUpcoming?: boolean;
  expectedDate?: string;
}

/**
 * Fetches real-time fresh broadcast, current season, and upcoming premiering media
 * to give the AI up-to-the-minute release awareness.
 */
export async function fetchCurrentFreshReleases(): Promise<FreshReleaseAnchor[]> {
  const anchors: FreshReleaseAnchor[] = [];

  // 1. Current anime season (now)
  const animeNowPromise = (async () => {
    try {
      const res = await fetch('https://api.jikan.moe/v4/seasons/now?limit=8');
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
    } catch (err) {
      console.warn('[CultureFreshReleases] Erro ao buscar animes da temporada:', err);
    }
  })();

  // 2. Upcoming anime seasons (future premieres)
  const animeUpcomingPromise = (async () => {
    try {
      const res = await fetch('https://api.jikan.moe/v4/seasons/upcoming?limit=8');
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
    } catch (err) {
      console.warn('[CultureFreshReleases] Erro ao buscar animes futuros:', err);
    }
  })();

  // 3. TV broadcast episodes (today)
  const tvPromise = (async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`https://api.tvmaze.com/schedule?country=US&date=${today}`);
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
    } catch (err) {
      console.warn('[CultureFreshReleases] Erro ao buscar lançamentos TV:', err);
    }
  })();

  await Promise.allSettled([animeNowPromise, animeUpcomingPromise, tvPromise]);
  return anchors;
}
