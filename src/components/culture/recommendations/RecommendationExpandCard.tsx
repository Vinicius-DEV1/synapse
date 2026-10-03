import React from 'react';
import { Sparkles, Loader2, Plus } from 'lucide-react';

interface Props {
  onExpand: () => void;
  isExpanding: boolean;
  clusterTitle: string;
}

export const RecommendationExpandCard = React.memo(function RecommendationExpandCard({
  onExpand,
  isExpanding,
  clusterTitle,
}: Props) {
  return (
    <div
      onClick={isExpanding ? undefined : onExpand}
      onKeyDown={(e) => {
        if (!isExpanding && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onExpand();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Buscar mais recomendações para ${clusterTitle}`}
      aria-busy={isExpanding}
      className={`group relative flex flex-col items-center justify-center p-4 rounded-xl border border-dashed transition-all duration-300 select-none cursor-pointer focus:outline-none overflow-hidden min-h-[280px] sm:min-h-[310px] ${
        isExpanding
          ? 'bg-zinc-900/80 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)] cursor-wait'
          : 'bg-zinc-900/30 hover:bg-zinc-900/70 border-white/10 hover:border-amber-400/40 hover:shadow-[0_0_24px_rgba(245,158,11,0.12)] hover:-translate-y-1'
      }`}
    >
      {/* Background ambient glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/0 via-amber-500/5 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Shimmer line when expanding */}
      {isExpanding && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-amber-400/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
        </div>
      )}

      {/* Center Icon & Content */}
      <div className="relative z-10 flex flex-col items-center text-center gap-3 max-w-[150px]">
        {/* Glowing Icon Circle */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
            isExpanding
              ? 'bg-amber-500/20 text-amber-300 ring-2 ring-amber-400/40'
              : 'bg-white/5 group-hover:bg-amber-400/10 text-zinc-400 group-hover:text-amber-300 border border-white/10 group-hover:border-amber-400/30 group-hover:scale-110 shadow-sm'
          }`}
        >
          {isExpanding ? (
            <Loader2 size={22} className="animate-spin text-amber-400" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Sparkles size={20} className="transition-transform group-hover:rotate-12 duration-300" />
              <Plus size={10} className="absolute -top-1 -right-1 text-amber-400 font-bold" />
            </div>
          )}
        </div>

        {/* Text Details */}
        <div className="flex flex-col gap-1">
          <span
            className={`text-sm font-semibold tracking-tight transition-colors duration-200 ${
              isExpanding
                ? 'text-amber-300'
                : 'text-zinc-200 group-hover:text-white'
            }`}
          >
            {isExpanding ? 'Buscando Mais...' : 'Exibir Mais'}
          </span>

          <p className="text-[11px] text-zinc-400 leading-snug group-hover:text-zinc-300 transition-colors">
            {isExpanding
              ? 'Consultando IA e gerando novas obras...'
              : 'Buscar + sugestões deste tema com IA'}
          </p>
        </div>

        {/* Bottom Pill Badge */}
        <div
          className={`mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all duration-200 ${
            isExpanding
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
              : 'bg-white/5 group-hover:bg-amber-400/10 text-zinc-400 group-hover:text-amber-300/90 border border-white/5 group-hover:border-amber-400/20'
          }`}
        >
          {isExpanding ? (
            <span>Processando</span>
          ) : (
            <>
              <span>+6 a 8 obras</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
