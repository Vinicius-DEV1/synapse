import { useState } from 'react';
import { X, ExternalLink, Target, CheckCircle, Play } from 'lucide-react';
import type { CultureItem, CultureEpisode } from '../../types';
import { CultureService } from '../../services/culture';
import { Portal } from '../ui/Portal';
import { CultureMetaGrid } from './ui/CultureMetaGrid';

declare module '../../api/types' {
  interface ICadernoAPI {
    drive?: {
      openExternalUrl: (url: string) => Promise<void>;
    };
  }
}

interface Props {
  item: CultureItem;
  isOpen: boolean;
  onClose: () => void;
}

function getStatusInfo(status?: string) {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes('airing') || s.includes('running') || s.includes('releasing') || s.includes('currently') || s === 'ongoing') {
    return { label: 'Em produção', dot: 'bg-green-400', text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' };
  }
  if (s.includes('finished') || s.includes('ended') || s.includes('complete')) {
    return { label: 'Finalizado', dot: 'bg-white/30', text: 'text-white/50', bg: 'bg-white/5 border-white/10' };
  }
  if (s.includes('cancel')) {
    return { label: 'Cancelado', dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
  }
  if (s.includes('hiatus') || s.includes('determined') || s.includes('tba')) {
    return { label: 'Em hiatus', dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' };
  }
  return null;
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    anime: 'Anime', filme: 'Filme', 'série': 'Série', hq: 'HQ / Comic',
    manga: 'Mangá', livro: 'Livro', novel: 'Novel',
  };
  return map[type] || type;
}

export default function CultureViewModal({ item, isOpen, onClose }: Props) {
  const [episodes, setEpisodes] = useState<CultureEpisode[]>([]);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  const handleLoadEpisodes = async () => {
    if (episodes.length > 0) { setShowEpisodes(v => !v); return; }
    setLoadingEpisodes(true);
    try {
      const eps = await CultureService.getEpisodes(item.id);
      setEpisodes(eps);
      setShowEpisodes(true);
    } catch (err) {
      console.error('[CultureViewModal] Erro ao carregar episódios:', err);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  if (!isOpen) return null;

  const percent = item.total_progress > 0
    ? Math.min(100, Math.round((item.progress / item.total_progress) * 100))
    : 0;
  const isFinished = item.total_progress > 0 && item.progress >= item.total_progress;
  const statusInfo = getStatusInfo(item.status);

  const hasEpisodesFeature = ['anime', 'série', 'manga', 'hq', 'novel'].includes(item.type);

  const handleOpenLink = () => {
    if (item.access_link) window.api?.drive?.openExternalUrl(item.access_link);
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <div
          className="bg-dark-card w-full max-w-3xl rounded-2xl shadow-2xl border border-white/10 flex overflow-hidden animate-scale-up max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Poster / Cover */}
          <div className="w-52 hidden sm:flex flex-shrink-0 relative bg-black/60 flex-col">
            {item.cover_image ? (
              <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/20 text-4xl">📖</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-3">
              <span className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                {typeLabel(item.type)}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/5 relative overflow-hidden flex-shrink-0">
              <div className="absolute inset-0 bg-brand-500/5 backdrop-blur-3xl" />
              <div className="relative z-10 flex-1 pr-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="sm:hidden px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                    {typeLabel(item.type)}
                  </span>
                  {statusInfo && (
                    <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusInfo.text} ${statusInfo.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                      {statusInfo.label}
                    </span>
                  )}
                  {item.is_goal && (
                    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                      <Target size={10} />
                      Objetivo
                    </span>
                  )}
                  {isFinished && (
                    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <CheckCircle size={10} />
                      Concluído
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white leading-tight">{item.title}</h2>
              </div>
              <button
                onClick={onClose}
                className="relative z-10 p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-custom space-y-5">
              {/* Progress Card */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50 font-medium">Progresso de Consumo</span>
                  <span className="font-bold text-white">
                    {item.progress}
                    {item.total_progress > 0 && <span className="text-white/40 font-normal"> / {item.total_progress}</span>}
                    {item.total_progress > 0 && <span className="text-brand-400 ml-1.5">({percent}%)</span>}
                  </span>
                </div>
                {item.total_progress > 0 && (
                  <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Meta Grid */}
              <CultureMetaGrid item={item} />

              {/* Goal note */}
              {item.is_goal && item.goal_note && (
                <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/15 flex items-start gap-2.5">
                  <Target size={16} className="text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Meta Pessoal</span>
                    <p className="text-xs text-white/80 mt-0.5">{item.goal_note}</p>
                  </div>
                </div>
              )}

              {/* Synopsis */}
              {item.synopsis && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider block">Sinopse</span>
                  <p className="text-xs text-white/70 leading-relaxed whitespace-pre-line bg-white/[0.02] p-3.5 rounded-xl border border-white/5">
                    {item.synopsis}
                  </p>
                </div>
              )}

              {/* Episodes section */}
              {hasEpisodesFeature && item.api_id && (
                <div className="space-y-2">
                  <button
                    onClick={handleLoadEpisodes}
                    disabled={loadingEpisodes}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 hover:border-brand-500/40 rounded-xl text-sm font-semibold text-brand-400 transition-all duration-200 disabled:opacity-50"
                  >
                    <Play size={15} className={loadingEpisodes ? 'animate-pulse' : ''} />
                    {loadingEpisodes
                      ? 'Carregando...'
                      : showEpisodes
                      ? 'Ocultar lista'
                      : item.type === 'manga' || item.type === 'hq' || item.type === 'novel'
                      ? `Ver Capítulos ${episodes.length > 0 ? `(${episodes.length})` : ''}`
                      : `Ver Episódios ${episodes.length > 0 ? `(${episodes.length})` : ''}`
                    }
                  </button>

                  {showEpisodes && episodes.length > 0 && (
                    <div className="max-h-48 overflow-y-auto scrollbar-custom space-y-1 p-2 rounded-xl bg-black/30 border border-white/5">
                      {episodes.map(ep => (
                        <div
                          key={ep.id}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                            ep.is_watched ? 'text-white/40 bg-white/[0.02]' : 'text-white/80 bg-white/[0.04]'
                          }`}
                        >
                          <span className="truncate flex-1 pr-2">
                            {ep.episode_number ? `Ep. ${ep.episode_number}: ` : ''}{ep.title}
                          </span>
                          {ep.is_watched && (
                            <span className="text-[10px] text-emerald-400 font-semibold flex-shrink-0">Visto</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5 bg-dark-bg/50 flex items-center justify-between flex-shrink-0">
              {item.access_link ? (
                <button
                  onClick={handleOpenLink}
                  className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
                >
                  <ExternalLink size={14} />
                  Abrir link de acesso
                </button>
              ) : <div />}

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
