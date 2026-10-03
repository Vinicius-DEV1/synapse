import { useState, useEffect } from 'react';
import { X, ExternalLink, Target, CheckCircle, Play, Pencil, Trash2, RefreshCw } from 'lucide-react';
import type { CultureItem, CultureEpisode } from '../../types';
import { CultureService } from '../../services/culture';
import { Portal } from '../ui/Portal';
import { CultureMetaGrid } from './ui/CultureMetaGrid';
import { CultureTrailerSection } from './ui/CultureTrailerSection';
import {
  fetchImdbMovies,
  fetchImdbSeries,
  fetchJikan,
  fetchGoogleBooks,
  fetchCinemetaMetadata,
  type CultureSearchResult,
} from '../../services/culture/culture-apis';

interface Props {
  item: CultureItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  onEdit?: (item: CultureItem) => void;
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

export default function CultureViewModal({ item, isOpen, onClose, onUpdate, onEdit }: Props) {
  const [currentItem, setCurrentItem] = useState<CultureItem>(item);
  const [episodes, setEpisodes] = useState<CultureEpisode[]>([]);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    setCurrentItem(item);
  }, [item]);

  const handleLoadEpisodes = async () => {
    if (episodes.length > 0) { setShowEpisodes(v => !v); return; }
    setLoadingEpisodes(true);
    try {
      const eps = await CultureService.getEpisodes(currentItem.id);
      setEpisodes(eps);
      setShowEpisodes(true);
    } catch (err) {
      console.error('[CultureViewModal] Erro ao carregar episódios:', err);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const handleToggleFinish = async () => {
    const isFin = currentItem.total_progress > 0
      ? currentItem.progress >= currentItem.total_progress
      : currentItem.progress > 0;

    const newProgress = isFin ? 0 : (currentItem.total_progress > 0 ? currentItem.total_progress : 1);
    try {
      await CultureService.updateProgress(currentItem.id, newProgress);
      setCurrentItem(prev => ({ ...prev, progress: newProgress }));
      onUpdate?.();
      setFeedbackMessage(newProgress > 0 ? 'Obra marcada como concluída!' : 'Progresso reiniciado.');
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err) {
      console.error('[CultureViewModal] Erro ao alternar conclusão:', err);
    }
  };

  const handleRefreshMetadata = async () => {
    setRefreshing(true);
    setFeedbackMessage(null);
    try {
      let match: CultureSearchResult | null = null;
      if (currentItem.type === 'filme') {
        const res = await fetchImdbMovies(currentItem.title);
        match = res[0] || null;
      } else if (currentItem.type === 'série') {
        const res = await fetchImdbSeries(currentItem.title);
        match = res[0] || null;
      } else if (currentItem.type === 'anime') {
        const res = await fetchJikan(currentItem.title, 'anime');
        match = res[0] || null;
      } else if (currentItem.type === 'livro') {
        const res = await fetchGoogleBooks(currentItem.title);
        match = res[0] || null;
      }

      if (match && (match.cover || match.synopsis || match.api_id)) {
        let extraCinemeta: Partial<CultureSearchResult> | null = null;
        if (match.api_id?.startsWith('tt')) {
          extraCinemeta = await fetchCinemetaMetadata(match.api_id, currentItem.type === 'série' ? 'series' : 'movie');
        }

        const updatedFields: Partial<CultureItem> = {
          cover_image: match.cover || currentItem.cover_image,
          synopsis: (match.synopsis && match.synopsis.length > 20) ? match.synopsis : currentItem.synopsis,
          api_id: match.api_id || currentItem.api_id,
          api_source: (match.api_source as CultureItem['api_source']) || currentItem.api_source,
          trailer_url: extraCinemeta?.trailer_url || match.trailer_url || currentItem.trailer_url,
          trailer_yt_id: extraCinemeta?.trailer_yt_id || match.trailer_yt_id || currentItem.trailer_yt_id,
        };

        await CultureService.updateItem(currentItem.id, { ...currentItem, ...updatedFields });
        setCurrentItem(prev => ({ ...prev, ...updatedFields }));
        setFeedbackMessage('Capa e dados oficiais atualizados!');
        onUpdate?.();
      } else {
        setFeedbackMessage('Nenhuma informação nova encontrada para este título.');
      }
    } catch (err) {
      console.error('[CultureViewModal] Erro ao sincronizar metadados:', err);
      setFeedbackMessage('Erro ao consultar bases externas.');
    } finally {
      setRefreshing(false);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Tem certeza que deseja excluir "${currentItem.title}" do seu acervo?`)) {
      try {
        await CultureService.deleteItem(currentItem.id);
        onUpdate?.();
        onClose();
      } catch (err) {
        console.error('[CultureViewModal] Erro ao excluir:', err);
      }
    }
  };

  if (!isOpen) return null;

  const percent = currentItem.total_progress > 0
    ? Math.min(100, Math.round((currentItem.progress / currentItem.total_progress) * 100))
    : 0;
  const isFinished = currentItem.total_progress > 0
    ? currentItem.progress >= currentItem.total_progress
    : currentItem.progress > 0;
  const statusInfo = getStatusInfo(currentItem.status);

  const hasEpisodesFeature = ['anime', 'série', 'manga', 'hq', 'novel'].includes(currentItem.type);

  const handleOpenLink = () => {
    if (currentItem.access_link) window.api?.drive?.openExternalUrl(currentItem.access_link);
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
            {currentItem.cover_image ? (
              <img
                src={currentItem.cover_image}
                alt={currentItem.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/20 text-4xl">📖</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <div className="absolute bottom-3 left-3">
              <span className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                {typeLabel(currentItem.type)}
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
                    {typeLabel(currentItem.type)}
                  </span>
                  {statusInfo && (
                    <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusInfo.text} ${statusInfo.bg}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                      {statusInfo.label}
                    </span>
                  )}
                  {currentItem.is_goal && (
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
                <h2 className="text-xl font-bold text-white leading-tight">{currentItem.title}</h2>

                {/* Modal Action Bar */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(currentItem)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors active:scale-95"
                      title="Editar título, capa, progresso ou meta"
                    >
                      <Pencil size={13} />
                      <span>Editar</span>
                    </button>
                  )}

                  <button
                    onClick={handleToggleFinish}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors active:scale-95 ${
                      isFinished
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                    title={isFinished ? 'Marcar como Em Andamento' : 'Marcar como Concluído / Visto'}
                  >
                    <CheckCircle size={13} />
                    <span>{isFinished ? 'Concluído' : 'Marcar como Visto'}</span>
                  </button>

                  <button
                    onClick={handleRefreshMetadata}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-colors disabled:opacity-50 active:scale-95"
                    title="Buscar na base do IMDb/Jikan para corrigir capa ou sinopse"
                  >
                    <RefreshCw size={13} className={refreshing ? 'animate-spin text-brand-400' : ''} />
                    <span>{refreshing ? 'Atualizando...' : 'Atualizar Capa / Dados'}</span>
                  </button>

                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-medium transition-colors ml-auto active:scale-95"
                    title="Excluir obra do acervo"
                  >
                    <Trash2 size={13} />
                    <span className="hidden sm:inline">Excluir</span>
                  </button>
                </div>

                {/* Feedback Notification Banner */}
                {feedbackMessage && (
                  <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs animate-fade-in flex items-center gap-1.5">
                    <CheckCircle size={13} />
                    <span>{feedbackMessage}</span>
                  </div>
                )}
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
                    {currentItem.progress}
                    {currentItem.total_progress > 0 && <span className="text-white/40 font-normal"> / {currentItem.total_progress}</span>}
                    {currentItem.total_progress > 0 && <span className="text-brand-400 ml-1.5">({percent}%)</span>}
                  </span>
                </div>
                {currentItem.total_progress > 0 && (
                  <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Meta Grid */}
              <CultureMetaGrid item={currentItem} />

              {/* Official Trailer Section */}
              <CultureTrailerSection
                title={currentItem.title}
                type={currentItem.type}
                apiId={currentItem.api_id}
                apiSource={currentItem.api_source}
                trailerUrl={currentItem.trailer_url}
                trailerYtId={currentItem.trailer_yt_id}
                accessLink={currentItem.access_link}
              />

              {/* Goal note */}
              {currentItem.is_goal && currentItem.goal_note && (
                <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/15 flex items-start gap-2.5">
                  <Target size={16} className="text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Meta Pessoal</span>
                    <p className="text-xs text-white/80 mt-0.5">{currentItem.goal_note}</p>
                  </div>
                </div>
              )}

              {/* Synopsis */}
              {currentItem.synopsis && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider block">Sinopse</span>
                  <p className="text-xs text-white/70 leading-relaxed whitespace-pre-line bg-white/[0.02] p-3.5 rounded-xl border border-white/5">
                    {currentItem.synopsis}
                  </p>
                </div>
              )}

              {/* Episodes section */}
              {hasEpisodesFeature && currentItem.api_id && (
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
