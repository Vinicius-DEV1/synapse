import type { CultureItem, CultureEpisode } from '../types';
import { CultureService } from './culture';

export interface EpisodeSyncProgressCallback {
  onProgress?: (count: number) => void;
  shouldContinue?: () => boolean;
}

export async function syncTvMazeEpisodes(
  item: CultureItem,
  callbacks?: EpisodeSyncProgressCallback
): Promise<CultureEpisode[]> {
  const res = await fetch(`https://api.tvmaze.com/shows/${item.api_id}/episodes`);
  if (!res.ok) throw new Error('Falha ao buscar dados do TVMaze');
  const data = await res.json();

  const epsToSave = data.map((ep: any) => ({
    id: `ep_${item.id}_${ep.id}`,
    episode_number: ep.id,
    season_number: ep.season,
    episode_in_season: ep.number,
    title: `S${String(ep.season).padStart(2, '0')}E${String(ep.number).padStart(2, '0')} - ${ep.name}`,
    synopsis: (ep.summary || '').replace(/<[^>]+>/g, ''),
    is_watched: false,
    aired_at: ep.airstamp ? new Date(ep.airstamp).toISOString() : null,
  }));

  await CultureService.saveEpisodes(item.id, epsToSave);
  await window.api.culture.updateItem(item.id, { ...item, last_sync_at: new Date().toISOString() });
  callbacks?.onProgress?.(epsToSave.length);
  return await CultureService.getEpisodes(item.id);
}

export async function syncJikanEpisodes(
  item: CultureItem,
  callbacks?: EpisodeSyncProgressCallback
): Promise<CultureEpisode[]> {
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage && (callbacks?.shouldContinue ? callbacks.shouldContinue() : true)) {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${item.api_id}/episodes?page=${page}`);
    if (!res.ok) {
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      throw new Error('Falha ao buscar dados do Jikan');
    }

    const data = await res.json();
    const epList = data.data || [];
    if (epList.length === 0) break;

    const epsToSave = epList.map((ep: any) => ({
      id: `ep_${item.id}_${ep.mal_id}`,
      episode_number: ep.mal_id,
      title: ep.title || `Episódio ${ep.mal_id}`,
      synopsis: ep.title_japanese ? `JP: ${ep.title_japanese}` : '',
      is_watched: false,
      aired_at: ep.aired ? new Date(ep.aired).toISOString() : null,
    }));

    await CultureService.saveEpisodes(item.id, epsToSave);
    if (!data.pagination?.has_next_page) {
      await window.api.culture.updateItem(item.id, { ...item, last_sync_at: new Date().toISOString() });
    }

    callbacks?.onProgress?.(epList.length);
    hasNextPage = data.pagination?.has_next_page || false;
    page++;
    await new Promise(r => setTimeout(r, 400));
  }

  return await CultureService.getEpisodes(item.id);
}
