import { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Check,
  Sparkles,
  Award,
  Gem,
  Clock,
  Target,
  ThumbsDown,
  EyeOff,
  Film,
  Tv,
  BookOpen,
  Layers,
  Star,
  Users,
} from 'lucide-react';

import type { HydratedRecommendation } from '../../../types/culture-recommendations';
import { Portal } from '../../ui/Portal';

interface Props {
  item: HydratedRecommendation;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: HydratedRecommendation) => void;
  onDislike: (item: HydratedRecommendation) => void;
  onMarkAlreadySeen: (item: HydratedRecommendation) => void;
  isAdded: boolean;
}

export function RecommendationDetailsModal({
  item,
  isOpen,
  onClose,
  onAdd,
  onDislike,
  onMarkAlreadySeen,
  isAdded,
}: Props) {
  const [imgError, setImgError] = useState(false);

  // Reset img error state if item changes
  useEffect(() => {
    setImgError(false);
  }, [item.id]);

  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeIcon = () => {
    switch (item.type) {
      case 'filme':
        return <Film size={13} />;
      case 'série':
      case 'anime':
        return <Tv size={13} />;
      default:
        return <BookOpen size={13} />;
    }
  };

  const getTierBadge = () => {
    switch (item.tier) {
      case 'recent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Sparkles size={11} />
            Lançamento
          </span>
        );
      case 'classic':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Award size={11} />
            Clássico
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Clock size={11} />
            {item.expected_release_date || 'Em Breve'}
          </span>
        );
      case 'hidden_gem':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Gem size={11} />
            Joia Oculta
          </span>
        );
    }
  };

  const isStaleCastSynopsis = item.synopsis?.trim().startsWith('Estrelando:');
  const displaySynopsis = isStaleCastSynopsis ? null : (item.synopsis?.trim() || null);
  const displayCast = item.cast || (isStaleCastSynopsis ? item.synopsis?.replace(/^Estrelando:\s*/, '').trim() : null);

  return (

    <Portal>
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rec-modal-title"
      >
        <div
          className="bg-zinc-900 border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-zinc-950/60 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-white/10 text-zinc-200 uppercase tracking-wider">
                {getTypeIcon()}
                {item.type}
              </span>
              {getTierBadge()}
            </div>

            <button
              onClick={onClose}
              title="Fechar (Esc)"
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Modal Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-custom">
            {/* Top Media Showcase */}
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Poster Image */}
              <div className="w-36 sm:w-44 aspect-[2/3] flex-shrink-0 mx-auto sm:mx-0 rounded-xl overflow-hidden bg-zinc-800 border border-white/10 shadow-lg relative">
                {item.cover_image && !imgError ? (
                  <img
                    src={item.cover_image}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-zinc-500 bg-gradient-to-b from-zinc-800 to-zinc-900">
                    <Film size={36} className="opacity-40 mb-2" />
                    <span className="text-[11px] text-center font-medium text-zinc-400">
                      Sem Capa
                    </span>
                  </div>
                )}
              </div>

              {/* Title & Core Metadata */}
              <div className="flex-1 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h2
                      id="rec-modal-title"
                      className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug"
                    >
                      {item.title}
                    </h2>
                    {item.year && (
                      <span className="text-sm font-medium text-zinc-400">
                        ({item.year})
                      </span>
                    )}
                  </div>

                  {item.original_title && item.original_title !== item.title && (
                    <p className="text-xs text-zinc-500 italic mt-0.5">
                      Título original: {item.original_title}
                    </p>
                  )}

                  {/* Creator / Studio / Author */}
                  {item.creator && (
                    <div className="text-xs font-semibold text-amber-400/90 mt-2">
                      {item.creator}
                    </div>
                  )}

                  {/* Cast / Starring Actors */}
                  {displayCast && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1.5">
                      <Users size={12} className="text-zinc-500 flex-shrink-0" />
                      <span>
                        <strong className="text-zinc-300 font-medium">Elenco: </strong>
                        {displayCast}
                      </span>
                    </div>
                  )}

                  {/* Thematic Cluster */}
                  <div className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-zinc-300">
                    <Layers size={12} className="text-amber-400" />
                    <span>Tema: {item.cluster}</span>
                  </div>
                </div>

                {/* Quantitative Badges */}
                <div className="flex items-center flex-wrap gap-2 text-xs text-zinc-400 pt-2 border-t border-white/5">
                  {typeof item.confidence_score === 'number' && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-medium">
                      {Math.round(item.confidence_score * 100)}% de afinidade
                    </span>
                  )}
                  {item.rating && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-medium">
                      <Star size={11} className="fill-amber-400" />
                      {item.rating.toFixed(1)}
                    </span>
                  )}
                  {item.episodes_count && (
                    <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-300">
                      {item.episodes_count} episódios/capítulos
                    </span>
                  )}
                  {item.status && (
                    <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-400">
                      {item.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* AI Affinity Rationale Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-zinc-900 to-purple-500/10 border border-amber-500/20 shadow-sm space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 tracking-wide uppercase">
                <Sparkles size={13} className="text-amber-400" />
                <span>Por Que Recomendamos Para Você</span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-normal">
                {item.affinity_reason}
              </p>
            </div>

            {/* Synopsis */}
            {displaySynopsis && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Sinopse
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-white/[0.02] p-3.5 rounded-xl border border-white/5 whitespace-pre-line">
                  {displaySynopsis}
                </p>
              </div>
            )}


            {/* Genres Tag Cloud */}
            {item.genres && item.genres.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Gêneros
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {item.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-2.5 py-0.5 rounded-md text-xs bg-white/5 border border-white/10 text-zinc-300"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="px-5 py-4 border-t border-white/5 bg-zinc-950/80 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
            {/* Quick Actions (Dislike & Already Watched) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onMarkAlreadySeen(item)}
                title="Marcar como já visto/lido (não recomendar mais)"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-colors border border-white/5"
              >
                <EyeOff size={14} />
                <span className="hidden sm:inline">Já Vi / Li</span>
              </button>

              <button
                onClick={() => onDislike(item)}
                title="Não tenho interesse nesta recomendação"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-rose-500/15 text-xs font-medium text-zinc-300 hover:text-rose-300 transition-colors border border-white/5"
              >
                <ThumbsDown size={14} />
                <span className="hidden sm:inline">Não Tenho Interesse</span>
              </button>
            </div>

            {/* Primary Action Button: Add or Already Added */}
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                onClick={() => {
                  if (!isAdded) onAdd(item);
                }}
                disabled={isAdded}
                className={`py-2 px-4 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all duration-150 ${
                  isAdded
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                    : item.tier === 'upcoming'
                    ? 'bg-cyan-500/20 hover:bg-cyan-600/30 text-cyan-200 hover:text-cyan-100 border border-cyan-500/30 active:scale-[0.98]'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-white border border-amber-500/40 active:scale-[0.98]'
                }`}
              >
                {isAdded ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span>
                      {item.tier === 'upcoming'
                        ? 'Salvo nos Objetivos'
                        : 'Adicionado à Coleção'}
                    </span>
                  </>
                ) : item.tier === 'upcoming' ? (
                  <>
                    <Target size={14} className="text-cyan-400" />
                    <span>Aguardar / Meta</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Adicionar à Coleção</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-colors border border-white/10"
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
