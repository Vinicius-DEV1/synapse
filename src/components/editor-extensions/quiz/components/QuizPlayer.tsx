import { useRef, useEffect, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { triggerFireworksAnimation } from '../utils/fireworks';
import { QuizPlayerCard } from './QuizPlayerCard';
import type { QuestionItem } from '../types';

interface QuizPlayerProps {
  questions: QuestionItem[];
  onUpdateSingleQuestion: (qId: string, partial: Partial<QuestionItem>, immediate?: boolean) => void;
  onEvaluateOpenAnswer: (q: QuestionItem, index: number) => Promise<void> | void;
  evaluatingIds: Record<string, boolean>;
  onDiscussInChat: (q: QuestionItem, index: number) => void;
}

export default function QuizPlayer({
  questions,
  onUpdateSingleQuestion,
  onEvaluateOpenAnswer,
  evaluatingIds,
  onDiscussInChat,
}: QuizPlayerProps) {
  const safeQuestions = Array.isArray(questions) ? questions : [];

  // Single-pass O(N) calculation of quiz metrics to prevent multiple array allocations on each render
  const { answeredCount, correctCount } = useMemo(() => {
    let answered = 0;
    let correct = 0;
    for (let i = 0; i < safeQuestions.length; i++) {
      const q = safeQuestions[i];
      if (q.answered) {
        answered++;
        if (q.type === 'multiple_choice') {
          if (q.selectedIndex === q.correctIndex) correct++;
        } else if (q.aiFeedback?.verdict === 'Correto') {
          correct++;
        }
      }
    }
    return { answeredCount: answered, correctCount: correct };
  }, [safeQuestions]);

  const prevAnsweredRef = useRef(0);
  const celebratedRef = useRef(false);

  // Fireworks celebration effect triggered on high score completion (>= 80%)
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const isCompleted =
      safeQuestions.length > 0 &&
      answeredCount === safeQuestions.length &&
      prevAnsweredRef.current < safeQuestions.length;

    if (isCompleted && !celebratedRef.current) {
      const hitRatio = correctCount / safeQuestions.length;
      if (hitRatio >= 0.8 && correctCount > 0) {
        celebratedRef.current = true;
        cleanup = triggerFireworksAnimation();
      }
    }
    prevAnsweredRef.current = answeredCount;

    return () => {
      if (cleanup) cleanup();
    };
  }, [answeredCount, correctCount, safeQuestions.length]);

  return (
    <div className="space-y-6">
      {/* Barra de Progresso / Desempenho */}
      <div className="p-3 md:p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-white/90">
            <span className="text-dark-subtext">Progresso:</span>
            <span className="font-mono text-white font-semibold">
              {answeredCount}/{safeQuestions.length}
            </span>
          </div>
          {answeredCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
              <span className="text-dark-subtext font-normal">• Acertos:</span>
              <span className="font-mono font-semibold">{correctCount}</span>
              <span className="text-[10px] opacity-70">
                ({Math.round((correctCount / answeredCount) * 100)}%)
              </span>
            </div>
          )}
        </div>

        {answeredCount > 0 && (
          <button
            onClick={() => {
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
            }}
            className="flex items-center gap-1.5 text-xs text-dark-subtext hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-colors"
          >
            <RotateCcw size={12} />
            <span>Refazer Bateria</span>
          </button>
        )}
      </div>

      {/* Lista de Questões Memoizadas */}
      {safeQuestions.map((q, qIndex) => (
        <QuizPlayerCard
          key={q.id}
          q={q}
          qIndex={qIndex}
          isEvaluating={evaluatingIds[q.id] || false}
          onUpdateSingleQuestion={onUpdateSingleQuestion}
          onEvaluateOpenAnswer={onEvaluateOpenAnswer}
          onDiscussInChat={onDiscussInChat}
        />
      ))}
    </div>
  );
}
