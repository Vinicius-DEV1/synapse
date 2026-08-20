import { useState, useCallback } from 'react';
import type { QuestionItem, AttemptItem } from '../types';
import { promptGeminiForOpenQuestionEvaluation } from '../../../../services/gemini';
import { triggerToast } from '../../../../components/ui/ToastContext';

export function useQuizEvaluation(
  updateSingleQuestion: (qId: string, partial: Partial<QuestionItem>) => void
) {
  const [evaluatingIds, setEvaluatingIds] = useState<Record<string, boolean>>({});

  const handleEvaluateOpenAnswer = useCallback(
    async (q: QuestionItem) => {
      if (!q.userTypedAnswer.trim() || evaluatingIds[q.id]) return;

      setEvaluatingIds((prev) => ({ ...prev, [q.id]: true }));
      try {
        const evaluation = await promptGeminiForOpenQuestionEvaluation(
          q.question || 'Questão sem enunciado',
          q.expectedAnswer || 'Gabarito não cadastrado',
          q.userTypedAnswer
        );

        const newAttempt: AttemptItem = {
          id: `att_${Date.now()}`,
          timestamp: Date.now(),
          type: 'open',
          userTypedAnswer: q.userTypedAnswer,
          aiFeedback: evaluation,
        };

        updateSingleQuestion(q.id, {
          answered: true,
          aiFeedback: evaluation,
          showExplanation: true,
          attemptsHistory: [newAttempt, ...(q.attemptsHistory || [])],
        });
      } catch (err: any) {
        console.error('[QuestionBlock] Falha ao avaliar resposta aberta:', err);
        const errMsg =
          err?.message || 'Falha na comunicação com a IA ao avaliar a resposta.';
        triggerToast(`Erro na avaliação: ${errMsg}`, 'error', 4500);
      } finally {
        setEvaluatingIds((prev) => ({ ...prev, [q.id]: false }));
      }
    },
    [evaluatingIds, updateSingleQuestion]
  );

  return {
    evaluatingIds,
    handleEvaluateOpenAnswer,
  };
}
