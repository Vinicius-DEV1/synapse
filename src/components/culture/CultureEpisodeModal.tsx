import React, { useState, useEffect, useRef } from 'react';
import { X, Check, RefreshCw, AlertCircle, PlayCircle, Eye, EyeOff } from 'lucide-react';
import type { CultureItem, CultureEpisode } from '../../types';
import { CultureService } from '../../services/culture';

interface CultureEpisodeModalProps {
  item: CultureItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProgress: (progress: number) => void;
}

export function CultureEpisodeModal({ item, isOpen, onClose, onUpdateProgress }: CultureEpisodeModalProps) {
  const [episodes, setEpisodes] = useState<CultureEpisode[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0); // Para animes gigantes
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track if we should stop syncing because modal closed
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (isOpen) {
      loadEpisodes();
    }
    return () => {
      isMounted.current = false;
    };
  }, [isOpen, item.id]);

  const loadEpisodes = async () => {
    try {
      const eps = await CultureService.getEpisodes(item.id);
      setEpisodes(eps);
      
      // Se não houver episódios no banco e tem API ID, sincroniza em background
      if (eps.length === 0 && item.api_id && item.api_source) {
        startBackgroundSync();
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar episódios locais.');
    }
  };

  const startBackgroundSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setError(null);
    setSyncProgress(0);

    try {
      if (item.api_source === 'tvmaze') {
        // TVMaze: Traz tudo de uma vez
        const res = await fetch(`https://api.tvmaze.com/shows/${item.api_id}/episodes`);
        if (!res.ok) throw new Error('Falha ao buscar dados do TVMaze');
        const data = await res.json();
        
        const epsToSave = data.map((ep: any, index: number) => ({
          id: `ep_${item.id}_${ep.id}`,
          episode_number: index + 1, // TVMaze has season/number, mas faremos linear por enquanto
          title: `S${String(ep.season).padStart(2, '0')}E${String(ep.number).padStart(2, '0')} - ${ep.name}`,
          synopsis: (ep.summary || '').replace(/<[^>]+>/g, ''),
          is_watched: false
        }));

        await CultureService.saveEpisodes(item.id, epsToSave);
        if (isMounted.current) {
          await loadEpisodes(); // Recarrega
        }

      } else if (item.api_source === 'jikan') {
        // Jikan: Paginado (100 por página)
        let page = 1;
        let hasNextPage = true;
        let totalFetched = 0;

        while (hasNextPage && isMounted.current) {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${item.api_id}/episodes?page=${page}`);
          if (!res.ok) {
            // Se for rate limit, espera e tenta de novo
            if (res.status === 429) {
              await new Promise(r => setTimeout(r, 1000));
              continue;
            }
            throw new Error('Falha ao buscar dados do Jikan');
          }
          
          const data = await res.json();
          const epList = data.data || [];
          
          if (epList.length === 0) break;

          const epsToSave = epList.map((ep: any) => ({
            id: `ep_${item.id}_${ep.mal_id}`,
            episode_number: ep.mal_id,
            title: ep.title || `Episódio ${ep.mal_id}`,
            synopsis: ep.title_japanese ? `JP: ${ep.title_japanese}` : '',
            is_watched: false
          }));

          await CultureService.saveEpisodes(item.id, epsToSave);
          
          totalFetched += epList.length;
          setSyncProgress(totalFetched);
          
          // Atualiza a UI com o que já chegou
          if (isMounted.current) {
            const currentEps = await CultureService.getEpisodes(item.id);
            setEpisodes(currentEps);
          }

          hasNextPage = data.pagination?.has_next_page || false;
          page++;
          
          // Respeitar rate limit do Jikan (3 requests per second)
          await new Promise(r => setTimeout(r, 400));
        }
      }
    } catch (err: any) {
      console.error('Erro na sincronização:', err);
      if (isMounted.current) setError('Falha ao sincronizar episódios. Tente novamente mais tarde.');
    } finally {
      if (isMounted.current) setIsSyncing(false);
    }
  };

  const toggleWatched = async (ep: CultureEpisode) => {
    try {
      const newState = !ep.is_watched;
      await CultureService.toggleEpisodeWatched(ep.id, newState);
      
      // Atualiza localmente rápido
      setEpisodes(prev => prev.map(e => e.id === ep.id ? { ...e, is_watched: newState } : e));

      // Calcula novo progresso e atualiza global
      const watchedCount = episodes.filter(e => e.id !== ep.id ? e.is_watched : newState).length;
      onUpdateProgress(watchedCount);
      
    } catch (err) {
      console.error('Erro ao marcar episódio', err);
    }
  };

  if (!isOpen) return null;

  const watchedCount = episodes.filter(e => e.is_watched).length;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-dark-card w-full max-w-3xl rounded-3xl shadow-2xl border border-white/10 flex flex-col h-[85vh] overflow-hidden">
        
        {/* Header Glassmorphism */}
        <div className="relative p-6 overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-brand-500/10 backdrop-blur-3xl"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl"></div>
          
          <div className="relative flex justify-between items-start">
            <div className="flex gap-4 items-center">
              {item.cover_image && (
                <img src={item.cover_image} alt="cover" className="w-16 h-24 object-cover rounded-xl shadow-lg ring-1 ring-white/10" />
              )}
              <div>
                <h2 className="text-2xl font-bold text-white drop-shadow-md">{item.title}</h2>
                <p className="text-white/60 text-sm mt-1">
                  Lista de Episódios • {episodes.length > 0 ? `${episodes.length} episódios` : 'Carregando...'}
                </p>
                
                {/* Progress bar info */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 w-48 h-1.5 bg-black/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-500 transition-all duration-500" 
                      style={{ width: `${episodes.length > 0 ? (watchedCount / episodes.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-brand-400">
                    {watchedCount} de {episodes.length || '?'}
                  </span>
                </div>
              </div>
            </div>

            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white backdrop-blur-md bg-black/20">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        {isSyncing && (
          <div className="bg-brand-500/10 border-b border-brand-500/20 px-6 py-2 flex items-center gap-3 animate-pulse">
            <RefreshCw size={14} className="text-brand-400 animate-spin" />
            <span className="text-xs text-brand-300">
              Sincronizando episódios em background... {syncProgress > 0 && `(${syncProgress} carregados)`}
            </span>
          </div>
        )}
        
        {error && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 flex items-center gap-3">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-xs text-red-300">{error}</span>
          </div>
        )}

        {/* Episodios List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-black/20">
          {episodes.length === 0 && !isSyncing ? (
            <div className="h-full flex flex-col items-center justify-center text-white/30 gap-4">
              <PlayCircle size={48} className="opacity-20" />
              <p>Nenhum episódio disponível para esta obra.</p>
              {!item.api_id && (
                <p className="text-xs text-white/20 max-w-sm text-center">
                  Esta obra foi adicionada sem API vinculada.
                </p>
              )}
              {item.api_id && (
                <button onClick={startBackgroundSync} className="px-4 py-2 mt-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors text-sm font-medium">
                  Tentar Sincronizar Novamente
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-2">
              {episodes.map((ep) => (
                <div 
                  key={ep.id}
                  onClick={() => toggleWatched(ep)}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${
                    ep.is_watched 
                      ? 'bg-brand-500/5 border-brand-500/20' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex-shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                      ep.is_watched ? 'bg-brand-500 text-white' : 'bg-black/40 border border-white/20 text-transparent group-hover:border-white/40'
                    }`}>
                      <Check size={14} />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-white/40">EP {String(ep.episode_number).padStart(3, '0')}</span>
                      <h4 className={`text-sm font-medium truncate ${ep.is_watched ? 'text-white/70' : 'text-white'}`}>
                        {ep.title}
                      </h4>
                    </div>
                    {ep.synopsis && (
                      <p className="text-xs text-white/40 mt-1 line-clamp-1">{ep.synopsis}</p>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0 text-white/30 group-hover:text-white/50">
                    {ep.is_watched ? <Eye size={18} /> : <EyeOff size={18} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
