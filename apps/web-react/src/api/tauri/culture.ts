import { invoke } from '@tauri-apps/api/core';
import type { CultureItem, CultureEpisode } from '../../types';

export const tauriCultureApi = {
  getItems: async (): Promise<CultureItem[]> => await invoke<CultureItem[]>('culture_get_items'),
  createItem: async (item: Partial<CultureItem>): Promise<CultureItem> => await invoke<CultureItem>('culture_create_item', { item }),
  updateItem: async (id: string, item: Partial<CultureItem>): Promise<{ success: boolean; id: string }> => {
    const count = await invoke<number>('culture_update_item', { id, item });
    return { success: count > 0, id };
  },
  deleteItem: async (id: string): Promise<{ success: boolean }> => {
    const ok = await invoke<boolean>('culture_delete_item', { id });
    return { success: ok };
  },
  updateProgress: async (id: string, progress: number): Promise<{ success: boolean; id: string }> => {
    const ok = await invoke<boolean>('culture_update_progress', { id, progress });
    return { success: ok, id };
  },
  getEpisodes: async (itemId: string): Promise<CultureEpisode[]> => await invoke<CultureEpisode[]>('culture_get_episodes', { itemId }),
  saveEpisodes: async (itemId: string, episodes: Partial<CultureEpisode>[]): Promise<{ success: boolean; count: number }> => {
    const ok = await invoke<boolean>('culture_save_episodes', { itemId, episodes });
    return { success: ok, count: episodes.length };
  },
  toggleEpisodeWatched: async (episodeId: string, isWatched: boolean): Promise<{ success: boolean }> => {
    const ok = await invoke<boolean>('culture_toggle_episode_watched', { episodeId, isWatched });
    return { success: ok };
  },
  getRecentReleases: async (): Promise<(CultureEpisode & { item_title: string; item_cover: string })[]> => [] // Placeholder for external API fetch in future
};
