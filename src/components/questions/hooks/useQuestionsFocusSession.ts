import { useState, useCallback, useRef } from 'react';
import { getDescendantQuestions } from '../../../services/quiz/quizHierarchy';
import { useQuizEvaluation } from '../../editor-extensions/quiz/hooks/useQuizEvaluation';
import type { BatteryWithQuestions } from '../../../types/quiz';
import type { QuestionItem } from '../../editor-extensions/quiz/types';
import type { GeneratedStudySession } from '../../../services/quiz/quizSimulator';

export interface PlayingSessionState {
  title: string;
  batteryId?: string;
  questions: QuestionItem[];
}

export function useQuestionsFocusSession(batteries: BatteryWithQuestions[], onDataReload: () => Promise<void>) {
  const [activePlayingSession, setActivePlayingSession] = useState<PlayingSessionState | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Stable reference buffer to avoid stale closures & unnecessary re-render thrashing
  const activePlayingSessionRef = useRef(activePlayingSession);
  activePlayingSessionRef.current = activePlayingSession;

  // Launch battery in Focus Mode (cumulatively if battery has sub-batteries)
  const handlePlayBattery = useCallback(
    (battery: BatteryWithQuestions) => {
      const allQuestions = getDescendantQuestions(battery.id, batteries);

      // Build quick lookup for latest attempts across all descendant batteries
      const attemptLookup = new Map();
      for (const b of batteries) {
        if (b.latestAttempts) {
          for (const [qid, attempt] of Object.entries(b.latestAttempts)) {
            attemptLookup.set(qid, attempt);
          }
        }
      }

      const mapped: QuestionItem[] = allQuestions.map((q) => {
        const attempt = attemptLookup.get(q.id) || battery.latestAttempts?.[q.id];
        return {
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options || [],
          correctIndex: q.correct_index,
          tags: q.tags || [],
          selectedIndex: attempt?.selected_index !== undefined ? attempt.selected_index : null,
          userTypedAnswer: attempt?.user_typed_answer || '',
          aiFeedback: attempt?.ai_feedback || null,
          expectedAnswer: q.expected_answer || '',
          explanation: q.explanation || '',
          showExplanation: Boolean(attempt),
          answered: Boolean(attempt),
          batteryId: q.battery_id || battery.id,
        };
      });

      setActiveIndex(0);
      setActivePlayingSession({
        title: battery.title,
        batteryId: battery.id,
        questions: mapped,
      });
    },
    [batteries]
  );

  // Launch generated study session (Caderno de Erros or Simulado)
  const handleStartGeneratedSession = useCallback((session: GeneratedStudySession) => {
    const mapped: QuestionItem[] = session.questions.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options || [],
      correctIndex: q.correct_index,
      tags: q.tags || [],
      selectedIndex: null,
      userTypedAnswer: '',
      aiFeedback: null,
      expectedAnswer: q.expected_answer || '',
      explanation: q.explanation || '',
      showExplanation: false,
      answered: false,
      batteryId: q.battery_id,
    }));

    setActiveIndex(0);
    setActivePlayingSession({
      title: session.battery.title,
      batteryId: session.battery.id,
      questions: mapped,
    });
  }, []);

  // Update single question answer in focus mode (with atomic database attempt save)
  const updateSingleQuestionInFocus = useCallback(
    async (qId: string, partial: Partial<QuestionItem>) => {
      const currentSession = activePlayingSessionRef.current;
      if (!currentSession) return;

      setActivePlayingSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          questions: prev.questions.map((q) => (q.id === qId ? { ...q, ...partial } : q)),
        };
      });

      // Save attempt directly to database only upon genuine completion (prevent keystroke spam on open questions)
      const q = currentSession.questions.find((x) => x.id === qId);
      if (q && window.api?.quiz) {
        const updatedType = q.type;
        const isAttemptUpdate =
          (updatedType === 'multiple_choice' && partial.selectedIndex !== undefined && partial.selectedIndex !== null) ||
          (updatedType === 'open' && ((partial.aiFeedback !== undefined && partial.aiFeedback !== null) || partial.answered === true));

        if (isAttemptUpdate) {
          const updatedIndex = partial.selectedIndex !== undefined ? partial.selectedIndex : q.selectedIndex;
          const updatedTyped = partial.userTypedAnswer !== undefined ? partial.userTypedAnswer : q.userTypedAnswer;
          const updatedFeedback = partial.aiFeedback !== undefined ? partial.aiFeedback : q.aiFeedback;

          const isCorrect =
            updatedType === 'multiple_choice'
              ? updatedIndex === q.correctIndex
              : updatedFeedback?.verdict === 'Correto';

          try {
            await window.api.quiz.saveAttempt({
              question_id: qId,
              battery_id: q.batteryId || currentSession.batteryId || 'generated',
              type: updatedType,
              selected_index: updatedIndex,
              user_typed_answer: updatedTyped,
              is_correct: isCorrect,
              ai_feedback: updatedFeedback,
            });
          } catch (err) {
            console.error('[useQuestionsFocusSession] Falha ao gravar tentativa no banco:', err);
          }
        }
      }
    },
    []
  );

  const updateQuestionsInFocus = useCallback((newQuestions: QuestionItem[]) => {
    setActivePlayingSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        questions: newQuestions,
      };
    });
  }, []);

  const { evaluatingIds, handleEvaluateOpenAnswer } = useQuizEvaluation(updateSingleQuestionInFocus);

  const handleDeleteQuestionInFocus = useCallback(
    async (qId: string) => {
      if (activePlayingSession) {
        const updated = activePlayingSession.questions.filter((q) => q.id !== qId);
        setActivePlayingSession({
          ...activePlayingSession,
          questions: updated,
        });
        if (activePlayingSession.batteryId && window.api?.quiz) {
          try {
            await window.api.quiz.deleteQuestion(qId);
            await onDataReload();
          } catch (err) {
            console.error('[useQuestionsFocusSession] Falha ao excluir questão:', err);
          }
        }
      }
    },
    [activePlayingSession, onDataReload]
  );

  return {
    activePlayingSession,
    setActivePlayingSession,
    activeIndex,
    setActiveIndex,
    handlePlayBattery,
    handleStartGeneratedSession,
    updateSingleQuestionInFocus,
    updateQuestionsInFocus,
    evaluatingIds,
    handleEvaluateOpenAnswer,
    handleDeleteQuestionInFocus,
  };
}
