import { invoke } from '@tauri-apps/api/core';

export const tauriCultureApi = {
  getItems: async () => await invoke('culture_get_items'),
  createItem: async (i: any) => await invoke('culture_create_item', { item: i }),
  updateItem: async (id: string, i: any) => await invoke('culture_update_item', { id, item: i }),
  deleteItem: async (id: string) => await invoke('culture_delete_item', { id }),
  updateProgress: async (id: string, progress: number) => await invoke('culture_update_progress', { id, progress }),
  getEpisodes: async (itemId: string) => await invoke('culture_get_episodes', { itemId }),
  saveEpisodes: async (itemId: string, episodes: any[]) => await invoke('culture_save_episodes', { itemId, episodes }),
  toggleEpisodeWatched: async (episodeId: string, isWatched: boolean) => await invoke('culture_toggle_episode_watched', { episodeId, isWatched }),
  getRecentReleases: async () => [] // Placeholder for external API fetch in future
};
