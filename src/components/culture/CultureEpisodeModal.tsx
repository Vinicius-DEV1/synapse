import React from 'react';
import {
  X, Check, RefreshCw, AlertCircle, PlayCircle,
  ChevronDown, ChevronRight, CalendarClock, Search
} from 'lucide-react';
import type { CultureItem } from '../../types';
import { Portal } from '../ui/Portal';
import { EpisodeRow } from './episodes/EpisodeRow';
import { SeasonSection } from './episodes/SeasonSection';
import { useCultureEpisodes } from './hooks/useCultureEpisodes';

interface CultureEpisodeModalProps {
  item: CultureItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProgress: (progress: number) => void;
}

export function CultureEpisodeModal({ item, isOpen, onClose, onUpdateProgress }: CultureEpisodeModalProps) {
  const {
    episodes,
    isSyncing,
    syncProgress,
    error,
    showFuture,
    setShowFuture,
    epSearch,
    setEpSearch,
    startBackgroundSync,
    toggleWatched,
    markSeasonAll,
    futureEpisodes,
    pastEpisodes,
    hasSeasonsData,
    seasonGroups,
    currentSeasonNum,
    nextEpisode,
    searchedEpisodes,
    watchedCount,
  } = useCultureEpisodes({ item, isOpen, onUpdateProgress });

  const canResync = !!item.api_id && !!item.api_source;

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
        <div className="bg-dark-card w-full max-w-3xl rounded-3xl shadow-2xl border border-white/10 flex flex-col h-[85vh] overflow-hidden">

          {/* Header */}
          <div className="relative p-6 overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 bg-brand-500/10 backdrop-blur-3xl" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl" />
            <div className="relative flex justify-between items-start">
              <div className="flex gap-4 items-center">
                {item.cover_image && (
                  <img src={item.cover_image} alt="cover" className="w-16 h-24 object-cover rounded-xl shadow-lg ring-1 ring-white/10" />
                )}
                <div>
                  <h2 className="text-2xl font-bold text-white drop-shadow-md">{item.title}</h2>
                  <p className="text-white/60 text-sm mt-1">
                    {episodes.length > 0 ? `${episodes.length} episódios` : 'Carregando...'}
                    {futureEpisodes.length > 0 && <span className="ml-2 text-amber-400/80">• {futureEpisodes.length} em breve</span>}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 w-48 h-1.5 bg-black/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 transition-all duration-500"
                        style={{ width: `${episodes.length > 0 ? (watchedCount / episodes.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-brand-400">{watchedCount} de {episodes.length || '?'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canResync && (
                  <button
                    onClick={startBackgroundSync}
                    disabled={isSyncing}
                    title="Sincronizar episódios novamente"
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white disabled:opacity-30 backdrop-blur-md bg-black/20"
                  >
                    <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                  </button>
                )}
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white backdrop-blur-md bg-black/20">
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Next Episode Banner */}
          {nextEpisode && !epSearch && (
            <div className="bg-brand-500/10 border-b border-brand-500/20 px-5 py-2.5 flex items-center gap-3 flex-shrink-0">
              <PlayCircle size={15} className="text-brand-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-brand-300 font-semibold">Próximo: </span>
                <span className="text-xs text-white/70 truncate">
                  {nextEpisode._season != null
                    ? `T${nextEpisode._season} E${nextEpisode._epInSeason ?? nextEpisode.episode_number} — ${nextEpisode.title.replace(/^S\d+E\d+\s*-\s*/i, '')}`
                    : `Ep ${nextEpisode.episode_number} — ${nextEpisode.title}`
                  }
                </span>
              </div>
              <button
                onClick={() => toggleWatched(nextEpisode)}
                className="flex-shrink-0 text-xs px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors font-medium active:scale-95"
              >
                Marcar assistido
              </button>
            </div>
          )}

          {/* Sync / Error banners */}
          {isSyncing && (
            <div className="bg-brand-500/10 border-b border-brand-500/20 px-6 py-2 flex items-center gap-3 animate-pulse flex-shrink-0">
              <RefreshCw size={14} className="text-brand-400 animate-spin" />
              <span className="text-xs text-brand-300">
                Sincronizando episódios...{syncProgress > 0 && ` (${syncProgress} carregados)`}
              </span>
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 flex items-center gap-3 flex-shrink-0">
              <AlertCircle size={14} className="text-red-400" />
              <span className="text-xs text-red-300">{error}</span>
              {canResync && (
                <button onClick={startBackgroundSync} className="ml-auto text-xs text-red-300 hover:text-red-200 underline">Tentar novamente</button>
              )}
            </div>
          )}

          {/* Search bar */}
          {episodes.length > 0 && (
            <div className="px-4 pt-3 pb-0 flex-shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={epSearch}
                  onChange={e => setEpSearch(e.target.value)}
                  placeholder="Buscar episódio por título ou número..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-500/40 transition-colors"
                />
                {epSearch && (
                  <button onClick={() => setEpSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Episode List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-black/20">
            {episodes.length === 0 && !isSyncing ? (
              <div className="h-full flex flex-col items-center justify-center text-white/30 gap-4">
                <PlayCircle size={48} className="opacity-20" />
                <p>Nenhum episódio disponível para esta obra.</p>
                {!item.api_id && <p className="text-xs text-white/20 max-w-sm text-center">Esta obra foi adicionada sem API vinculada.</p>}
                {canResync && (
                  <button onClick={startBackgroundSync} className="px-4 py-2 mt-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors text-sm font-medium">
                    Sincronizar Episódios
                  </button>
                )}
              </div>
            ) : searchedEpisodes !== null ? (
              <div className="grid gap-1.5">
                {searchedEpisodes.length === 0 ? (
                  <div className="text-center text-white/30 text-sm py-12">Nenhum episódio encontrado.</div>
                ) : searchedEpisodes.map(ep => (
                  <EpisodeRow key={ep.id} ep={ep} onToggle={toggleWatched} readonly={ep._isFuture} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Futuros */}
                {futureEpisodes.length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setShowFuture(v => !v)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-500/5 transition-colors"
                    >
                      <CalendarClock size={15} className="text-amber-400" />
                      <span className="font-semibold text-sm text-amber-300">Próximos Episódios</span>
                      <span className="text-xs text-amber-400/60 bg-amber-500/10 px-2 py-0.5 rounded-full">{futureEpisodes.length}</span>
                      <div className="flex-1" />
                      {showFuture ? <ChevronDown size={14} className="text-amber-400/60" /> : <ChevronRight size={14} className="text-amber-400/60" />}
                    </button>
                    {showFuture && (
                      <div className="px-4 pb-4 grid gap-1.5">
                        {futureEpisodes.map(ep => <EpisodeRow key={ep.id} ep={ep} onToggle={toggleWatched} readonly />)}
                      </div>
                    )}
                  </div>
                )}

                {/* Passados */}
                {hasSeasonsData && seasonGroups ? (
                  <div>
                    {seasonGroups.map(({ season, episodes: eps }) => (
                      <SeasonSection
                        key={season}
                        seasonNum={season}
                        episodes={eps}
                        defaultOpen={season === currentSeasonNum}
                        onToggleWatched={toggleWatched}
                        onMarkAll={markSeasonAll}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-1.5">
                    {pastEpisodes.map(ep => <EpisodeRow key={ep.id} ep={ep} onToggle={toggleWatched} />)}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </Portal>
  );
}
