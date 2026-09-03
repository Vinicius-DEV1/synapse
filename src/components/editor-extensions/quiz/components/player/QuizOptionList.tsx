import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { preprocessMarkdownCode, markdownComponents } from '../../utils/markdownPreprocess';
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
    const newAttempt: AttemptItem = {
      id: `att_${Date.now()}`,
      timestamp: Date.now(),
      type: 'multiple_choice',
      selectedIndex: optIndex,
      isCorrect: optIndex === q.correctIndex,
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

  return (
    <div className="space-y-1.5">
      {optionsList.map((opt, optIndex) => {
        const letter = String.fromCharCode(65 + optIndex);
        const isSelected = q.selectedIndex === optIndex;
        const isCorrect = q.correctIndex === optIndex;

        let optClass = 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12] text-white/90';
        let badgeClass = 'bg-white/[0.04] border-white/[0.06] text-white/70';

        if (q.answered) {
          if (isCorrect) {
            optClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100 font-medium';
            badgeClass = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
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
            onKeyDown={(e) => {
              if (q.answered) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelectOption(optIndex);
              }
            }}
            className={`w-full p-2.5 md:p-3 rounded-xl border text-left flex items-start gap-2.5 transition-colors select-none ${optClass} ${
              q.answered ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            <span className={`w-6 h-6 rounded-md border flex items-center justify-center text-xs font-mono font-medium shrink-0 transition-colors ${badgeClass}`}>
              {letter}
            </span>
            <div className="text-xs md:text-sm flex-1 pt-0.5 leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {preprocessMarkdownCode(opt || '')}
              </ReactMarkdown>
            </div>
          </div>
        );
      })}
    </div>
  );
}
