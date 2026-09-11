// Helper to parse ISO8601 duration
const parseISO8601Duration = (duration: string) => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  const h = parseInt(match[1]?.replace('H', '')) || 0;
  const m = parseInt(match[2]?.replace('M', '')) || 0;
  const s = parseInt(match[3]?.replace('S', '')) || 0;
  return h * 3600 + m * 60 + s;
};

// Helper to extract IDs
const extractVideoId = (url: string) => {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?]+)/);
  return match ? match[1] : null;
};
const extractPlaylistId = (url: string) => {
  const match = url.match(/[?&]list=([^&]+)/);
  return match ? match[1] : null;
};

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
  },
  getSummary: async (videoId: string) => {
    try {
      const all = (await db.getAllFromIndex('youtube_summaries', 'video_id', videoId)) || [];
      return all[0] || null;
    } catch {
      return null;
    }
  },
  saveSummary: async (videoId: string, title?: string, channel?: string, summary?: string, rawTranscript?: string) => {
    try {
      const all = (await db.getAllFromIndex('youtube_summaries', 'video_id', videoId)) || [];
      const existing = all[0];
      if (existing) {
        existing.title = title || existing.title;
        existing.channel_name = channel || existing.channel_name;
        existing.summary = summary || existing.summary;
        existing.raw_transcript = rawTranscript || existing.raw_transcript;
        existing.updated_at = new Date().toISOString();
        await db.put('youtube_summaries', existing);
      } else {
        await db.put('youtube_summaries', {
          id: generateId(),
          video_id: videoId,
          title: title || '',
          channel_name: channel || '',
          summary: summary || '',
          raw_transcript: rawTranscript || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      return true;
    } catch {
      return false;
    }
  },
  fetchTranscript: async (_url: string) => {
    throw new Error('A extração de legendas do YouTube é um recurso nativo exclusivo da versão Desktop.');
  },
  fetchPlaylistInfo: async (url: string) => {
    // In Vite, import.meta.env might not be fully available in this context if it's outside components,
    // but assuming it is injected globally by Vite:
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) throw new Error('API Key não encontrada');

    const playlistId = extractPlaylistId(url);
    const videoId = extractVideoId(url);

    if (playlistId) {
      // Fetch playlist details
      const listRes = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`);
      const listData = await listRes.json();
      if (!listRes.ok) {
        throw new Error(listData.error?.message || 'Falha ao buscar detalhes da playlist (403/404). Verifique as restrições da sua API Key.');
      }
      
      const listTitle = listData.items?.[0]?.snippet?.title || 'Playlist';
      const listUploader = listData.items?.[0]?.snippet?.channelTitle || '';

      // Fetch items
      const itemsRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}`);
      const itemsData = await itemsRes.json();
      if (!itemsRes.ok) {
        throw new Error(itemsData.error?.message || 'Falha ao buscar vídeos da playlist.');
      }
      
      const entries: {
        id: string;
        title: string;
        uploader: string;
        duration: number | null;
        upload_date?: string | null;
        timestamp?: number | null;
        availability?: string | null;
      }[] = [];
      for (const item of itemsData.items || []) {
        if (item.snippet.title === 'Private video' || item.snippet.title === 'Deleted video') continue;
        const pubAt = item.snippet.publishedAt;
        entries.push({
          id: item.contentDetails.videoId,
          title: item.snippet.title,
          uploader: item.snippet.videoOwnerChannelTitle || '',
          duration: null,
          upload_date: pubAt ? pubAt.split('T')[0].replace(/-/g, '') : null,
          timestamp: pubAt ? Math.floor(new Date(pubAt).getTime() / 1000) : null,
          availability: null,
        });
      }

      // Fetch durations and status in batch
      if (entries.length > 0) {
        const videoIds = entries.map(e => e.id).join(',');
        const vidRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status&id=${videoIds}&key=${apiKey}`);
        if (vidRes.ok) {
          const vidData = await vidRes.json();
          for (const v of vidData.items || []) {
            const entry = entries.find(e => e.id === v.id);
            if (entry) {
              if (v.contentDetails?.duration) {
                entry.duration = parseISO8601Duration(v.contentDetails.duration);
              }
              if (v.status?.privacyStatus === 'private') {
                entry.availability = 'subscriber_only';
              }
            }
          }
        }
      }

      return {
        _type: 'playlist',
        title: listTitle,
        uploader: listUploader,
        playlist_count: itemsData.pageInfo?.totalResults || entries.length,
        upload_date: listData.items?.[0]?.snippet?.publishedAt ? listData.items[0].snippet.publishedAt.split('T')[0].replace(/-/g, '') : null,
        entries
      };

    } else if (videoId) {
      // Fetch single video
      const vidRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`);
      const vidData = await vidRes.json();
      if (!vidRes.ok) {
        throw new Error(vidData.error?.message || 'Falha ao buscar vídeo. Verifique sua API Key.');
      }
      const item = vidData.items?.[0];
      if (!item) throw new Error('Vídeo não encontrado');

      return {
        _type: 'video',
        title: item.snippet.title,
        uploader: item.snippet.channelTitle,
        duration: parseISO8601Duration(item.contentDetails.duration),
        upload_date: item.snippet.publishedAt ? item.snippet.publishedAt.split('T')[0].replace(/-/g, '') : null
      };
    }

    throw new Error('URL inválida');
  },
  getStream: async (_url: string) => {
    throw new Error('Streaming nativo via yt-dlp disponível apenas na versão Desktop (Tauri).');
  }
});
