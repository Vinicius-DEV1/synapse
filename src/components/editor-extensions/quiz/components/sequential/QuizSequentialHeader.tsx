import { memo, useEffect, useRef } from 'react';
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
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);
  const stepperContainerRef = useRef<HTMLDivElement | null>(null);

  // Purely horizontal container scroll, NEVER affecting the parent window or vertical page scroll
  // Wrapped in requestAnimationFrame to eliminate forced reflow / layout thrashing
  useEffect(() => {
    const container = stepperContainerRef.current;
    const activeBtn = activeBtnRef.current;
    if (!container || !activeBtn) return;

    const rafId = requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();

      // Only scroll horizontally if button is outside or near edges of horizontal container
      if (btnRect.left < containerRect.left || btnRect.right > containerRect.right) {
        const scrollOffset =
          activeBtn.offsetLeft -
          container.offsetLeft -
          (container.clientWidth - activeBtn.clientWidth) / 2;

        container.scrollTo({
          left: Math.max(0, scrollOffset),
          behavior: 'smooth',
        });
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [activeIndex]);

  return (
    <div className="relative py-2.5 px-3.5 sm:px-4.5 bg-white/[0.025] border border-white/[0.08] rounded-xl flex items-center justify-between gap-3.5 min-h-[46px] overflow-hidden shadow-xs">
      {/* Absolute smooth progress line at the bottom */}
      <div 
        className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-brand-500/40 via-brand-400/80 to-brand-500/40 transition-all duration-500 ease-out"
        style={{ width: `${(answeredCount / total) * 100}%` }}
      />
      
      {/* Left side: Index counter, Steppers with horizontal auto-scroll, and type label */}
      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden relative z-10">
        <span className="px-2.5 py-1 rounded-lg bg-white/[0.05] text-zinc-200 border border-white/[0.08] text-xs font-mono font-medium shrink-0">
          {activeIndex + 1} / {total}
        </span>

        {/* Subtle hairline divider */}
        <span className="h-4 w-px bg-white/10 shrink-0" />

        {/* Clickable steppers with smooth horizontal scroll and uniform square aspect ratio */}
        <div
          ref={stepperContainerRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5"
        >
          {safeQuestions.map((q, idx) => {
            const isCurrent = idx === activeIndex;
            const isAnswered = q.answered;
            const isCorrect =
              q.type === 'multiple_choice'
                ? q.selectedIndex === q.correctIndex
                : q.aiFeedback?.verdict === 'Correto';
            const isPartial = q.type === 'open' && q.aiFeedback?.verdict === 'Parcial';

            let pillClass =
              'bg-white/[0.03] border-white/[0.07] text-zinc-400 hover:text-white hover:bg-white/[0.08]';
            if (isAnswered) {
              if (isCorrect) {
                pillClass = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-medium';
              } else if (isPartial) {
                pillClass = 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-medium';
              } else {
                pillClass = 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-medium';
              }
            }

            return (
              <button
                key={q.id}
                ref={isCurrent ? activeBtnRef : null}
                onClick={() => onSelectIndex(idx)}
                className={`w-7 h-7 min-w-[28px] aspect-square rounded-lg border text-xs font-mono font-medium flex items-center justify-center transition-all duration-150 ease-out shrink-0 cursor-pointer ${pillClass} ${
                  isCurrent
                    ? 'ring-2 ring-brand-400/90 border-transparent text-white font-semibold scale-105 shadow-xs bg-brand-500/25'
                    : 'active:scale-95'
                }`}
                title={`Ir para questão ${idx + 1}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <span className="hidden sm:inline-block h-4 w-px bg-white/10 shrink-0" />

        <span className="hidden sm:inline-block text-zinc-400 text-xs font-medium truncate shrink-0">
          {isOpenType ? 'Questão Aberta' : 'Múltipla Escolha'}
        </span>
      </div>

      {/* Right side: Fixed progress counters */}
      <div className="flex items-center gap-2.5 text-xs shrink-0 font-medium relative z-10">
        <span className="text-zinc-400">
          Respondidas:{' '}
          <strong className="text-white font-mono font-medium" key={`answered-${answeredCount}`}>
            {answeredCount}/{total}
          </strong>
        </span>
        {answeredCount > 0 && (
          <span key={`correct-${correctCount}`} className="animate-quiz-pop text-emerald-400 font-mono text-xs px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 font-medium">
            {correctCount} {correctCount === 1 ? 'acerto' : 'acertos'}
          </span>
        )}
      </div>
    </div>
  );
});
