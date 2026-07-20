import React, { useState } from 'react';
import { X, ExternalLink, Target, Calendar, CheckCircle, Tv, BookOpen, Layers, Play, Hash, Clock, Globe } from 'lucide-react';
import type { CultureItem, CultureEpisode } from '../../types';
import { CultureService } from '../../services/culture';
import { Portal } from '../ui/Portal';

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

  // Metadata grid cards
  const metaCards: { icon: React.ReactNode; label: string; value: string; color?: string }[] = [];

  if (item.episodes_count) {
    metaCards.push({ icon: <Tv size={15} />, label: 'Episódios', value: String(item.episodes_count), color: 'text-blue-400' });
  }
  if (item.chapters) {
    metaCards.push({ icon: <BookOpen size={15} />, label: 'Capítulos', value: String(item.chapters), color: 'text-purple-400' });
  }
  if (item.volumes) {
    metaCards.push({ icon: <Layers size={15} />, label: 'Volumes', value: String(item.volumes), color: 'text-orange-400' });
  }
  if (item.total_progress > 0) {
    metaCards.push({ icon: <Hash size={15} />, label: 'Total', value: String(item.total_progress), color: 'text-brand-400' });
  }
  if (item.api_source) {
    const sourceLabels: Record<string, string> = { jikan: 'MyAnimeList', books: 'Google Books', tvmaze: 'TVmaze', itunes: 'iTunes' };
    metaCards.push({ icon: <Globe size={15} />, label: 'Fonte', value: sourceLabels[item.api_source] || item.api_source, color: 'text-green-400' });
  }
  if (item.created_at) {
    metaCards.push({ icon: <Calendar size={15} />, label: 'Adicionado', value: new Date(item.created_at).toLocaleDateString('pt-BR'), color: 'text-white/50' });
  }
  if (item.last_sync_at) {
    metaCards.push({ icon: <Clock size={15} />, label: 'Últ. sync', value: new Date(item.last_sync_at).toLocaleDateString('pt-BR'), color: 'text-white/50' });
  }

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
          {/* Type badge on cover */}
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
                  <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border text-brand-400 bg-brand-500/10 border-brand-500/20">
                    <Target size={10} />
                    Objetivo
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white leading-tight">{item.title}</h2>
            </div>
            <button onClick={onClose} className="relative z-10 p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors flex-shrink-0">
              <X size={18} />
            </button>
          </div>

          {/* Body scrollable */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-custom space-y-5">

            {/* Goal Note */}
            {item.is_goal && item.goal_note && (
              <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4 flex gap-3 items-start">
                <Target size={18} className="text-brand-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-brand-300 uppercase tracking-wider mb-1">Sua Meta</h4>
                  <p className="text-sm text-brand-400/80">{item.goal_note}</p>
                </div>
              </div>
            )}

            {/* Metadata Stats Grid */}
            {metaCards.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Informações</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {metaCards.map((mc, i) => (
                    <div key={i} className="bg-white/5 border border-white/8 rounded-xl p-3 flex items-center gap-3 hover:bg-white/8 transition-colors">
                      <div className={`p-1.5 rounded-lg bg-white/5 ${mc.color || 'text-brand-400'}`}>
                        {mc.icon}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium leading-none mb-1">{mc.label}</p>
                        <p className="text-sm font-bold text-white">{mc.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progress */}
            <div>
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Progresso</h4>
              <div className="bg-white/5 border border-white/8 rounded-xl p-4">
                <div className="flex items-end justify-between mb-3">
                  <span className="text-sm text-white/60">
                    {item.type === 'filme' ? 'Assistido' : item.type === 'livro' || item.type === 'novel' ? 'Páginas' : 'Episódios / Cap.'}
                  </span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-white">{item.progress}</span>
                    {item.total_progress > 0 && (
                      <span className="text-sm text-white/40"> / {item.total_progress}</span>
                    )}
                    {item.total_progress > 0 && (
                      <span className="text-xs text-white/30 ml-2">({percent}%)</span>
                    )}
                  </div>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isFinished ? 'bg-green-500' :
                      item.is_goal ? 'bg-brand-400 shadow-[0_0_10px_rgba(var(--brand-400),0.8)]' :
                      'bg-brand-500/70'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {isFinished && (
                  <div className="mt-2 flex items-center gap-1.5 text-green-400 text-xs font-semibold">
                    <CheckCircle size={12} />
                    Concluído!
                  </div>
                )}
              </div>
            </div>

            {/* Synopsis */}
            {item.synopsis && (
              <div>
                <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Sinopse / Anotações</h4>
                <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap bg-white/3 rounded-xl p-4 border border-white/5">
                  {item.synopsis}
                </p>
              </div>
            )}

            {/* Ver Episódios / Capítulos */}
            {hasEpisodesFeature && (
              <div>
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

                {showEpisodes && (
                  <div className="mt-3 rounded-xl border border-white/8 overflow-hidden">
                    {episodes.length === 0 ? (
                      <p className="text-center text-sm text-white/30 py-8">Nenhum episódio/capítulo encontrado.</p>
                    ) : (
                      <div className="max-h-[280px] overflow-y-auto scrollbar-custom divide-y divide-white/5">
                        {episodes.map((ep) => (
                          <div
                            key={ep.id}
                            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                              ep.is_watched
                                ? 'bg-green-500/8 text-green-400/70'
                                : 'bg-white/2 text-white/70 hover:bg-white/5'
                            }`}
                          >
                            <span className="text-xs font-mono text-white/25 w-7 text-right flex-shrink-0">
                              {ep.episode_number}
                            </span>
                            <span className="flex-1 truncate">{ep.title}</span>
                            {ep.aired_at && (
                              <span className="text-[10px] text-white/30 flex-shrink-0 hidden sm:inline">
                                {new Date(ep.aired_at).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {ep.is_watched && <CheckCircle size={13} className="text-green-400 flex-shrink-0" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Access Link */}
            {item.access_link && (
              <button
                onClick={handleOpenLink}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white transition-colors w-full justify-center"
              >
                <ExternalLink size={15} className="text-brand-400" />
                Abrir Obra
              </button>
            )}

          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
}
