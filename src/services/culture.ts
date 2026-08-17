import type { CultureItem, CultureEpisode } from '../types';

declare module '../api/types' {
  interface CultureApi {
    getRecentReleases?: () => Promise<(CultureEpisode & { item_title: string, item_cover: string })[]>;
  }
}

export const CultureService = {
  async getItems(): Promise<CultureItem[]> {
    if (!window.api?.culture) return [];
    return await window.api.culture.getItems();
  },

  async createItem(item: Partial<CultureItem>): Promise<CultureItem> {
    if (!window.api?.culture) throw new Error('API não disponível');
    return await window.api.culture.createItem(item);
  },

  async updateItem(id: string, item: Partial<CultureItem>): Promise<{success: boolean, id: string}> {
    if (!window.api?.culture) throw new Error('API não disponível');
    return await window.api.culture.updateItem(id, item);
  },

  async updateProgress(id: string, progress: number): Promise<{success: boolean, id: string}> {
    if (!window.api?.culture) throw new Error('API não disponível');
    return await window.api.culture.updateProgress(id, progress);
  },

  async deleteItem(id: string): Promise<{success: boolean}> {
    if (!window.api?.culture) throw new Error('API não disponível');
    return await window.api.culture.deleteItem(id);
  },

  async getEpisodes(itemId: string): Promise<CultureEpisode[]> {
    if (!window.api?.culture) return [];
    return await window.api.culture.getEpisodes(itemId);
  },

  async saveEpisodes(itemId: string, episodes: any[]): Promise<{success: boolean, count: number}> {
    if (!window.api?.culture) throw new Error('API não disponível');
    return await window.api.culture.saveEpisodes(itemId, episodes);
  },

  async toggleEpisodeWatched(episodeId: string, isWatched: boolean): Promise<{success: boolean}> {
    if (!window.api?.culture) throw new Error('API não disponível');
    return await window.api.culture.toggleEpisodeWatched(episodeId, isWatched);
  },

  async getRecentReleases(): Promise<(CultureEpisode & { item_title: string, item_cover: string })[]> {
    if (!window.api?.culture?.getRecentReleases) return [];
    return await window.api.culture.getRecentReleases();
  },

  async syncOngoingItems(items: CultureItem[]): Promise<void> {
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const now = new Date().getTime();

    const ongoing = items.filter(i => i.status === 'releasing' && i.api_id && i.api_source);
    
    for (const item of ongoing) {
      const lastSync = item.last_sync_at ? new Date(item.last_sync_at).getTime() : 0;
      if (now - lastSync < ONE_DAY) continue; // Skip if synced recently

      try {
        console.log(`[CultureSync] Background syncing: ${item.title}`);
        if (item.api_source === 'tvmaze') {
          const res = await fetch(`https://api.tvmaze.com/shows/${item.api_id}/episodes`);
          if (!res.ok) continue;
          const data = await res.json();
          const epsToSave = data.map((ep: any, index: number) => ({
            id: `ep_${item.id}_${ep.id}`,
            episode_number: index + 1,
            title: `S${String(ep.season).padStart(2, '0')}E${String(ep.number).padStart(2, '0')} - ${ep.name}`,
            synopsis: (ep.summary || '').replace(/<[^>]+>/g, ''),
            is_watched: false,
            aired_at: ep.airstamp ? new Date(ep.airstamp).toISOString() : null
          }));
          await this.saveEpisodes(item.id, epsToSave);
          await window.api.culture.updateItem(item.id, { ...item, last_sync_at: new Date().toISOString() });
        } 
        else if (item.api_source === 'jikan') {
          // Apenas primeira página para sync leve
          const res = await fetch(`https://api.jikan.moe/v4/anime/${item.api_id}/episodes`);
          if (!res.ok) continue;
          const data = await res.json();
          const epList = data.data || [];
          if (epList.length > 0) {
            const epsToSave = epList.map((ep: any) => ({
              id: `ep_${item.id}_${ep.mal_id}`,
              episode_number: ep.mal_id,
              title: ep.title || `Episódio ${ep.mal_id}`,
              synopsis: ep.title_japanese ? `JP: ${ep.title_japanese}` : '',
              is_watched: false,
              aired_at: ep.aired ? new Date(ep.aired).toISOString() : null
            }));
            await this.saveEpisodes(item.id, epsToSave);
            await window.api.culture.updateItem(item.id, { ...item, last_sync_at: new Date().toISOString() });
          }
          await new Promise(r => setTimeout(r, 400)); // Respect Rate limit
        }
      } catch (err) {
        console.error(`[CultureSync] Error syncing ${item.title}:`, err);
      }
    }
  }
};
