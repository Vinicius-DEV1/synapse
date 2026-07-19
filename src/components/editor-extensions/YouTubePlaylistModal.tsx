import { useState, useEffect } from 'react';
import { X, PlayCircle, Loader2, CheckCircle2, Circle, Clock } from 'lucide-react';

interface YouTubePlaylistModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

const formatDuration = (seconds: number) => {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function YouTubePlaylistModal({ url, title, onClose }: YouTubePlaylistModalProps) {
  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState<any>(null);
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPlaylist();
  }, [url]);

  const parseISO8601Duration = (duration: string) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    const h = parseInt(match[1]?.replace('H', '')) || 0;
    const m = parseInt(match[2]?.replace('M', '')) || 0;
    const s = parseInt(match[3]?.replace('S', '')) || 0;
    return h * 3600 + m * 60 + s;
  };

  const fetchWebPlaylist = async (playlistId: string) => {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) throw new Error('API Key não encontrada');
    
    let pageToken = '';
    const entries = [];
    
    // Fetch up to 50 items (first page)
    const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${apiKey}`);
    if (!res.ok) throw new Error('Falha ao buscar playlist');
    
    const data = await res.json();
    for (const item of data.items) {
      if (item.snippet.title === 'Private video' || item.snippet.title === 'Deleted video') continue;
      entries.push({
        id: item.contentDetails.videoId,
        title: item.snippet.title,
        uploader: item.snippet.videoOwnerChannelTitle || '',
        duration: null, 
      });
    }
    
    // Fetch durations
    if (entries.length > 0) {
      const videoIds = entries.map(e => e.id);
      const batchIds = videoIds.join(',');
      const vidRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batchIds}&key=${apiKey}`);
      if (vidRes.ok) {
        const vidData = await vidRes.json();
        for (const v of vidData.items) {
          const entry = entries.find(e => e.id === v.id);
          if (entry) {
            entry.duration = parseISO8601Duration(v.contentDetails.duration);
          }
        }
      }
    }
    
    return { entries };
  };

  const loadPlaylist = async () => {
    try {
      setLoading(true);
      if (window.api && window.api.youtube) {
        const data = await window.api.youtube.fetchPlaylistInfo(url);
        if (data && data.entries) {
          setPlaylist(data);
          
          // Fetch watched status
          const videoIds = data.entries.map((e: any) => e.id);
          const watchedIds = await window.api.youtube.getWatched(videoIds);
          setWatchedSet(new Set(watchedIds));
        }
      } else {
        // Web mode fallback using Firebase API Key
        const urlObj = new URL(url);
        const listId = urlObj.searchParams.get('list');
        if (listId) {
          try {
            const data = await fetchWebPlaylist(listId);
            setPlaylist(data);
            
            // In web mode, fetch watched status from local/web db
            if (window.api && window.api.db) {
              const videoIds = data.entries.map((e: any) => e.id);
              // Fallback to query watched from web indexedDB if possible
              // But for now let's just initialize empty or use a web api
              const watched = await window.api.db.getAll('youtube_watched');
              if (watched) {
                const watchedIds = watched.filter((w: any) => videoIds.includes(w.id)).map((w: any) => w.id);
                setWatchedSet(new Set(watchedIds));
              }
            }
          } catch (webErr) {
            console.error('Web playlist fetch failed', webErr);
            setPlaylist({ _error: 'web_limitation' });
          }
        } else {
          setPlaylist({ _error: 'web_limitation' });
        }
      }
    } catch (e) {
      console.error('Failed to fetch playlist', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleWatched = async (video: any) => {
    const isWatched = !watchedSet.has(video.id);
    const newSet = new Set(watchedSet);
    if (isWatched) newSet.add(video.id);
    else newSet.delete(video.id);
    setWatchedSet(newSet);
    
    if (window.api && window.api.youtube) {
      await window.api.youtube.setWatched(video.id, isWatched, video.title, video.uploader);
      if (window.api.sync && window.api.sync.push) {
        window.api.sync.push('youtube_watched'); // trigger sync for nuvem
      }
    } else if (window.api && window.api.db) {
      // Web mode fallback
      if (isWatched) {
        await window.api.db.put('youtube_watched', {
          id: video.id,
          title: video.title,
          uploader: video.uploader,
          watched_at: new Date().toISOString()
        });
      } else {
        await window.api.db.delete('youtube_watched', video.id);
      }
      if (window.api.sync && window.api.sync.push) {
        window.api.sync.push('youtube_watched'); 
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300">
      <div className="bg-[#1C1C1F]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden flex flex-col transform transition-all h-[80vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.01] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center border border-brand-500/20 shadow-inner">
              <PlayCircle size={16} className="text-brand-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
            </div>
            <div>
              <h2 className="text-base font-medium text-white/90 tracking-wide">{title}</h2>
              <p className="text-xs text-white/40 mt-0.5">
                {playlist?.entries ? `${playlist.entries.length} vídeos na playlist` : 'Carregando...'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white/90 transition-all duration-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-white/40">
              <Loader2 size={32} className="animate-spin mb-4 text-brand-400" />
              <p className="text-sm font-medium">Extraindo vídeos da playlist...</p>
              <p className="text-xs mt-1 text-white/30">Isso pode levar alguns segundos</p>
            </div>
          ) : playlist?._error === 'web_limitation' ? (
            <div className="flex flex-col items-center justify-center h-full text-white/40 p-6 text-center">
              <p className="text-sm font-medium text-white/70 mb-2">Recurso Exclusivo do App Desktop</p>
              <p className="text-xs text-white/40">
                O YouTube bloqueia a extração de playlists pelo navegador. 
                Para listar e rastrear os vídeos, use o Caderno na versão Desktop, que possui ferramentas nativas para isso.
              </p>
            </div>
          ) : !playlist?.entries || playlist.entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/40">
              <p className="text-sm font-medium">Nenhum vídeo encontrado</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 p-2">
              {playlist.entries.map((video: any, idx: number) => {
                const isWatched = watchedSet.has(video.id);
                const videoUrl = `https://youtube.com/watch?v=${video.id}`;
                
                return (
                  <div 
                    key={video.id}
                    className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/5 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="text-xs font-mono text-white/30 w-6 text-right">
                        {idx + 1}
                      </span>
                      
                      <button 
                        onClick={() => toggleWatched(video)}
                        className="flex-shrink-0 text-white/20 hover:text-brand-400 transition-colors"
                      >
                        {isWatched ? (
                          <CheckCircle2 size={18} className="text-brand-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                        ) : (
                          <Circle size={18} />
                        )}
                      </button>
                      
                      <div className="flex flex-col min-w-0">
                        <a 
                          href={videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm font-medium truncate tracking-wide hover:text-brand-300 transition-colors ${
                            isWatched ? 'text-white/40 line-through' : 'text-white/90'
                          }`}
                        >
                          {video.title}
                        </a>
                        <div className="flex items-center gap-3 mt-1 opacity-60">
                          {video.duration && (
                            <span className="text-[11px] flex items-center gap-1 text-white/60">
                              <Clock size={10} />
                              {formatDuration(video.duration)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
