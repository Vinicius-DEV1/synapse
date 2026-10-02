import React, { useState, useEffect } from 'react';
import { Plus, Check, Sparkles, Award, Gem, ThumbsDown, EyeOff, Film, Tv, BookOpen, Clock, Target } from 'lucide-react';
import type { HydratedRecommendation } from '../../../types/culture-recommendations';
import { RecommendationContextMenu } from './RecommendationContextMenu';

interface Props {
  item: HydratedRecommendation;
  onAdd: (item: HydratedRecommendation) => void;
  onDislike: (item: HydratedRecommendation) => void;
  onMarkAlreadySeen: (item: HydratedRecommendation) => void;
  onClick?: (item: HydratedRecommendation) => void;
  isAdded: boolean;
}

export function RecommendationCard({
  item,
  onAdd,
  onDislike,
  onMarkAlreadySeen,
  onClick,
  isAdded,
}: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const getTierBadge = () => {
    switch (item.tier) {
      case 'recent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Sparkles size={10} />
            Lançamento
          </span>
        );
      case 'classic':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Award size={10} />
            Clássico
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Clock size={10} />
            {item.expected_release_date ? item.expected_release_date : 'Em Breve'}
          </span>
        );
      case 'hidden_gem':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Gem size={10} />
            Joia Oculta
          </span>
        );
    }
  };

  const getTypeIcon = () => {
    switch (item.type) {
      case 'filme':
        return <Film size={12} />;
      case 'série':
      case 'anime':
        return <Tv size={12} />;
      default:
        return <BookOpen size={12} />;
    }
  };

  return (
    <div
      onClick={() => onClick?.(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(item);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Ver detalhes de ${item.title}`}
      onContextMenu={handleContextMenu}
      className="group relative flex flex-col bg-zinc-900/70 hover:bg-zinc-900 border border-white/[0.07] hover:border-amber-500/40 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-1 select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500/50"
    >
      {/* Poster Image or Fallback Header */}
      <div className="relative aspect-[2/3] w-full bg-zinc-800 overflow-hidden">
        {item.cover_image && !imgError ? (
          <img
            src={item.cover_image}
            alt={item.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-zinc-800 to-zinc-900 text-zinc-500">
            <Film size={36} className="opacity-40 mb-2" />
            <span className="text-xs text-center font-medium text-zinc-400 line-clamp-2">
              {item.title}
            </span>
          </div>
        )}

        {/* Gradient Overlay for Top Badges */}
        <div className="absolute inset-x-0 top-0 p-2.5 flex items-center justify-between pointer-events-none bg-gradient-to-b from-black/70 to-transparent">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/60 backdrop-blur-md text-zinc-200 uppercase tracking-wider">
            {getTypeIcon()}
            {item.type}
          </span>
          {getTierBadge()}
        </div>

        {/* Quick hover action overlay */}
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMarkAlreadySeen(item);
            }}
            title="Marcar como já visto/lido"
            className="p-1.5 rounded-lg bg-black/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
          >
            <EyeOff size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDislike(item);
            }}
            title="Não tenho interesse"
            className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 transition-colors"
          >
            <ThumbsDown size={14} />
          </button>
        </div>
      </div>

      {/* Card Metadata & Content */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <div className="flex items-start justify-between gap-1.5">
            <h3
              title={item.title}
              className="text-sm font-semibold text-zinc-100 line-clamp-1 group-hover:text-white transition-colors"
            >
              {item.title}
            </h3>
            {item.year && (
              <span className="text-[11px] font-medium text-zinc-500 flex-shrink-0">
                {item.year}
              </span>
            )}
          </div>

          {/* Creator / Studio / Author Signature */}
          {item.creator && (
            <div
              title={item.creator}
              className="text-[11px] font-medium text-amber-400/80 truncate mt-0.5"
            >
              {item.creator}
            </div>
          )}

          {/* Personalized Affinity Reason */}
          <p
            title={item.affinity_reason}
            className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed"
          >
            {item.affinity_reason}
          </p>
        </div>

        {/* Add Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isAdded) onAdd(item);
          }}
          disabled={isAdded}
          className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-150 ${
            isAdded
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
              : item.tier === 'upcoming'
              ? 'bg-cyan-500/15 hover:bg-cyan-600/30 text-cyan-200 hover:text-cyan-100 border border-cyan-500/30 active:scale-[0.98]'
              : 'bg-white/10 hover:bg-brand-600 text-zinc-200 hover:text-white border border-white/10 hover:border-brand-500 active:scale-[0.98]'
          }`}
        >
          {isAdded ? (
            <>
              <Check size={13} className="text-emerald-400" />
              <span>{item.tier === 'upcoming' ? 'Nos Objetivos' : 'Na Coleção'}</span>
            </>
          ) : item.tier === 'upcoming' ? (
            <>
              <Target size={13} className="text-cyan-400" />
              <span>Aguardar / Meta</span>
            </>
          ) : (
            <>
              <Plus size={13} />
              <span>Adicionar à Coleção</span>
            </>
          )}
        </button>
      </div>

      {/* Context Menu on Right Click */}
      {contextMenu && (
        <RecommendationContextMenu
          item={item}
          pos={contextMenu}
          onAdd={() => {
            onAdd(item);
            setContextMenu(null);
          }}
          onDislike={() => {
            onDislike(item);
            setContextMenu(null);
          }}
          onMarkAlreadySeen={() => {
            onMarkAlreadySeen(item);
            setContextMenu(null);
          }}
          isAdded={isAdded}
        />
      )}
    </div>
  );
}
