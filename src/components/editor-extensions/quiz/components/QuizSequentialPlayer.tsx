import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { triggerFireworksAnimation } from '../utils/fireworks';
import { QuizSummaryView } from './sequential/QuizSummaryView';
import { QuizSequentialHeader } from './sequential/QuizSequentialHeader';
import { QuizSequentialCard } from './sequential/QuizSequentialCard';
import type { QuestionItem } from '../types';

interface QuizSequentialPlayerProps {
  questions: QuestionItem[];
  onUpdateSingleQuestion: (qId: string, partial: Partial<QuestionItem>, immediate?: boolean) => void;
  onEvaluateOpenAnswer: (q: QuestionItem, index: number) => Promise<void> | void;
  evaluatingIds: Record<string, boolean>;
  onDiscussInChat: (q: QuestionItem, index: number) => void;
  onSwitchToListLayout?: () => void;
}

export default function QuizSequentialPlayer({
  questions,
  onUpdateSingleQuestion,
  onEvaluateOpenAnswer,
  evaluatingIds,
  onDiscussInChat,
  onSwitchToListLayout,
}: QuizSequentialPlayerProps) {
  const safeQuestions = Array.isArray(questions) ? questions : [];
  const total = safeQuestions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSummaryView, setShowSummaryView] = useState(false);

  // Ensures index remains within valid question bounds
  const activeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, total - 1));
  const currentQ = safeQuestions[activeIndex];

  const answeredCount = safeQuestions.filter((q) => q.answered).length;
  const correctCount = safeQuestions.filter((q) => {
    if (!q.answered) return false;
    if (q.type === 'multiple_choice') return q.selectedIndex === q.correctIndex;
    return q.aiFeedback?.verdict === 'Correto';
  }).length;

  const hitPercentage = answeredCount > 0 ? Math.round((correctCount / total) * 100) : 0;
  const allAnswered = total > 0 && answeredCount === total;

  // Triggers celebration when all questions are answered with high score
  useEffect(() => {
    if (allAnswered && hitPercentage >= 80) {
      triggerFireworksAnimation();
    }
  }, [allAnswered, hitPercentage]);

  const handleNext = () => {
    if (activeIndex < total - 1) {
      setCurrentIndex(activeIndex + 1);
    } else {
      setShowSummaryView(true);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setCurrentIndex(activeIndex - 1);
    }
  };

  const handleSelectOption = (optIndex: number) => {
    if (!currentQ || currentQ.answered) return;

    onUpdateSingleQuestion(
      currentQ.id,
      {
        selectedIndex: optIndex,
        answered: true,
        showExplanation: true,
      },
      true
    );
  };

  const handleResetCurrent = () => {
    if (!currentQ) return;
    onUpdateSingleQuestion(
      currentQ.id,
      {
        answered: false,
        selectedIndex: null as any,
        userTypedAnswer: '',
        aiFeedback: null as any,
        showExplanation: false,
      },
      true
    );
  };

  const handleResetAll = () => {
    safeQuestions.forEach((q) => {
      onUpdateSingleQuestion(
        q.id,
        {
          answered: false,
          selectedIndex: null as any,
          userTypedAnswer: '',
          aiFeedback: null as any,
          showExplanation: false,
        },
        true
      );
    });
    setCurrentIndex(0);
    setShowSummaryView(false);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

      if (showSummaryView) return;

      if (e.key === 'ArrowRight' && (e.altKey || !isInput)) {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' && (e.altKey || !isInput)) {
        e.preventDefault();
        handlePrev();
      } else if (!isInput && !currentQ?.answered && currentQ?.type === 'multiple_choice') {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= (currentQ.options?.length || 0)) {
          e.preventDefault();
          handleSelectOption(num - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSummaryView, activeIndex, total, currentQ]);

  if (total === 0 || !currentQ) {
    return (
      <div className="p-8 text-center text-dark-subtext border border-white/10 rounded-2xl bg-dark-bg/40">
        <HelpCircle size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhuma questão encontrada para este teste.</p>
      </div>
    );
  }

  // SUMMARY & REVIEW VIEW
  if (showSummaryView) {
    return (
      <QuizSummaryView
        safeQuestions={safeQuestions}
        total={total}
        correctCount={correctCount}
        hitPercentage={hitPercentage}
        onResetAll={handleResetAll}
        onSelectQuestion={(idx) => {
          setShowSummaryView(false);
          setCurrentIndex(idx);
        }}
        onSwitchToListLayout={onSwitchToListLayout}
      />
    );
  }

  // SEQUENTIAL PRACTICE VIEW (FOCUSED QUESTION)
  const isEvaluating = evaluatingIds[currentQ.id] || false;
  const isOpenType = currentQ.type === 'open';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Progress bar and Steppers */}
      <QuizSequentialHeader
        safeQuestions={safeQuestions}
        activeIndex={activeIndex}
        total={total}
        isOpenType={isOpenType}
        answeredCount={answeredCount}
        correctCount={correctCount}
        onSelectIndex={(idx) => setCurrentIndex(idx)}
      />

      {/* Card da Questão Atual */}
      <QuizSequentialCard
        currentQ={currentQ}
        activeIndex={activeIndex}
        isEvaluating={isEvaluating}
        isOpenType={isOpenType}
        onSelectOption={handleSelectOption}
        onUpdateSingleQuestion={onUpdateSingleQuestion}
        onEvaluateOpenAnswer={onEvaluateOpenAnswer}
        onDiscussInChat={onDiscussInChat}
      />

      {/* Navigation Footer */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          onClick={handlePrev}
          disabled={activeIndex === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-dark-subtext hover:text-white border border-white/10 rounded-xl text-xs font-medium transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Anterior</span>
        </button>

        <div className="flex items-center gap-2">
          {currentQ.answered && (
            <button
              onClick={handleResetCurrent}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white border border-white/10 rounded-xl text-xs transition-colors"
              title="Tentar responder esta questão novamente"
            >
              <RotateCcw size={13} />
              <span>Tentar Novamente</span>
            </button>
          )}

          <button
            onClick={handleNext}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-md ${
              currentQ.answered
                ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/20 ring-2 ring-brand-500/30'
                : 'bg-white/10 hover:bg-white/15 text-white'
            }`}
          >
            <span>{activeIndex === total - 1 ? 'Finalizar Bateria' : 'Próxima Questão'}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
