export const webCultureApi = (db: any, generateId: () => string) => ({
  getItems: async () => {
    const all = await db.getAll('culture_items');
    return all.filter((i: any) => !i.deleted_at).sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },
  createItem: async (item: any) => {
    const newItem = {
      id: generateId(),
      ...item,
      progress: item.progress || 0,
      total_progress: item.total_progress || 0,
      is_goal: item.is_goal ? 1 : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };
    await db.put('culture_items', newItem);
    return newItem;
  },
  updateItem: async (id: string, item: any) => {
    const existing = await db.get('culture_items', id);
    if (!existing) return { success: false, id };
    const updated = {
      ...existing,
      ...item,
      is_goal: item.is_goal !== undefined ? (item.is_goal ? 1 : 0) : existing.is_goal,
      updated_at: new Date().toISOString()
    };
    await db.put('culture_items', updated);
    return { success: true, id };
  },
  updateProgress: async (id: string, progress: number) => {
    const existing = await db.get('culture_items', id);
    if (!existing) return { success: false };
    existing.progress = progress;
    existing.updated_at = new Date().toISOString();
    await db.put('culture_items', existing);
    return { success: true };
  },
  deleteItem: async (id: string) => {
    const existing = await db.get('culture_items', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('culture_items', existing);
    }
    return { success: true };
  },
  getEpisodes: async (itemId: string) => {
    const all = await db.getAllFromIndex('culture_episodes', 'item_id', itemId);
    return all.filter((e: any) => !e.deleted_at).sort((a: any, b: any) => a.episode_number - b.episode_number);
  },
  saveEpisodes: async (itemId: string, episodes: any[]) => {
    const existing = await db.getAllFromIndex('culture_episodes', 'item_id', itemId);
    const incomingIds = episodes.map(e => e.id).filter(id => id);
    for (const ep of existing) {
       if (!incomingIds.includes(ep.id) && !ep.deleted_at) {
          ep.deleted_at = new Date().toISOString();
          ep.updated_at = new Date().toISOString();
          await db.put('culture_episodes', ep);
       }
    }
    for (const ep of episodes) {
       const id = ep.id || generateId();
       const epToSave = {
          ...ep,
          id,
          item_id: itemId,
          is_watched: ep.is_watched ? 1 : 0,
          created_at: ep.id ? (ep.created_at || new Date().toISOString()) : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
       };
       await db.put('culture_episodes', epToSave);
    }
    return { success: true };
  },
  toggleEpisodeWatched: async (episodeId: string, isWatched: boolean) => {
    const existing = await db.get('culture_episodes', episodeId);
    if (!existing) return { success: false };
    existing.is_watched = isWatched ? 1 : 0;
    existing.updated_at = new Date().toISOString();
    await db.put('culture_episodes', existing);
    return { success: true };
  },
  getRecentReleases: async () => {
    return [];
  }
});
