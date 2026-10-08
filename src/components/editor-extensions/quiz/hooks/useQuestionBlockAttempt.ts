import { useCallback, useRef } from 'react';
import { useQuizEvaluation } from './useQuizEvaluation';
import type { QuestionItem } from '../types';

export function useQuestionBlockAttempt(
  questions: QuestionItem[],
  setQuestions: React.Dispatch<React.SetStateAction<QuestionItem[]>>,
  batteryId: string | null,
  rawBatteryId?: string
) {
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const batteryIdRef = useRef(batteryId || rawBatteryId);
  batteryIdRef.current = batteryId || rawBatteryId;

  // Update single question handler (used in Focus Mode)
  const updateSingleQuestion = useCallback(
    async (qId: string, partial: Partial<QuestionItem>) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === qId ? { ...q, ...partial } : q))
      );

      // Persist attempt atomically to DB only upon genuine completion (prevent keystroke spam on open questions)
      const targetQuestion = questionsRef.current.find((q) => q.id === qId);
      const bId = batteryIdRef.current;

      if (bId && targetQuestion && window.api?.quiz) {
        // Persist question content edits (e.g. from AI assistant or manual edit)
        const isContentUpdate =
          partial.question !== undefined ||
          partial.options !== undefined ||
          partial.correctIndex !== undefined ||
          partial.expectedAnswer !== undefined ||
          partial.explanation !== undefined ||
          partial.type !== undefined ||
          partial.tags !== undefined;

        if (isContentUpdate) {
          try {
            await window.api.quiz.saveQuestion({
              id: qId,
              battery_id: bId,
              question: partial.question ?? targetQuestion.question,
              options: partial.options ?? targetQuestion.options,
              correct_index: partial.correctIndex ?? targetQuestion.correctIndex,
              expected_answer: partial.expectedAnswer ?? targetQuestion.expectedAnswer,
              explanation: partial.explanation ?? targetQuestion.explanation,
              type: partial.type ?? targetQuestion.type,
              tags: partial.tags ?? targetQuestion.tags,
            });
          } catch (err) {
            console.error('[useQuestionBlockAttempt] Falha ao salvar edição de questão no banco:', err);
          }
        }

        const updatedType = targetQuestion.type;
        const isAttemptUpdate =
          (updatedType === 'multiple_choice' && partial.selectedIndex !== undefined && partial.selectedIndex !== null) ||
          (updatedType === 'open' && ((partial.aiFeedback !== undefined && partial.aiFeedback !== null) || partial.answered === true));

        if (isAttemptUpdate) {
          const updatedIndex = partial.selectedIndex !== undefined ? partial.selectedIndex : targetQuestion.selectedIndex;
          const updatedTyped = partial.userTypedAnswer !== undefined ? partial.userTypedAnswer : targetQuestion.userTypedAnswer;
          const updatedFeedback = partial.aiFeedback !== undefined ? partial.aiFeedback : targetQuestion.aiFeedback;

          const isCorrect =
            updatedType === 'multiple_choice'
              ? updatedIndex === targetQuestion.correctIndex
              : updatedFeedback?.verdict === 'Correto';

          try {
            await window.api.quiz.saveAttempt({
              question_id: qId,
              battery_id: bId,
              type: updatedType,
              selected_index: updatedIndex,
              user_typed_answer: updatedTyped,
              is_correct: isCorrect,
              ai_feedback: updatedFeedback,
            });
          } catch (err) {
            console.error('[useQuestionBlockAttempt] Falha ao persistir tentativa no banco:', err);
          }
        }
      }
    },
    [setQuestions]
  );

  const { evaluatingIds, handleEvaluateOpenAnswer } = useQuizEvaluation(updateSingleQuestion);

  return {
    updateSingleQuestion,
    evaluatingIds,
    handleEvaluateOpenAnswer,
  };
}
