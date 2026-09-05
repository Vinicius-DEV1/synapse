import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  HelpCircle,
} from 'lucide-react';
import { triggerFireworksAnimation } from '../utils/fireworks';
import { playQuizSuccessSound, playQuizFailureSound } from '../utils/quizSounds';
import { QuizSummaryView } from './sequential/QuizSummaryView';
import { QuizSequentialHeader } from './sequential/QuizSequentialHeader';
import { QuizSequentialCard } from './sequential/QuizSequentialCard';
import { QuizFinishConfirmModal } from './sequential/QuizFinishConfirmModal';
import type { QuestionItem } from '../types';

interface QuizSequentialPlayerProps {
  questions: QuestionItem[];
  onUpdateSingleQuestion: (qId: string, partial: Partial<QuestionItem>, immediate?: boolean) => void;
  onEvaluateOpenAnswer: (q: QuestionItem, index: number) => Promise<void> | void;
  evaluatingIds: Record<string, boolean>;
  onDiscussInChat: (q: QuestionItem, index: number) => void;
  onSwitchToListLayout?: () => void;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
}

export default function QuizSequentialPlayer({
  questions,
  onUpdateSingleQuestion,
  onEvaluateOpenAnswer,
  evaluatingIds,
  onDiscussInChat,
  onSwitchToListLayout,
  activeIndex: activeIndexProp,
  onActiveIndexChange,
}: QuizSequentialPlayerProps) {
  const safeQuestions = Array.isArray(questions) ? questions : [];
  const total = safeQuestions.length;

  const [internalIndex, setInternalIndex] = useState(0);
  const isControlled = typeof activeIndexProp === 'number';
  const currentIndex = isControlled ? activeIndexProp : internalIndex;

  const setCurrentIndex = useCallback(
    (updater: number | ((prev: number) => number)) => {
      const nextVal = typeof updater === 'function' ? updater(currentIndex) : updater;
      if (onActiveIndexChange) {
        onActiveIndexChange(nextVal);
      }
      if (!isControlled) {
        setInternalIndex(nextVal);
      }
    },
    [currentIndex, isControlled, onActiveIndexChange]
  );

  const [showSummaryView, setShowSummaryView] = useState(false);
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);

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

  const prevAnsweredRef = useRef(answeredCount);
  const celebratedRef = useRef(false);

  // Triggers celebration when all questions are answered with high score (>= 80%)
  // only upon genuine completion transition, and properly cleans up on unmount
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const isCompleted = total > 0 && answeredCount === total && prevAnsweredRef.current < total;

    if (isCompleted && !celebratedRef.current && hitPercentage >= 80 && correctCount > 0) {
      celebratedRef.current = true;
      cleanup = triggerFireworksAnimation();
    }

    prevAnsweredRef.current = answeredCount;

    return () => {
      if (cleanup) cleanup();
    };
  }, [allAnswered, answeredCount, total, hitPercentage, correctCount]);

  // Unified navigation helper: closes explanation on current question and target question
  const goToQuestion = useCallback(
    (targetIndex: number) => {
      const bounded = Math.min(Math.max(0, targetIndex), Math.max(0, total - 1));
      if (bounded === activeIndex) return;

      // Close explanation on the question being left behind
      if (currentQ?.showExplanation) {
        onUpdateSingleQuestion(currentQ.id, { showExplanation: false }, true);
      }
      // Also ensure target question explanation is not open upon arriving
      const targetQ = safeQuestions[bounded];
      if (targetQ?.showExplanation) {
        onUpdateSingleQuestion(targetQ.id, { showExplanation: false }, true);
      }

      setCurrentIndex(bounded);
    },
    [activeIndex, currentQ, safeQuestions, onUpdateSingleQuestion, setCurrentIndex, total]
  );

  // Auto-close explanation if active question transitions by any external prop update
  const prevActiveQuestionIdRef = useRef<string | null>(currentQ?.id || null);

  useEffect(() => {
    const prevId = prevActiveQuestionIdRef.current;
    const currentId = currentQ?.id;

    if (prevId && currentId && prevId !== currentId) {
      const prevQ = safeQuestions.find((q) => q.id === prevId);
      if (prevQ?.showExplanation) {
        onUpdateSingleQuestion(prevQ.id, { showExplanation: false }, true);
      }
      if (currentQ?.showExplanation) {
        onUpdateSingleQuestion(currentQ.id, { showExplanation: false }, true);
      }
    }
    prevActiveQuestionIdRef.current = currentId || null;
  }, [currentQ?.id, safeQuestions, onUpdateSingleQuestion]);

  const handleSelectOption = useCallback(
    (optIndex: number) => {
      if (!currentQ || currentQ.answered) return;
      const isCorrect = optIndex === currentQ.correctIndex;
      if (isCorrect) {
        playQuizSuccessSound();
      } else {
        playQuizFailureSound();
      }
      onUpdateSingleQuestion(
        currentQ.id,
        {
          selectedIndex: optIndex,
          answered: true,
          showExplanation: true,
        },
        true
      );
    },
    [currentQ, onUpdateSingleQuestion]
  );

  const handleNext = useCallback(() => {
    if (activeIndex < total - 1) {
      goToQuestion(activeIndex + 1);
    } else {
      setShowFinishConfirmModal(true);
    }
  }, [activeIndex, total, goToQuestion]);

  const handlePrev = useCallback(() => {
    if (activeIndex > 0) {
      goToQuestion(activeIndex - 1);
    }
  }, [activeIndex, goToQuestion]);

  const handleConfirmFinish = useCallback(() => {
    setShowFinishConfirmModal(false);
    setShowSummaryView(true);
  }, []);

  const handleCancelFinish = useCallback(() => {
    setShowFinishConfirmModal(false);
  }, []);

  const handleResetCurrent = useCallback(() => {
    if (!currentQ) return;
    celebratedRef.current = false;
    onUpdateSingleQuestion(
      currentQ.id,
      {
        answered: false,
        selectedIndex: null,
        userTypedAnswer: '',
        aiFeedback: null,
        showExplanation: false,
      },
      true
    );
  }, [currentQ, onUpdateSingleQuestion]);

  const handleResetAll = useCallback(() => {
    celebratedRef.current = false;
    prevAnsweredRef.current = 0;
    safeQuestions.forEach((q) => {
      onUpdateSingleQuestion(
        q.id,
        {
          answered: false,
          selectedIndex: null,
          userTypedAnswer: '',
          aiFeedback: null,
          showExplanation: false,
        },
        true
      );
    });
    setCurrentIndex(0);
    setShowFinishConfirmModal(false);
    setShowSummaryView(false);
  }, [safeQuestions, onUpdateSingleQuestion, setCurrentIndex]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the sequential player container on mount / question transition if no input is actively focused
    const timer = setTimeout(() => {
      const active = document.activeElement;
      const isInputFocused =
        active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
      if (!isInputFocused) {
        containerRef.current?.focus();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [activeIndex]);

  // Local keyboard navigation shortcuts — strictly isolated to this widget instance
  const handleContainerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

      if (showSummaryView || showFinishConfirmModal || !currentQ) return;

      const keyLower = e.key.toLowerCase();
      const isGKey = keyLower === 'g';
      const hasOptionG = Boolean(
        currentQ.type === 'multiple_choice' &&
        currentQ.options &&
        currentQ.options.length > 6
      );

      // Gabarito / Explicação toggle:
      // 1. Alt+G or Ctrl+G always toggles (even if typing or if option G exists)
      // 2. Plain 'G' / 'g' toggles if not typing in an input/textarea and question has no option 'G'
      if ((isGKey && (e.altKey || e.ctrlKey)) || (isGKey && !isInput && !hasOptionG)) {
        e.preventDefault();
        e.stopPropagation();
        onUpdateSingleQuestion(
          currentQ.id,
          { showExplanation: !currentQ.showExplanation },
          true
        );
        return;
      }

      const isNextKey = e.key === 'ArrowRight' || (!isInput && e.key === '>');
      const isPrevKey = e.key === 'ArrowLeft' || (!isInput && e.key === '<');

      if (isNextKey && (e.altKey || !isInput)) {
        e.preventDefault();
        e.stopPropagation();
        handleNext();
      } else if (isPrevKey && (e.altKey || !isInput)) {
        e.preventDefault();
        e.stopPropagation();
        handlePrev();
      } else if (!isInput && !currentQ.answered && currentQ.type === 'multiple_choice') {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= (currentQ.options?.length || 0)) {
          e.preventDefault();
          e.stopPropagation();
          handleSelectOption(num - 1);
          return;
        }

        // Letter selection (A-D / a-d)
        if (keyLower.length === 1 && keyLower >= 'a' && keyLower <= 'z' && !e.altKey && !e.ctrlKey) {
          const letterIndex = keyLower.charCodeAt(0) - 97;
          if (letterIndex >= 0 && letterIndex < (currentQ.options?.length || 0)) {
            e.preventDefault();
            e.stopPropagation();
            handleSelectOption(letterIndex);
            return;
          }
        }
      } else if (!isInput && currentQ.answered) {
        // Fast progression: Enter or Space to advance to next question
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          handleNext();
          return;
        }
      }
    },
    [showSummaryView, showFinishConfirmModal, currentQ, handleNext, handlePrev, handleSelectOption, onUpdateSingleQuestion]
  );

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
          goToQuestion(idx);
        }}
        onSwitchToListLayout={onSwitchToListLayout}
      />
    );
  }

  // SEQUENTIAL PRACTICE VIEW (FOCUSED QUESTION)
  const isEvaluating = evaluatingIds[currentQ.id] || false;
  const isOpenType = currentQ.type === 'open';

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleContainerKeyDown}
      className="space-y-2.5 animate-fade-in focus:outline-none"
    >
      {/* Progress bar and Steppers */}
      <QuizSequentialHeader
        safeQuestions={safeQuestions}
        activeIndex={activeIndex}
        total={total}
        isOpenType={isOpenType}
        answeredCount={answeredCount}
        correctCount={correctCount}
        onSelectIndex={(idx) => goToQuestion(idx)}
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
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <button
          onClick={handlePrev}
          disabled={activeIndex === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-dark-subtext hover:text-white border border-white/10 rounded-lg text-xs font-medium transition-colors"
        >
          <ChevronLeft size={14} />
          <span>Anterior</span>
        </button>

        <div className="flex items-center gap-2">
          {currentQ.answered && (
            <button
              onClick={handleResetCurrent}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white border border-white/10 rounded-lg text-xs transition-colors"
              title="Tentar responder esta questão novamente"
            >
              <RotateCcw size={12} />
              <span>Tentar Novamente</span>
            </button>
          )}

          <button
            onClick={handleNext}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
              currentQ.answered
                ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/20 ring-1 ring-brand-500/30'
                : 'bg-white/10 hover:bg-white/15 text-white'
            }`}
          >
            <span>{activeIndex === total - 1 ? 'Finalizar Bateria' : 'Próxima Questão'}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Confirmation Modal when arriving at last question and proceeding */}
      <QuizFinishConfirmModal
        isOpen={showFinishConfirmModal}
        total={total}
        answeredCount={answeredCount}
        onCancel={handleCancelFinish}
        onConfirm={handleConfirmFinish}
      />
    </div>
  );
}
