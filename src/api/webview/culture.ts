import { sqliteGetAll, sqliteQuery } from './bridgeClient';
import type { CultureApi } from '../types';
import type { CultureItem, CultureEpisode } from '../../types/culture';

export const webviewCultureApi: CultureApi = {
  async getItems(): Promise<CultureItem[]> {
    return await sqliteGetAll<CultureItem>(
      `SELECT * FROM culture_items WHERE deleted_at IS NULL ORDER BY created_at DESC`
    );
  },

  async createItem(item: Partial<CultureItem>): Promise<CultureItem> {
    const id = item.id || `culture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const newItem: CultureItem = {
      id,
      title: item.title || '',
      type: item.type || 'anime',
      synopsis: item.synopsis || '',
      cover_image: item.cover_image || '',
      status: item.status || 'backlog',
      progress: item.progress || 0,
      total_progress: item.total_progress || 0,
      is_goal: item.is_goal || false,
      goal_note: item.goal_note || '',
      access_link: item.access_link || '',
      api_id: item.api_id || undefined,
      api_source: item.api_source || undefined,
      volumes: item.volumes ?? null,
      chapters: item.chapters ?? null,
      episodes_count: item.episodes_count ?? null,
      created_at: item.created_at || now,
      updated_at: item.updated_at || now,
    };

    await sqliteQuery(
      `INSERT INTO culture_items (id, title, type, synopsis, cover_image, status, progress, total_progress, is_goal, goal_note, access_link, api_id, api_source, volumes, chapters, episodes_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newItem.id,
        newItem.title,
        newItem.type,
        newItem.synopsis,
        newItem.cover_image,
        newItem.status,
        newItem.progress,
        newItem.total_progress,
        newItem.is_goal ? 1 : 0,
        newItem.goal_note,
        newItem.access_link,
        newItem.api_id || null,
        newItem.api_source || null,
        newItem.volumes,
        newItem.chapters,
        newItem.episodes_count,
        newItem.created_at,
        newItem.updated_at,
      ]
    );

    return newItem;
  },

  async updateItem(id: string, item: Partial<CultureItem>): Promise<{ success: boolean; id: string }> {
    const fields: string[] = [];
    const params: any[] = [];

    if (item.title !== undefined) { fields.push('title = ?'); params.push(item.title); }
    if (item.type !== undefined) { fields.push('type = ?'); params.push(item.type); }
    if (item.synopsis !== undefined) { fields.push('synopsis = ?'); params.push(item.synopsis); }
    if (item.cover_image !== undefined) { fields.push('cover_image = ?'); params.push(item.cover_image); }
    if (item.status !== undefined) { fields.push('status = ?'); params.push(item.status); }
    if (item.progress !== undefined) { fields.push('progress = ?'); params.push(item.progress); }
    if (item.total_progress !== undefined) { fields.push('total_progress = ?'); params.push(item.total_progress); }
    if (item.access_link !== undefined) { fields.push('access_link = ?'); params.push(item.access_link); }
    if (item.is_goal !== undefined) { fields.push('is_goal = ?'); params.push(item.is_goal ? 1 : 0); }
    if (item.goal_note !== undefined) { fields.push('goal_note = ?'); params.push(item.goal_note); }
    if (item.api_id !== undefined) { fields.push('api_id = ?'); params.push(item.api_id); }
    if (item.api_source !== undefined) { fields.push('api_source = ?'); params.push(item.api_source); }
    if (item.volumes !== undefined) { fields.push('volumes = ?'); params.push(item.volumes); }
    if (item.chapters !== undefined) { fields.push('chapters = ?'); params.push(item.chapters); }
    if (item.episodes_count !== undefined) { fields.push('episodes_count = ?'); params.push(item.episodes_count); }

    fields.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(id);
    await sqliteQuery(`UPDATE culture_items SET ${fields.join(', ')} WHERE id = ?`, params);
    return { success: true, id };
  },

  async updateProgress(id: string, progress: number): Promise<{ success: boolean; id: string }> {
    const now = new Date().toISOString();
    await sqliteQuery(
      `UPDATE culture_items SET progress = ?, updated_at = ? WHERE id = ?`,
      [progress, now, id]
    );
    return { success: true, id };
  },

  async deleteItem(id: string): Promise<{ success: boolean }> {
    const now = new Date().toISOString();
    await sqliteQuery(`UPDATE culture_items SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
    return { success: true };
  },

  async getEpisodes(itemId: string): Promise<CultureEpisode[]> {
    return await sqliteGetAll<CultureEpisode>(
      `SELECT * FROM culture_episodes WHERE item_id = ? ORDER BY episode_number ASC`,
      [itemId]
    );
  },

  async saveEpisodes(itemId: string, episodes: any[]): Promise<{ success: boolean; count: number }> {
    for (const ep of episodes) {
      const epId = ep.id || `ep_${itemId}_${ep.episode_number}`;
      await sqliteQuery(
        `INSERT OR REPLACE INTO culture_episodes (id, item_id, episode_number, title, synopsis, is_watched)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [epId, itemId, ep.episode_number, ep.title || '', ep.synopsis || '', ep.is_watched ? 1 : 0]
      );
    }
    return { success: true, count: episodes.length };
  },

  async toggleEpisodeWatched(episodeId: string, isWatched: boolean): Promise<{ success: boolean }> {
    const now = new Date().toISOString();
    await sqliteQuery(
      `UPDATE culture_episodes SET is_watched = ?, watched_at = ? WHERE id = ?`,
      [isWatched ? 1 : 0, isWatched ? now : null, episodeId]
    );
    return { success: true };
  },
};
