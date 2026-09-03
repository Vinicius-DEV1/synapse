import { memo } from 'react';
import type { QuestionItem } from '../../types';

interface QuizSequentialHeaderProps {
  safeQuestions: QuestionItem[];
  activeIndex: number;
  total: number;
  isOpenType: boolean;
  answeredCount: number;
  correctCount: number;
  onSelectIndex: (index: number) => void;
}

export const QuizSequentialHeader = memo(function QuizSequentialHeader({
  safeQuestions,
  activeIndex,
  total,
  isOpenType,
  answeredCount,
  correctCount,
  onSelectIndex,
}: QuizSequentialHeaderProps) {
  return (
    <div className="p-3 md:p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2.5">
      <div className="flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2 font-medium text-white">
          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-white/90 border border-white/[0.06] text-[10px] font-mono font-medium">
            {activeIndex + 1} / {total}
          </span>
          <span className="text-dark-subtext font-normal text-xs">
            {isOpenType ? 'Questão Aberta' : 'Múltipla Escolha'}
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-[11px]">
          <span className="text-dark-subtext">
            Respondidas: <strong className="text-white font-mono font-medium">{answeredCount}/{total}</strong>
          </span>
          {answeredCount > 0 && (
            <span className="text-emerald-400 font-mono font-medium">
              {correctCount} {correctCount === 1 ? 'acerto' : 'acertos'}
            </span>
          )}
        </div>
      </div>

      {/* Steppers Clicáveis */}
      <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5 pt-0.5">
        {safeQuestions.map((q, idx) => {
          const isCurrent = idx === activeIndex;
          const isAnswered = q.answered;
          const isCorrect =
            q.type === 'multiple_choice'
              ? q.selectedIndex === q.correctIndex
              : q.aiFeedback?.verdict === 'Correto';
          const isPartial = q.type === 'open' && q.aiFeedback?.verdict === 'Parcial';

          let pillClass = 'bg-white/[0.03] border-white/[0.05] text-dark-subtext hover:text-white hover:bg-white/[0.07]';
          if (isAnswered) {
            if (isCorrect) {
              pillClass = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-medium';
            } else if (isPartial) {
              pillClass = 'bg-amber-500/15 border-amber-500/30 text-amber-300 font-medium';
            } else {
              pillClass = 'bg-rose-500/15 border-rose-500/30 text-rose-300 font-medium';
            }
          }

          return (
            <button
              key={q.id}
              onClick={() => onSelectIndex(idx)}
              className={`w-6 h-6 md:w-6.5 md:h-6.5 rounded-lg border text-[11px] font-mono font-medium flex items-center justify-center transition-all shrink-0 ${pillClass} ${
                isCurrent ? 'ring-1.5 ring-brand-400 border-transparent text-white font-semibold scale-105 shadow-xs' : ''
              }`}
              title={`Ir para questão ${idx + 1}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
});
