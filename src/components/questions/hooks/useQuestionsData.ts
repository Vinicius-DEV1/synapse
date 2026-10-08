import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { BatteryWithQuestions, QuizStats } from '../../../types/quiz';
import type { QuestionItem } from '../../editor-extensions/quiz/types';

// In-memory module cache for instant SWR transitions (0ms perceived latency)
let cachedBatteries: BatteryWithQuestions[] | null = null;
let cachedStats: QuizStats | null = null;

export function resetQuestionsViewCache(): void {
  cachedBatteries = null;
  cachedStats = null;
}

export function useQuestionsData() {
  const [batteries, setBatteries] = useState<BatteryWithQuestions[]>(() => cachedBatteries || []);
  const [stats, setStats] = useState<QuizStats>(
    () =>
      cachedStats || {
        totalBatteries: 0,
        totalQuestions: 0,
        answeredQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        accuracyRate: 0,
        tagStats: {},
      }
  );
  const [isLoading, setIsLoading] = useState(() => !cachedBatteries);
  const isFetchingRef = useRef(false);

  // Load all batteries, questions and stats in parallel with single-tick queries
  const loadData = useCallback(async (silent = false) => {
    if (!window.api?.quiz || isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent && !cachedBatteries) {
      setIsLoading(true);
    }
    try {
      const [enrichedBatteries, globalStats] = await Promise.all([
        window.api.quiz.getAllBatteriesEnriched(),
        window.api.quiz.getStats(),
      ]);

      cachedBatteries = enrichedBatteries;
      cachedStats = globalStats;

      setBatteries(enrichedBatteries);
      setStats(globalStats);
    } catch (err) {
      console.error('[useQuestionsData] Falha ao carregar dados do módulo de questões:', err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadData(Boolean(cachedBatteries));
  }, [loadData]);

  // Aggregate all tags
  const allAvailableTags = useMemo(() => {
    const tagSet = new Set<string>();
    batteries.forEach((b) => {
      (b.tags || []).forEach((t) => tagSet.add(t.trim()));
      b.questions.forEach((q) => (q.tags || []).forEach((t) => tagSet.add(t.trim())));
    });
    return Array.from(tagSet).filter(Boolean);
  }, [batteries]);

  // Delete battery handler
  const handleDeleteBattery = useCallback(
    async (batteryId: string) => {
      if (!window.api?.quiz) return;
      try {
        await window.api.quiz.deleteBattery(batteryId);
        await loadData();
      } catch (err) {
        console.error('[useQuestionsData] Falha ao mover bateria para lixeira:', err);
      }
    },
    [loadData]
  );

  // Move battery to another group or root
  const handleMoveBattery = useCallback(
    async (batteryId: string, newParentId: string | null) => {
      if (!window.api?.quiz) return;
      try {
        const target = batteries.find((b) => b.id === batteryId);
        if (!target) return;
        await window.api.quiz.saveBattery({
          id: target.id,
          title: target.title,
          description: target.description,
          tags: target.tags,
          page_id: target.page_id,
          parent_id: newParentId,
        });
        await loadData(true);
      } catch (err) {
        console.error('[useQuestionsData] Falha ao mover bateria de grupo:', err);
      }
    },
    [batteries, loadData]
  );

  // Save edited / newly created battery
  const handleSaveBattery = useCallback(
    async (
      editingBattery: BatteryWithQuestions | null,
      creationParentId: string | null,
      newTitle: string,
      newDesc: string,
      newQuestions: QuestionItem[],
      parentId?: string | null
    ) => {
      if (!window.api?.quiz) return;

      const tagSet = new Set<string>();
      newQuestions.forEach((q) => (q.tags || []).forEach((t) => tagSet.add(t)));
      const tags = Array.from(tagSet);

      const targetId = editingBattery?.id || undefined;
      const targetParentId = parentId !== undefined ? parentId : (editingBattery?.parent_id ?? creationParentId);

      const saved = await window.api.quiz.saveBattery({
        id: targetId,
        title: newTitle,
        description: newDesc,
        tags,
        parent_id: targetParentId,
      });

      // Reconcile and soft-delete questions removed during editing
      if (targetId) {
        try {
          const existingInDb = await window.api.quiz.getQuestionsByBattery(targetId);
          const incomingIds = new Set(newQuestions.map((q) => q.id));
          for (const eq of existingInDb) {
            if (!incomingIds.has(eq.id)) {
              await window.api.quiz.deleteQuestion(eq.id);
            }
          }
        } catch (err) {
          console.warn('[useQuestionsData] Falha ao conciliar questões excluídas:', err);
        }
      }

      const records = newQuestions.map((q, idx) => ({
        id: q.id,
        battery_id: saved.id,
        type: q.type,
        question: q.question,
        options: q.options,
        correct_index: q.correctIndex,
        expected_answer: q.expectedAnswer,
        explanation: q.explanation,
        tags: q.tags || [],
        sort_order: idx + 1,
      }));

      await window.api.quiz.saveQuestionsBatch(records);
      await loadData();
    },
    [loadData]
  );

  return {
    batteries,
    stats,
    isLoading,
    allAvailableTags,
    loadData,
    handleDeleteBattery,
    handleMoveBattery,
    handleSaveBattery,
  };
}
