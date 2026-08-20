import { useState, useCallback, useMemo } from 'react';
import type { QuestionItem } from '../types';
import { createDefaultQuestion } from '../utils/fireworks';
import { preprocessMarkdownCode } from '../utils/markdownPreprocess';
import { normalizeQuizQuestions } from '../utils/quizNormalizer';

export function useQuizState(
  rawQuestions: any,
  title: string | undefined,
  updateAttributes: (attrs: Record<string, any>) => void
) {
  const questions: QuestionItem[] = useMemo(() => {
    return normalizeQuizQuestions(rawQuestions);
  }, [rawQuestions]);

  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const allBatteryTags = useMemo(() => {
    return Array.from(
      new Set(questions.flatMap((q) => q.tags || []))
    ).filter(Boolean);
  }, [questions]);

  const displayedQuestions = useMemo(() => {
    return selectedTagFilter
      ? questions.filter((q) => q.tags?.includes(selectedTagFilter))
      : questions;
  }, [questions, selectedTagFilter]);

  const updateQuestions = useCallback(
    (newQuestions: QuestionItem[]) => {
      const normalized = normalizeQuizQuestions(newQuestions);
      updateAttributes({ questions: normalized });
    },
    [updateAttributes]
  );

  const updateSingleQuestion = useCallback(
    (qId: string, partial: Partial<QuestionItem>) => {
      const updated = questions.map((q) => (q.id === qId ? { ...q, ...partial } : q));
      updateQuestions(updated);
    },
    [questions, updateQuestions]
  );

  const handleToggleQuestionType = useCallback(
    (q: QuestionItem, newType: 'multiple_choice' | 'open') => {
      if (q.type === newType) return;

      const updates: Partial<QuestionItem> = {
        type: newType,
        answered: false,
        selectedIndex: null,
        userTypedAnswer: '',
        aiFeedback: null,
      };

      if (newType === 'multiple_choice') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          updates.options = ['', '', '', ''];
        }
      } else if (newType === 'open') {
        if (!q.expectedAnswer && Array.isArray(q.options) && q.options[q.correctIndex]) {
          updates.expectedAnswer = q.options[q.correctIndex];
        }
      }

      updateSingleQuestion(q.id, updates);
    },
    [updateSingleQuestion]
  );

  const handleAddQuestion = useCallback(() => {
    const newQ = createDefaultQuestion(questions.length + 1);
    updateQuestions([...questions, newQ]);
  }, [questions, updateQuestions]);

  const handleMoveQuestion = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= questions.length) return;

      const newQuestions = [...questions];
      const [moved] = newQuestions.splice(index, 1);
      newQuestions.splice(targetIndex, 0, moved);
      updateQuestions(newQuestions);
    },
    [questions, updateQuestions]
  );

  const handleRemoveQuestion = useCallback(
    (qId: string) => {
      if (questions.length <= 1) {
        updateQuestions([createDefaultQuestion(1)]);
        return;
      }
      updateQuestions(questions.filter((q) => q.id !== qId));
    },
    [questions, updateQuestions]
  );

  const handleCopyQuestionsJson = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const exportData = {
        battery_title: title || 'Bateria de Exercícios',
        total_questions: questions.length,
        questions: questions.map((q, idx) => {
          if (q.type === 'multiple_choice') {
            return {
              index: idx + 1,
              type: 'multiple_choice',
              question: q.question,
              options: (q.options || []).map(
                (opt, oIdx) => `${String.fromCharCode(65 + oIdx)}) ${preprocessMarkdownCode(opt)}`
              ),
              correct_option: `${String.fromCharCode(65 + (q.correctIndex || 0))}) ${
                q.options?.[q.correctIndex] || ''
              }`,
              tags: q.tags && q.tags.length > 0 ? q.tags : undefined,
              explanation: q.explanation || undefined,
            };
          } else {
            return {
              index: idx + 1,
              type: 'open',
              question: q.question,
              expected_answer: q.expectedAnswer,
              tags: q.tags && q.tags.length > 0 ? q.tags : undefined,
              explanation: q.explanation || undefined,
            };
          }
        }),
      };

      navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    },
    [title, questions]
  );

  return {
    questions,
    displayedQuestions,
    selectedTagFilter,
    setSelectedTagFilter,
    allBatteryTags,
    copiedJson,
    updateQuestions,
    updateSingleQuestion,
    handleToggleQuestionType,
    handleAddQuestion,
    handleMoveQuestion,
    handleRemoveQuestion,
    handleCopyQuestionsJson,
  };
}
