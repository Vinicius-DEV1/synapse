import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web-schema';
import type { CultureItem, CultureEpisode } from '../../types';

export const webCultureApi = (db: IDBPDatabase<CadernoDBSchema>, generateId: () => string) => ({
  getItems: async (): Promise<CultureItem[]> => {
    const all = (await db.getAll('culture_items')) || [];
    return all
      .filter((i): i is CultureItem => !i.deleted_at)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  createItem: async (item: Partial<CultureItem>): Promise<CultureItem> => {
    const newItem: CultureItem = {
      title: '',
      type: 'filme',
      ...item,
      id: generateId(),
      progress: item.progress || 0,
      total_progress: item.total_progress || 0,
      is_goal: item.is_goal ? 1 : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    await db.put('culture_items', newItem);
    return newItem;
  },

  updateItem: async (id: string, item: Partial<CultureItem>): Promise<{ success: boolean; id: string }> => {
    const existing = await db.get('culture_items', id);
    if (!existing) return { success: false, id };
    const updated: CultureItem = {
      ...existing,
      ...item,
      is_goal: item.is_goal !== undefined ? (item.is_goal ? 1 : 0) : existing.is_goal,
      updated_at: new Date().toISOString(),
    };
    await db.put('culture_items', updated);
    return { success: true, id };
  },

  updateProgress: async (id: string, progress: number): Promise<{ success: boolean; id: string }> => {
    const existing = await db.get('culture_items', id);
    if (!existing) return { success: false, id };
    existing.progress = progress;
    existing.updated_at = new Date().toISOString();
    await db.put('culture_items', existing);
    return { success: true, id };
  },

  deleteItem: async (id: string): Promise<{ success: boolean }> => {
    const existing = await db.get('culture_items', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('culture_items', existing);
    }
    return { success: true };
  },

  getEpisodes: async (itemId: string): Promise<CultureEpisode[]> => {
    const all = (await db.getAllFromIndex('culture_episodes', 'item_id', itemId)) || [];
    return all
      .filter((e): e is CultureEpisode => !e.deleted_at)
      .sort((a, b) => a.episode_number - b.episode_number);
  },

  saveEpisodes: async (itemId: string, episodes: Partial<CultureEpisode>[]): Promise<{ success: boolean; count: number }> => {
    const existing = (await db.getAllFromIndex('culture_episodes', 'item_id', itemId)) || [];
    const incomingIds = episodes.map((e) => e.id).filter((id): id is string => Boolean(id));

    for (const ep of existing) {
      if (!incomingIds.includes(ep.id) && !ep.deleted_at) {
        ep.deleted_at = new Date().toISOString();
        ep.updated_at = new Date().toISOString();
        await db.put('culture_episodes', ep);
      }
    }

    for (const ep of episodes) {
      const id = ep.id || generateId();
      const epToSave: CultureEpisode = {
        title: '',
        synopsis: '',
        episode_number: 1,
        ...ep,
        id,
        item_id: itemId,
        is_watched: ep.is_watched ? 1 : 0,
        created_at: ep.id ? (ep.created_at || new Date().toISOString()) : new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      await db.put('culture_episodes', epToSave);
    }
    return { success: true, count: episodes.length };
  },

  toggleEpisodeWatched: async (episodeId: string, isWatched: boolean): Promise<{ success: boolean }> => {
    const existing = await db.get('culture_episodes', episodeId);
    if (!existing) return { success: false };
    existing.is_watched = isWatched ? 1 : 0;
    existing.updated_at = new Date().toISOString();
    await db.put('culture_episodes', existing);
    return { success: true };
  },

  getRecentReleases: async (): Promise<unknown[]> => {
    return [];
  },
});
