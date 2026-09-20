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

  async saveEpisodes(itemId: string, episodes: Partial<CultureEpisode>[]): Promise<{success: boolean, count: number}> {
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
    const { syncTvMazeEpisodes, syncJikanEpisodes } = await import('./culture/culture-episodes-sync');
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const now = new Date().getTime();

    const ongoing = items.filter(i => i.status === 'releasing' && i.api_id && i.api_source);
    
    for (const item of ongoing) {
      const lastSync = item.last_sync_at ? new Date(item.last_sync_at).getTime() : 0;
      if (now - lastSync < ONE_DAY) continue; // Skip if synced recently

      try {
        console.log(`[CultureSync] Background syncing: ${item.title}`);
        if (item.api_source === 'tvmaze') {
          await syncTvMazeEpisodes(item);
        } else if (item.api_source === 'jikan') {
          await syncJikanEpisodes(item);
        }
      } catch (err) {
        console.error(`[CultureSync] Error syncing ${item.title}:`, err);
      }
    }
  }
};
