import { useState, useCallback, useRef, useEffect } from 'react';
import type { QuestionItem, AttemptItem } from '../types';
import { promptGeminiForOpenQuestionEvaluation } from '../../../../services/gemini';
import { triggerToast } from '../../../../components/ui/ToastContext';
import {
  playQuizSuccessSound,
  playQuizFailureSound,
  playQuizSubmitSound,
} from '../utils/quizSounds';

export function useQuizEvaluation(
  updateSingleQuestion: (qId: string, partial: Partial<QuestionItem>) => void
) {
  const [evaluatingIds, setEvaluatingIds] = useState<Record<string, boolean>>({});

  // Lifecycle guard to cancel state updates if component unmounts during async AI evaluation
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const updateSingleQuestionRef = useRef(updateSingleQuestion);
  updateSingleQuestionRef.current = updateSingleQuestion;

  const evaluatingIdsRef = useRef(evaluatingIds);
  evaluatingIdsRef.current = evaluatingIds;

  const handleEvaluateOpenAnswer = useCallback(
    async (q: QuestionItem) => {
      const typed = q.userTypedAnswer?.trim();
      if (!typed || evaluatingIdsRef.current[q.id]) return;

      playQuizSubmitSound();
      if (isMountedRef.current) {
        setEvaluatingIds((prev) => ({ ...prev, [q.id]: true }));
      }

      try {
        const evaluation = await promptGeminiForOpenQuestionEvaluation(
          q.question || 'Questão sem enunciado',
          q.expectedAnswer || 'Gabarito não cadastrado',
          typed
        );

        if (!isMountedRef.current) return;

        if (evaluation.verdict === 'Correto' || evaluation.verdict === 'Parcial') {
          playQuizSuccessSound();
        } else {
          playQuizFailureSound();
        }

        const newAttempt: AttemptItem = {
          id: `att_${Date.now()}`,
          timestamp: Date.now(),
          type: 'open',
          userTypedAnswer: q.userTypedAnswer || '',
          aiFeedback: evaluation,
        };

        updateSingleQuestionRef.current(q.id, {
          answered: true,
          userTypedAnswer: typed,
          aiFeedback: evaluation,
          showExplanation: true,
          attemptsHistory: [newAttempt, ...(q.attemptsHistory || [])],
        });
      } catch (err: unknown) {
        if (!isMountedRef.current) return;

        console.error('[useQuizEvaluation] Falha ao avaliar resposta aberta:', err);
        const errMsg =
          err instanceof Error
            ? err.message
            : 'Falha na comunicação com a IA ao avaliar a resposta.';
        triggerToast(`Erro na avaliação: ${errMsg}`, 'error', 4500);
      } finally {
        if (isMountedRef.current) {
          setEvaluatingIds((prev) => ({ ...prev, [q.id]: false }));
        }
      }
    },
    []
  );

  return {
    evaluatingIds,
    handleEvaluateOpenAnswer,
  };
}
