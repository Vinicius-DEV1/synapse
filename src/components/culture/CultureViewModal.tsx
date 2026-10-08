import { useState } from 'react';
import { X, ExternalLink, Target, CheckCircle, Pencil, Trash2, RefreshCw } from 'lucide-react';
import type { CultureItem, CultureEpisode } from '../../types';
import { CultureService } from '../../services/culture';
import { Portal } from '../ui/Portal';
import { CultureMetaGrid } from './ui/CultureMetaGrid';
import { CultureTrailerSection } from './ui/CultureTrailerSection';
import { CultureEpisodesSection } from './ui/CultureEpisodesSection';
import { CultureModalPoster } from './ui/CultureModalPoster';
import { useCultureMetadataRefresh } from './hooks/useCultureMetadataRefresh';

import { getStatusInfo, typeLabel } from './cards/culture-status';

interface Props {
  item: CultureItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  onEdit?: (item: CultureItem) => void;
}

export default function CultureViewModal({ item, isOpen, onClose, onUpdate, onEdit }: Props) {
  const [currentItem, setCurrentItem] = useState<CultureItem>(item);
  const [episodes, setEpisodes] = useState<CultureEpisode[]>([]);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const {
    refreshing,
    feedbackMessage,
    setFeedbackMessage,
    handleRefreshMetadata,
  } = useCultureMetadataRefresh(currentItem, setCurrentItem, onUpdate);

  const handleLoadEpisodes = async () => {
    if (episodes.length > 0) { setShowEpisodes(v => !v); return; }
    setLoadingEpisodes(true);
    try {
      const eps = await CultureService.getEpisodes(currentItem.id);
      setEpisodes(eps);
      setShowEpisodes(true);
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      console.error('[CultureViewModal] Erro ao alternar conclusão:', err);
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
          <CultureModalPoster
            coverImage={currentItem.cover_image}
            title={currentItem.title}
            type={currentItem.type}
          />

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
              <CultureEpisodesSection
                hasEpisodesFeature={hasEpisodesFeature}
                apiId={currentItem.api_id}
                itemType={item.type}
                loadingEpisodes={loadingEpisodes}
                showEpisodes={showEpisodes}
                episodes={episodes}
                onToggleEpisodes={handleLoadEpisodes}
              />
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
