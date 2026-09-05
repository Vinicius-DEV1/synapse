import { useEffect } from 'react';
import { Trophy, CheckCircle2, AlertCircle } from 'lucide-react';
import { Portal } from '../../../../ui/Portal';

interface QuizFinishConfirmModalProps {
  isOpen: boolean;
  total: number;
  answeredCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function QuizFinishConfirmModal({
  isOpen,
  total,
  answeredCount,
  onCancel,
  onConfirm,
}: QuizFinishConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        onConfirm();
      }
    };

    // Use capturing phase so this modal traps Esc/Enter before parent modals (e.g. Focus modal)
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  const isAllAnswered = total > 0 && answeredCount >= total;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4"
        onClick={onCancel}
      >
        <div
          className="bg-dark-card border border-white/10 rounded-2xl p-6 w-[400px] max-w-[92vw] shadow-2xl space-y-4 animate-scale-in text-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Icon */}
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-amber-300 shadow-xs">
            <Trophy size={24} />
          </div>

          {/* Title & Message */}
          <div className="space-y-1.5">
            <h3 className="text-base md:text-lg font-semibold text-white">Bateria Concluída!</h3>
            <p className="text-xs text-dark-subtext leading-relaxed">
              Você chegou à última questão. Deseja finalizar a bateria e ver seu resumo de desempenho?
            </p>
          </div>

          {/* Status Badge */}
          <div>
            {isAllAnswered ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium">
                <CheckCircle2 size={12} />
                <span>Todas as {total} questões respondidas</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium">
                <AlertCircle size={12} />
                <span>
                  {answeredCount} de {total} questões respondidas ({total - answeredCount} pendente{total - answeredCount > 1 ? 's' : ''})
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2 border-t border-white/[0.06]">
            <button
              onClick={onCancel}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-medium text-dark-subtext hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Revisar</span>
              <kbd className="text-[10px] opacity-60 px-1 py-0.5 rounded bg-white/5 border border-white/10">
                Esc
              </kbd>
            </button>

            <button
              onClick={onConfirm}
              autoFocus
              className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Finalizar</span>
              <kbd className="text-[10px] opacity-80 px-1 py-0.5 rounded bg-black/20 border border-white/20">
                Enter
              </kbd>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
