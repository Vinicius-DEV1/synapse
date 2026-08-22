import { useState, useEffect } from 'react';
import { X, PlayCircle, Loader2, CheckCircle2, Circle} from 'lucide-react';
import { Portal } from '../ui/Portal';
import { formatDuration } from '../../utils/format';

export default function YouTubePlaylistModal({ url, title, onClose }: YouTubePlaylistModalProps) {
  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState<any>(null);
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPlaylist();
  }, [url]);



  const loadPlaylist = async () => {
    try {
      setLoading(true);
      if (window.api && window.api.youtube && window.api.youtube.fetchPlaylistInfo) {
        const data = await window.api.youtube.fetchPlaylistInfo(url);
        if (data && data.entries) {
          setPlaylist(data);
          
          // Fetch watched status
          const videoIds = data.entries.map((e: any) => e.id);
          const watchedIds = await window.api.youtube.getWatched(videoIds);
          setWatchedSet(new Set(watchedIds));
        } else {
          setPlaylist({ entries: [] });
        }
      } else {
        setPlaylist({ _error: 'web_limitation' });
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
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300">
      <div className="bg-[#1C1C1F]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden flex flex-col transform transition-all h-[80vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.01] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center border border-brand-500/20 shadow-inner">
              <PlayCircle size={16} className="text-brand-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
            </div>
            <div>
              <h2 className="text-base font-medium text-white/90 tracking-wide line-clamp-1">{title}</h2>
              {playlist?.entries && (
                <div className="mt-1.5 w-full">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[11px] text-white/40 font-medium uppercase tracking-wider">
                      Progresso: {watchedSet.size} / {playlist.entries.length}
                    </p>
                    <p className="text-[11px] text-white/40 font-medium">
                      {Math.round((watchedSet.size / playlist.entries.length) * 100)}%
                    </p>
                  </div>
                  <div className="w-64 bg-white/5 rounded-full h-1 overflow-hidden">
                    <div 
                      className="bg-brand-500 h-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(248,113,113,0.5)]" 
                      style={{ width: `${(watchedSet.size / playlist.entries.length) * 100}%` }} 
                    />
                  </div>
                </div>
              )}
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
                    className="group relative flex items-center p-2 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/5 transition-all duration-300"
                  >
                    <div className="w-6 text-center text-[10px] font-mono text-white/20 mr-2 group-hover:text-white/40 transition-colors">
                      {idx + 1}
                    </div>

                    <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="relative w-28 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 shadow-sm group-hover:shadow-md transition-all group-hover:ring-1 group-hover:ring-brand-500/30">
                      <img src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} className={`w-full h-full object-cover transition-all duration-500 ${isWatched ? 'opacity-40 grayscale' : 'opacity-90 group-hover:opacity-100 group-hover:scale-105'}`} alt={video.title} />
                      {video.duration && (
                        <div className="absolute bottom-1 right-1 bg-black/80 backdrop-blur-sm text-white px-1.5 py-0.5 rounded text-[9px] font-medium tracking-wider">
                          {formatDuration(video.duration)}
                        </div>
                      )}
                      <div className={`absolute inset-0 bg-brand-500/20 flex items-center justify-center backdrop-blur-[1px] transition-opacity duration-300 ${isWatched ? 'opacity-100' : 'opacity-0'}`}>
                        <CheckCircle2 size={16} className="text-white drop-shadow-md" />
                      </div>
                    </a>
                    
                    <div className="flex-1 min-w-0 ml-4 flex flex-col justify-center">
                      <a 
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm font-medium line-clamp-2 leading-snug tracking-wide transition-colors !no-underline !not-italic ${
                          isWatched ? '!text-white/40 line-through' : '!text-white/90 hover:!text-brand-300'
                        }`}
                      >
                        {video.title}
                      </a>
                      <span className="text-[11px] text-white/40 truncate mt-1 font-medium">
                        {video.uploader}
                      </span>
                    </div>

                    <button 
                      onClick={() => toggleWatched(video)}
                      className={`flex-shrink-0 p-2.5 rounded-xl ml-2 transition-all duration-200 ${
                        isWatched 
                          ? 'text-brand-400 bg-brand-500/10 hover:bg-brand-500/20' 
                          : 'text-white/20 hover:text-brand-400 hover:bg-white/5'
                      }`}
                      title={isWatched ? "Marcar como não assistido" : "Marcar como assistido"}
                    >
                      {isWatched ? (
                        <CheckCircle2 size={20} className="drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                      ) : (
                        <Circle size={20} />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
}
