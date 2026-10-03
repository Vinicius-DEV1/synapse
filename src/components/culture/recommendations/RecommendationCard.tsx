import React, { useState, useEffect } from 'react';
import { Plus, Check, ThumbsDown, EyeOff, Film, Target, Star } from 'lucide-react';
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

export const RecommendationCard = React.memo(function RecommendationCard({
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
    if (!contextMenu) return;
    const handleClose = () => setContextMenu(null);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const getTypeEmoji = () => {
    switch (item.type) {
      case 'filme':
        return '🎬';
      case 'série':
        return '📺';
      case 'anime':
        return '⛩️';
      case 'manga':
        return '📖';
      case 'livro':
        return '📚';
      case 'hq':
        return '🎨';
      case 'novel':
        return '📑';
      default:
        return '🎬';
    }
  };

  const getTierEmoji = () => {
    switch (item.tier) {
      case 'recent':
        return '✨';
      case 'classic':
        return '🏆';
      case 'upcoming':
        return '⏳';
      case 'hidden_gem':
      default:
        return '💎';
    }
  };

  const getTierLabel = () => {
    switch (item.tier) {
      case 'recent':
        return 'Lançamento';
      case 'classic':
        return 'Clássico';
      case 'upcoming':
        return item.expected_release_date || 'Em Breve';
      case 'hidden_gem':
      default:
        return 'Joia Oculta';
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
      className="group relative flex flex-col bg-zinc-900/70 hover:bg-zinc-900 border border-white/[0.07] hover:border-amber-500/40 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-[transform,opacity,border-color,box-shadow] duration-200 transform hover:-translate-y-1 select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500/50"
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

        {/* Gradient Overlay for Top Badges (Only Emojis) */}
        <div className="absolute inset-x-0 top-0 p-2 flex items-center justify-between pointer-events-none bg-gradient-to-b from-black/70 to-transparent">
          <span
            title={`Formato: ${item.type}`}
            className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-black/60 backdrop-blur-md text-xs shadow border border-white/10"
          >
            {getTypeEmoji()}
          </span>
          <span
            title={getTierLabel()}
            className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-black/60 backdrop-blur-md text-xs shadow border border-white/10"
          >
            {getTierEmoji()}
          </span>
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
      <div className="p-3 flex flex-col flex-1 justify-between gap-2">
        <div>
          {/* Full-width Title for complete visibility */}
          <h3
            title={item.title}
            className="text-sm font-semibold text-zinc-100 line-clamp-2 leading-snug group-hover:text-white transition-colors"
          >
            {item.title}
          </h3>

          {/* Rating, Year, and Duration right below Title */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1 flex-wrap">
            {item.rating && (
              <span
                title={`Nota: ${item.rating.toFixed(1)}/10 ${item.rating_source ? `(${item.rating_source})` : ''}`}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/25"
              >
                <Star size={9} className="fill-amber-400 text-amber-400" />
                {item.rating.toFixed(1)}
              </span>
            )}
            {item.year && (
              <span className="text-[11px] font-medium text-zinc-400">
                {item.year}
              </span>
            )}
            {item.duration && (
              <span className="text-[11px] text-zinc-500">
                • {item.duration}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Bar: Creator on Left, Minimalist "+" Button on Right */}
        <div className="flex items-center justify-between gap-1.5 pt-1 mt-auto border-t border-white/[0.04]">
          <div className="min-w-0 flex-1">
            {item.creator ? (
              <div
                title={item.creator}
                className="text-[11px] font-medium text-amber-400/80 truncate"
              >
                {item.creator}
              </div>
            ) : (
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider capitalize">
                {item.type}
              </div>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isAdded) onAdd(item);
            }}
            disabled={isAdded}
            aria-label={isAdded ? 'Na Coleção' : item.tier === 'upcoming' ? 'Aguardar / Meta' : 'Adicionar à Coleção'}
            title={isAdded ? 'Na Coleção' : item.tier === 'upcoming' ? 'Aguardar / Meta' : 'Adicionar à Coleção'}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 flex-shrink-0 ${
              isAdded
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                : item.tier === 'upcoming'
                ? 'bg-cyan-500/15 hover:bg-cyan-600/30 text-cyan-200 border border-cyan-500/30 active:scale-95'
                : 'bg-white/10 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-200 border border-white/10 hover:border-amber-500/30 active:scale-95'
            }`}
          >
            {isAdded ? (
              <Check size={14} className="text-emerald-400" />
            ) : item.tier === 'upcoming' ? (
              <Target size={14} className="text-cyan-400" />
            ) : (
              <Plus size={15} />
            )}
          </button>
        </div>
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
});
