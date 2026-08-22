import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { QuestionItem } from '../types';
import { createDefaultQuestion } from '../utils/fireworks';
import { preprocessMarkdownCode } from '../utils/markdownPreprocess';
import { normalizeQuizQuestions } from '../utils/quizNormalizer';
import { triggerToast } from '../../../ui/ToastContext';

export function useQuizState(
  rawQuestions: any,
  title: string | undefined,
  updateAttributes: (attrs: Record<string, any>) => void
) {
  // Local state for responsive rendering without TipTap/Yjs transaction latency
  const [localQuestions, setLocalQuestions] = useState<QuestionItem[]>(() =>
    normalizeQuizQuestions(rawQuestions)
  );

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInternalUpdateRef = useRef(false);

  // Syncs if external value changes from undo/redo or remote collaboration
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }
    const incoming = normalizeQuizQuestions(rawQuestions);
    setLocalQuestions(incoming);
  }, [rawQuestions]);

  // Centralized TipTap synchronization (debounced for continuous typing, immediate for clicks)
  const syncToTipTap = useCallback(
    (newQuestions: QuestionItem[], immediate: boolean = false) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }

      const normalized = normalizeQuizQuestions(newQuestions);

      if (immediate) {
        isInternalUpdateRef.current = true;
        updateAttributes({ questions: normalized });
      } else {
        debounceTimeoutRef.current = setTimeout(() => {
          isInternalUpdateRef.current = true;
          updateAttributes({ questions: normalized });
        }, 300);
      }
    },
    [updateAttributes]
  );

  // Limpeza de timers ao desmontar
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const allBatteryTags = useMemo(() => {
    return Array.from(
      new Set(localQuestions.flatMap((q) => q.tags || []))
    ).filter(Boolean);
  }, [localQuestions]);

  const displayedQuestions = useMemo(() => {
    return selectedTagFilter
      ? localQuestions.filter((q) => q.tags?.includes(selectedTagFilter))
      : localQuestions;
  }, [localQuestions, selectedTagFilter]);

  const updateQuestions = useCallback(
    (newQuestions: QuestionItem[], immediate: boolean = true) => {
      setLocalQuestions(newQuestions);
      syncToTipTap(newQuestions, immediate);
    },
    [syncToTipTap]
  );

  const updateSingleQuestion = useCallback(
    (qId: string, partial: Partial<QuestionItem>, immediate: boolean = false) => {
      setLocalQuestions((prev) => {
        const updated = prev.map((q) => (q.id === qId ? { ...q, ...partial } : q));
        syncToTipTap(updated, immediate);
        return updated;
      });
    },
    [syncToTipTap]
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

      updateSingleQuestion(q.id, updates, true);
    },
    [updateSingleQuestion]
  );

  const handleAddQuestion = useCallback(() => {
    const newQ = createDefaultQuestion(localQuestions.length + 1);
    updateQuestions([...localQuestions, newQ], true);
  }, [localQuestions, updateQuestions]);

  const handleMoveQuestion = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= localQuestions.length) return;

      const newQuestions = [...localQuestions];
      const [moved] = newQuestions.splice(index, 1);
      newQuestions.splice(targetIndex, 0, moved);
      updateQuestions(newQuestions, true);
    },
    [localQuestions, updateQuestions]
  );

  const handleRemoveQuestion = useCallback(
    (qId: string) => {
      if (localQuestions.length <= 1) {
        updateQuestions([createDefaultQuestion(1)], true);
        return;
      }
      updateQuestions(localQuestions.filter((q) => q.id !== qId), true);
    },
    [localQuestions, updateQuestions]
  );

  const handleCopyQuestionsJson = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const exportData = {
        battery_title: title || 'Bateria de Exercícios',
        total_questions: localQuestions.length,
        questions: localQuestions.map((q, idx) => {
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

      try {
        await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
        setCopiedJson(true);
        triggerToast('Bateria de questões exportada em JSON com sucesso!', 'success', 2000);
        setTimeout(() => setCopiedJson(false), 2000);
      } catch (err: any) {
        console.error('Falha ao copiar JSON da bateria:', err);
        triggerToast('Não foi possível copiar o JSON para a área de transferência.', 'error', 3000);
      }
    },
    [title, localQuestions]
  );

  return {
    questions: localQuestions,
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
