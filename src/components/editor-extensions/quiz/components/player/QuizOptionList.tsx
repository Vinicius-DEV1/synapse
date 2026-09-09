import { FastMarkdown } from '../../utils/markdownPreprocess';
import { playQuizSuccessSound, playQuizFailureSound, playQuizTickSound } from '../../utils/quizSounds';
import type { QuestionItem, AttemptItem } from '../../types';

interface QuizOptionListProps {
  question: QuestionItem;
  optionsList: string[];
  onUpdateSingleQuestion: (
    qId: string,
    partial: Partial<QuestionItem>,
    immediate?: boolean
  ) => void;
}

export function QuizOptionList({
  question: q,
  optionsList,
  onUpdateSingleQuestion,
}: QuizOptionListProps) {
  const handleSelectOption = (optIndex: number) => {
    if (q.answered) return;
    const isCorrect = optIndex === q.correctIndex;
    if (isCorrect) {
      playQuizSuccessSound();
    } else {
      playQuizFailureSound();
    }
    const newAttempt: AttemptItem = {
      id: `att_${Date.now()}`,
      timestamp: Date.now(),
      type: 'multiple_choice',
      selectedIndex: optIndex,
      isCorrect,
    };
    onUpdateSingleQuestion(
      q.id,
      {
        selectedIndex: optIndex,
        answered: true,
        showExplanation: true,
        attemptsHistory: [newAttempt, ...(q.attemptsHistory || [])],
      },
      true
    );
  };

  const handleHover = () => {
    if (!q.answered) {
      playQuizTickSound(true);
    }
  };

  return (
    <div className="space-y-2">
      {optionsList.map((opt, optIndex) => {
        const letter = String.fromCharCode(65 + optIndex);
        const isSelected = q.selectedIndex === optIndex;
        const isCorrect = q.correctIndex === optIndex;

        let optClass = 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12] text-white/90 active:scale-[0.99] md:active:scale-[0.995]';
        let badgeClass = 'bg-white/[0.04] border-white/[0.06] text-white/70 group-hover:scale-110';

        if (q.answered) {
          if (isCorrect) {
            optClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100 font-medium scale-[1.01] shadow-[0_0_15px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/20';
            badgeClass = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 scale-110';
          } else if (isSelected && !isCorrect) {
            optClass = 'bg-rose-500/10 border-rose-500/30 text-rose-200 opacity-80';
            badgeClass = 'bg-rose-500/20 border-rose-500/40 text-rose-300';
          } else {
            optClass = 'bg-black/10 border-white/[0.03] opacity-40 text-dark-subtext';
            badgeClass = 'bg-white/[0.02] border-white/[0.04] text-dark-subtext';
          }
        } else if (isSelected) {
          optClass = 'bg-brand-500/15 border-brand-500/30 text-white font-medium';
          badgeClass = 'bg-brand-500/30 border-brand-500/50 text-brand-200';
        }

        return (
          <div
            key={optIndex}
            role="button"
            tabIndex={q.answered ? -1 : 0}
            aria-disabled={q.answered}
            onClick={() => handleSelectOption(optIndex)}
            onPointerEnter={handleHover}
            onKeyDown={(e) => {
              if (q.answered) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectOption(optIndex);
              }
            }}
            className={`group w-full p-2.5 md:p-3 rounded-xl border text-left flex items-start gap-3 transition-all duration-300 ease-out select-none ${optClass} ${
              q.answered ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            <span className={`w-6 h-6 rounded-md border flex items-center justify-center text-xs font-mono font-medium shrink-0 transition-transform duration-300 ease-out ${badgeClass}`}>
              {letter}
            </span>
            <div className="text-xs md:text-sm flex-1 pt-0.5 leading-relaxed">
              <FastMarkdown content={opt || ''} className="inline leading-relaxed" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
