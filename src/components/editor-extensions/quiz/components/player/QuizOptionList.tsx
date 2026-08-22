import React from 'react';
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
    <div className="space-y-2">
      {optionsList.map((opt, optIndex) => {
        const letter = String.fromCharCode(65 + optIndex);
        const isSelected = q.selectedIndex === optIndex;
        const isCorrect = q.correctIndex === optIndex;

        let optClass = 'bg-black/30 border-white/10 hover:border-purple-500/40 text-purple-100';
        if (q.answered) {
          if (isCorrect) {
            optClass =
              'bg-green-500/20 border-green-500 text-green-200 shadow-md shadow-green-500/10';
          } else if (isSelected && !isCorrect) {
            optClass =
              'bg-red-500/20 border-red-500 text-red-200 shadow-md shadow-red-500/10';
          } else {
            optClass = 'bg-black/20 border-white/5 opacity-50 text-purple-200';
          }
        } else if (isSelected) {
          optClass = 'bg-purple-600/30 border-purple-500 text-white';
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
            className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-colors select-none ${optClass} ${
              q.answered ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            <span className="w-6 h-6 rounded-lg bg-black/40 flex items-center justify-center text-xs font-bold font-mono shrink-0">
              {letter}
            </span>
            <div className="text-xs flex-1 pt-0.5 leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents as any}
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
