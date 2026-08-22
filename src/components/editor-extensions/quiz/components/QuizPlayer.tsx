import { useRef, useEffect } from 'react';
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
  const answeredCount = safeQuestions.filter((q) => q.answered).length;
  const correctCount = safeQuestions.filter((q) => {
    if (!q.answered) return false;
    if (q.type === 'multiple_choice') return q.selectedIndex === q.correctIndex;
    return q.aiFeedback?.verdict === 'Correto';
  }).length;

  const prevAnsweredRef = useRef(0);

  // Fireworks celebration effect triggered on high score completion (>= 80%)
  useEffect(() => {
    const isCompleted =
      safeQuestions.length > 0 &&
      answeredCount === safeQuestions.length &&
      prevAnsweredRef.current < safeQuestions.length;

    if (isCompleted) {
      const hitRatio = correctCount / safeQuestions.length;
      if (hitRatio >= 0.8 && correctCount > 0) {
        triggerFireworksAnimation();
      }
    }
    prevAnsweredRef.current = answeredCount;
  }, [answeredCount, correctCount, safeQuestions.length]);

  return (
    <div className="space-y-6">
      {/* Barra de Progresso / Desempenho */}
      <div className="p-4 bg-black/40 border border-purple-500/20 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-200">
            <span>Progresso:</span>
            <span className="font-mono text-purple-400">
              {answeredCount}/{safeQuestions.length}
            </span>
          </div>
          {answeredCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-green-300">
              <span>• Acertos:</span>
              <span className="font-mono">{correctCount}</span>
              <span className="text-[10px] opacity-70">
                ({Math.round((correctCount / answeredCount) * 100)}%)
              </span>
            </div>
          )}
        </div>

        {answeredCount > 0 && (
          <button
            onClick={() => {
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
            className="flex items-center gap-1.5 text-xs text-dark-subtext hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors"
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
