export const webYoutubeApi = (db: any, generateId: () => string) => ({
  getWatched: async (videoIds: string[]) => {
    if (!videoIds || videoIds.length === 0) return [];
    const watched: string[] = [];
    for (const vid of videoIds) {
      const all = await db.getAllFromIndex('youtube_watched', 'video_id', vid) || [];
      const item = all.find((x: any) => !x.deleted_at);
      if (item) watched.push(vid);
    }
    return watched;
  },
  setWatched: async (videoId: string, isWatched: boolean, title?: string, channel?: string) => {
    const all = await db.getAllFromIndex('youtube_watched', 'video_id', videoId) || [];
    let existing = all[0];
    
    if (isWatched) {
      if (existing) {
        existing.deleted_at = null;
        existing.updated_at = new Date().toISOString();
        if (title) existing.title = title;
        if (channel) existing.channel_name = channel;
        await db.put('youtube_watched', existing);
      } else {
        await db.put('youtube_watched', {
          id: generateId(),
          video_id: videoId,
          title: title || '',
          channel_name: channel || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        });
      }
    } else {
      if (existing) {
        existing.deleted_at = new Date().toISOString();
        existing.updated_at = new Date().toISOString();
        await db.put('youtube_watched', existing);
      }
    }
    return true;
  }
});
