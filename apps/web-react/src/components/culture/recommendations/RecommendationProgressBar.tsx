import { memo } from 'react';
import { Sparkles, Layers, CheckCircle2 } from 'lucide-react';

interface Props {
  isActive: boolean;
  currentBatch: number;
  totalBatches: number;
  message: string;
  progressPercent: number;
  totalItemsCount: number;
}

export const RecommendationProgressBar = memo(function RecommendationProgressBar({
  isActive,
  currentBatch,
  totalBatches,
  message,
  progressPercent,
  totalItemsCount,
}: Props) {
  if (!isActive) return null;

  const isComplete = progressPercent >= 100;

  return (
    <aside
      role="progressbar"
      aria-valuenow={progressPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progresso da curadoria de recomendações"
      className="fixed bottom-6 right-6 z-40 max-w-sm sm:max-w-md w-[calc(100%-3rem)] overflow-hidden rounded-2xl bg-zinc-900/95 border border-amber-500/35 p-3.5 backdrop-blur-xl shadow-2xl shadow-black/80 transition-all duration-300 pointer-events-auto animate-fadeIn"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            {isComplete ? (
              <CheckCircle2 size={15} className="text-emerald-400" />
            ) : currentBatch > 0 ? (
              <Layers size={14} className="animate-pulse text-amber-400" />
            ) : (
              <Sparkles size={14} className="animate-spin text-amber-400" />
            )}
          </div>

          <div className="flex items-center gap-2 min-w-0">
            {currentBatch > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex-shrink-0">
                Lote {currentBatch}/{totalBatches}
              </span>
            )}
            <span className="text-xs font-medium text-zinc-200 truncate">
              {message || 'Curando recomendações com IA...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {totalItemsCount > 0 && (
            <span className="text-[11px] font-medium text-zinc-400">
              {totalItemsCount} {totalItemsCount === 1 ? 'obra pronta' : 'obras prontas'}
            </span>
          )}
          <span className="text-xs font-bold text-amber-300 font-mono">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Progress Track and Bar */}
      <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-2.5">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-brand-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%` }}
        />
      </div>
    </aside>
  );
});
