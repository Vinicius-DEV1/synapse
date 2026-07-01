import type { CultureItem } from '../types';

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
  }
};
