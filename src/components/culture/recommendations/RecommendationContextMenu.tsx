
import { Plus, Check, ThumbsDown } from 'lucide-react';
import type { HydratedRecommendation } from '../../../types/culture-recommendations';

interface Props {
  item: HydratedRecommendation;
  pos: { x: number; y: number };
  onAdd: () => void;
  onDislike: () => void;
  onMarkAlreadySeen: () => void;
  isAdded: boolean;
}

export function RecommendationContextMenu({
  item,
  pos,
  onAdd,
  onDislike,
  onMarkAlreadySeen,
  isAdded,
}: Props) {
  // Ensure menu stays within viewport
  const safeX = Math.max(12, Math.min(pos.x, window.innerWidth - 220));
  const safeY = Math.max(12, Math.min(pos.y, window.innerHeight - 180));

  return (
    <div
      className="fixed z-[9999] bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden p-1.5 min-w-[210px] animate-scale-up backdrop-blur-md"
      style={{ top: safeY, left: safeX }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 text-[11px] font-medium text-zinc-400 border-b border-white/5 truncate max-w-[200px]">
        {item.title}
      </div>

      <div className="flex flex-col gap-0.5 mt-1 text-xs">
        <button
          onClick={onAdd}
          disabled={isAdded}
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-zinc-200 hover:text-white hover:bg-white/10 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAdded ? (
            <>
              <Check size={14} className="text-emerald-400" />
              <span>Já adicionado</span>
            </>
          ) : (
            <>
              <Plus size={14} className="text-brand-400" />
              <span>Adicionar à Coleção</span>
            </>
          )}
        </button>

        <button
          onClick={onMarkAlreadySeen}
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-zinc-200 hover:text-white hover:bg-white/10 transition-colors text-left"
        >
          <Check size={14} className="text-blue-400" />
          <span>Já assisti / Já li</span>
        </button>

        <div className="h-px bg-white/5 my-0.5 mx-1" />

        <button
          onClick={onDislike}
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left font-medium"
        >
          <ThumbsDown size={14} />
          <span>Não tenho interesse</span>
        </button>
      </div>
    </div>
  );
}
