import { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeQuizQuestions } from '../utils/quizNormalizer';
import type { QuestionItem } from '../types';
import type { QuizQuestion } from '../../../../types/quiz';
import type { Tab } from '../../../../types';
import { useStoreSelector, getStoreState } from '../../../../store/useStore';

interface UseQuestionBlockSyncProps {
  rawBatteryId?: string;
  rawQuestions?: unknown[];
  title: string;
  description: string;
  cachedTitle?: string;
  cachedCount?: number;
  cachedTags?: string[];
  updateAttributes: (attrs: Record<string, unknown>) => void;
}

export function useQuestionBlockSync({
  rawBatteryId,
  rawQuestions,
  title,
  description,
  cachedTitle,
  cachedCount,
  cachedTags,
  updateAttributes,
}: UseQuestionBlockSyncProps) {
  const [batteryId, setBatteryId] = useState<string | null>(rawBatteryId || null);
  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    if (rawQuestions && Array.isArray(rawQuestions) && rawQuestions.length > 0) {
      return normalizeQuizQuestions(rawQuestions as QuestionItem[]);
    }
    return [];
  });

  const isMigratingRef = useRef(false);
  const updateAttributesRef = useRef(updateAttributes);
  updateAttributesRef.current = updateAttributes;

  const nodeViewMountedRef = useRef(true);
  useEffect(() => {
    nodeViewMountedRef.current = true;
    return () => {
      nodeViewMountedRef.current = false;
    };
  }, []);

  // Auto-migration on mount for legacy unmigrated nodes
  useEffect(() => {
    if (rawBatteryId || isMigratingRef.current) return;
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) return;

    isMigratingRef.current = true;
    let isMounted = true;

    async function handleAutoMigration() {
      if (window.api?.quiz) {
        const normalized = normalizeQuizQuestions(rawQuestions as QuestionItem[]);
        const tags = Array.from(new Set(normalized.flatMap((q) => q.tags || [])));

        const state = getStoreState();
        const activeTab = state.tabs.find((t: Tab) => t.id === state.activeTabId);
        const currentPageId = activeTab?.pageId;

        try {
          const savedBattery = await window.api.quiz.saveBattery({
            title,
            description,
            page_id: currentPageId || undefined,
            layout: 'sequential',
            tags,
          });

          if (currentPageId) {
            await window.api.quiz.linkBatteryToPage(savedBattery.id, currentPageId);
          }

          const questionsToBatch = normalized.map((q, idx) => ({
            id: q.id,
            battery_id: savedBattery.id,
            type: q.type,
            question: q.question,
            options: q.options,
            correct_index: q.correctIndex,
            expected_answer: q.expectedAnswer,
            explanation: q.explanation,
            tags: q.tags || [],
            sort_order: idx + 1,
          }));

          await window.api.quiz.saveQuestionsBatch(questionsToBatch);

          if (isMounted) {
            setBatteryId(savedBattery.id);
            updateAttributesRef.current({
              batteryId: savedBattery.id,
              cachedTitle: savedBattery.title,
              cachedCount: questionsToBatch.length,
              cachedTags: tags,
              questions: undefined,
              aiChatHistory: undefined,
            });
          }
        } catch (err) {
          isMigratingRef.current = false;
          console.warn('[useQuestionBlockSync] Falha na migração automática de nó legado:', err);
        }
      }
    }

    handleAutoMigration();
    return () => {
      isMounted = false;
    };
  }, [rawBatteryId, rawQuestions, title, description]);

  // On-demand lazy loader: fetches full questions & attempts from DB only when requested (e.g. entering Focus Mode)
  const hasLoadedQuestionsRef = useRef(false);
  const isFetchingQuestionsRef = useRef(false);
  const cachedTitleRef = useRef(cachedTitle);
  cachedTitleRef.current = cachedTitle;
  const cachedCountRef = useRef(cachedCount);
  cachedCountRef.current = cachedCount;
  const cachedTagsRef = useRef(cachedTags);
  cachedTagsRef.current = cachedTags;

  const loadBatteryData = useCallback(async (force = false) => {
    const idToFetch = batteryId || rawBatteryId;
    if (!idToFetch || !window.api?.quiz) return;
    if (!force && (hasLoadedQuestionsRef.current || isFetchingQuestionsRef.current)) return;

    isFetchingQuestionsRef.current = true;
    try {
      const data = await window.api.quiz.getBatteryWithQuestions(idToFetch);
      if (!nodeViewMountedRef.current) return;
      if (data) {
        const mappedQuestions: QuestionItem[] = data.questions.map((q: QuizQuestion) => {
          const latestAttempt = data.latestAttempts?.[q.id];
          return {
            id: q.id,
            type: q.type,
            question: q.question,
            options: q.options || [],
            correctIndex: q.correct_index,
            tags: q.tags || [],
            selectedIndex: latestAttempt?.selected_index !== undefined ? latestAttempt.selected_index : null,
            expectedAnswer: q.expected_answer || '',
            userTypedAnswer: latestAttempt?.user_typed_answer || '',
            aiFeedback: latestAttempt?.ai_feedback || null,
            explanation: q.explanation || '',
            showExplanation: Boolean(latestAttempt),
            answered: Boolean(latestAttempt),
          };
        });

        if (!nodeViewMountedRef.current) return;
        hasLoadedQuestionsRef.current = true;
        setQuestions(mappedQuestions);

        const tagSet = new Set<string>();
        data.questions.forEach((q) => (q.tags || []).forEach((t: string) => tagSet.add(t)));
        const tags = Array.from(tagSet);

        if (
          data.title !== cachedTitleRef.current ||
          data.questions.length !== cachedCountRef.current ||
          tags.length !== (cachedTagsRef.current?.length || 0)
        ) {
          if (nodeViewMountedRef.current) {
            updateAttributesRef.current({
              cachedTitle: data.title,
              cachedCount: data.questions.length,
              cachedTags: tags,
            });
          }
        }
      }
    } catch (err) {
      if (nodeViewMountedRef.current) {
        console.warn('[useQuestionBlockSync] Falha ao sincronizar dados da bateria com banco:', err);
      }
    } finally {
      isFetchingQuestionsRef.current = false;
    }
  }, [batteryId, rawBatteryId]);

  const activeModule = useStoreSelector((s) => {
    const activeTab = s.tabs.find((t: Tab) => t.id === s.activeTabId);
    return activeTab?.module ?? null;
  });

  // Only fetch upfront if cached metadata (cachedTitle / cachedCount) is missing; otherwise load strictly on-demand when opened
  useEffect(() => {
    if (activeModule === 'notes' && (cachedCount === undefined || !cachedTitle)) {
      void loadBatteryData();
    }
  }, [activeModule, cachedCount, cachedTitle, loadBatteryData]);

  return {
    batteryId,
    setBatteryId,
    questions,
    setQuestions,
    loadBatteryData,
  };
}
