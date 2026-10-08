import { EyeOff, ThumbsDown, Check, Target, Plus } from 'lucide-react';
import type { HydratedRecommendation } from '../../../../types/culture-recommendations';

interface RecommendationDetailsFooterProps {
  item: HydratedRecommendation;
  isAdded: boolean;
  onAdd: (item: HydratedRecommendation) => void;
  onDislike: (item: HydratedRecommendation) => void;
  onMarkAlreadySeen: (item: HydratedRecommendation) => void;
  onClose: () => void;
}

export function RecommendationDetailsFooter({
  item,
  isAdded,
  onAdd,
  onDislike,
  onMarkAlreadySeen,
  onClose,
}: RecommendationDetailsFooterProps) {
  return (
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
  );
}
