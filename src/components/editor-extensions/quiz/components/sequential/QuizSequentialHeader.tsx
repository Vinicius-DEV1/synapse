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

export function QuizSequentialHeader({
  safeQuestions,
  activeIndex,
  total,
  isOpenType,
  answeredCount,
  correctCount,
  onSelectIndex,
}: QuizSequentialHeaderProps) {
  return (
    <div className="p-4 bg-dark-bg/60 border border-white/10 rounded-2xl space-y-3">
      <div className="flex items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-2 font-semibold text-white">
          <span className="px-2 py-0.5 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[11px] font-mono font-bold">
            {activeIndex + 1} / {total}
          </span>
          <span className="text-dark-subtext font-normal">
            {isOpenType ? 'Questão Aberta (Discursiva)' : 'Múltipla Escolha'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-dark-subtext">
            Respondidas: <strong className="text-white font-mono">{answeredCount}/{total}</strong>
          </span>
          {answeredCount > 0 && (
            <span className="text-green-400 font-mono font-semibold">
              {correctCount} {correctCount === 1 ? 'acerto' : 'acertos'}
            </span>
          )}
        </div>
      </div>

      {/* Steppers Clicáveis */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 pt-1">
        {safeQuestions.map((q, idx) => {
          const isCurrent = idx === activeIndex;
          const isAnswered = q.answered;
          const isCorrect =
            q.type === 'multiple_choice'
              ? q.selectedIndex === q.correctIndex
              : q.aiFeedback?.verdict === 'Correto';
          const isPartial = q.type === 'open' && q.aiFeedback?.verdict === 'Parcial';

          let pillClass = 'bg-white/5 border-white/10 text-dark-subtext hover:text-white hover:bg-white/10';
          if (isAnswered) {
            if (isCorrect) {
              pillClass = 'bg-green-500/20 border-green-500/40 text-green-300';
            } else if (isPartial) {
              pillClass = 'bg-amber-500/20 border-amber-500/40 text-amber-300';
            } else {
              pillClass = 'bg-red-500/20 border-red-500/40 text-red-300';
            }
          }

          return (
            <button
              key={q.id}
              onClick={() => onSelectIndex(idx)}
              className={`w-7 h-7 rounded-xl border text-xs font-mono font-bold flex items-center justify-center transition-all shrink-0 ${pillClass} ${
                isCurrent ? 'ring-2 ring-brand-500 scale-110 shadow-md font-bold' : ''
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
}
