import { memo, useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Edit2, Trash2, Sparkles, RotateCcw } from 'lucide-react';
import { playQuizAiOpenSound } from '../../utils/quizSounds';
import type { QuestionItem } from '../../types';

interface QuizSequentialHeaderProps {
  safeQuestions: QuestionItem[];
  activeIndex: number;
  total: number;
  isOpenType: boolean;
  answeredCount: number;
  correctCount: number;
  onSelectIndex: (index: number) => void;
  onDeleteQuestion?: (qId: string, index: number) => void;
  onOpenAiAssistant?: (q?: QuestionItem, index?: number) => void;
  onEditQuestion?: () => void;
  onResetAll?: () => void;
}

export const QuizSequentialHeader = memo(function QuizSequentialHeader({
  safeQuestions,
  activeIndex,
  total,
  isOpenType,
  answeredCount,
  correctCount,
  onSelectIndex,
  onDeleteQuestion,
  onOpenAiAssistant,
  onEditQuestion,
  onResetAll,
}: QuizSequentialHeaderProps) {
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);
  const stepperContainerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

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
    <div className="relative py-2.5 px-3.5 sm:px-4.5 bg-white/[0.025] border border-white/[0.08] rounded-xl flex items-center justify-between gap-3.5 min-h-[46px] shadow-xs">
      {/* Absolute smooth progress line at the bottom */}
      <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
        <div 
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-brand-500/40 via-brand-400/80 to-brand-500/40 transition-all duration-500 ease-out"
          style={{ width: `${(answeredCount / total) * 100}%` }}
        />
      </div>
      
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

        {/* Menu da Questão Atual */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((prev) => !prev)}
            className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-dark-subtext hover:text-white border border-white/[0.06] transition-colors flex items-center justify-center ml-1"
            title="Opções da questão atual"
          >
            <MoreHorizontal size={14} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-zinc-900 border border-white/[0.08] rounded-xl shadow-2xl py-1.5 z-50 backdrop-blur-xl animate-fade-in text-xs">
              <div className="px-3 py-1.5 text-[10px] font-medium text-dark-subtext uppercase tracking-wider border-b border-white/[0.04] mb-1">
                Ações da Questão
              </div>
              
              <button
                onClick={() => {
                  setShowMenu(false);
                  if (onEditQuestion) onEditQuestion();
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Edit2 size={13} className="text-zinc-400" />
                <span>Editar Questão</span>
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  playQuizAiOpenSound();
                  if (onOpenAiAssistant) {
                    onOpenAiAssistant(safeQuestions[activeIndex], activeIndex);
                  }
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-zinc-300 hover:text-white hover:bg-brand-500/10 transition-colors group"
              >
                <Sparkles size={13} className="text-brand-400 group-hover:animate-pulse" />
                <span className="text-brand-200">Editar com IA</span>
              </button>

              <div className="h-px bg-white/[0.04] my-1" />

              {onResetAll && (
                <>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onResetAll();
                    }}
                    className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-amber-300/90 hover:text-amber-200 hover:bg-amber-500/10 transition-colors"
                  >
                    <RotateCcw size={13} className="text-amber-400" />
                    <span>Refazer Bateria</span>
                  </button>
                  <div className="h-px bg-white/[0.04] my-1" />
                </>
              )}

              <button
                onClick={() => {
                  setShowMenu(false);
                  const currentQ = safeQuestions[activeIndex];
                  if (currentQ && onDeleteQuestion) {
                    onDeleteQuestion(currentQ.id, activeIndex);
                  }
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-rose-300 hover:text-white hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 size={13} className="text-rose-400" />
                <span>Excluir Questão</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
