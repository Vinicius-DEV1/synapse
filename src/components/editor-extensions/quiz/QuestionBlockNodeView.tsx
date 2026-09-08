import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { GripVertical, Play, Edit3, ExternalLink, Trash2, HelpCircle, CheckCircle2, Sparkles, Tag } from 'lucide-react';
import { QuizSequentialFocusModal } from './components/sequential/QuizSequentialFocusModal';
import { QuizEditorModal } from './components/QuizEditorModal';
import { useQuizEvaluation } from './hooks/useQuizEvaluation';
import { normalizeQuizQuestions } from './utils/quizNormalizer';
import { useStore } from '../../../store/useStore';
import type { QuestionItem } from './types';
import type { QuizQuestion, BatteryWithQuestions } from '../../../types/quiz';

function QuestionBlockNodeViewInner(props: NodeViewProps) {
  const {
    batteryId: rawBatteryId,
    cachedTitle,
    cachedCount,
    cachedTags,
    title: legacyTitle,
    description: legacyDesc,
    questions: rawQuestions,
  } = props.node.attrs;

  const { dispatch, state } = useStore();

  const title = cachedTitle || legacyTitle || 'Bateria de Exercícios';
  const description = legacyDesc || '';

  // Local state for fast interaction
  const [batteryId, setBatteryId] = useState<string | null>(rawBatteryId || null);
  const [questions, setQuestions] = useState<QuestionItem[]>(() => {
    if (rawQuestions && Array.isArray(rawQuestions) && rawQuestions.length > 0) {
      return normalizeQuizQuestions(rawQuestions);
    }
    return [];
  });

  const [activeBatteryData, setActiveBatteryData] = useState<BatteryWithQuestions | null>(null);
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-migration on mount for legacy unmigrated nodes
  useEffect(() => {
    let isMounted = true;

    async function handleAutoMigration() {
      if (!rawBatteryId && window.api?.quiz) {
        const normalized = normalizeQuizQuestions(rawQuestions);
        const tags = Array.from(new Set(normalized.flatMap((q) => q.tags || [])));

        try {
          const savedBattery = await window.api.quiz.saveBattery({
            title,
            description,
            layout: 'sequential',
            tags,
          });

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
            props.updateAttributes({
              batteryId: savedBattery.id,
              cachedTitle: savedBattery.title,
              cachedCount: questionsToBatch.length,
              cachedTags: tags,
              questions: undefined, // Clear bloated attribute
              aiChatHistory: undefined,
            });
          }
        } catch (err) {
          console.warn('[QuestionBlockNodeView] Falha na migração automática de nó legado:', err);
        }
      }
    }

    handleAutoMigration();
    return () => {
      isMounted = false;
    };
  }, [rawBatteryId, rawQuestions, title, description, props]);

  // SWR: Load fresh battery & questions from DB silently in background
  const loadBatteryData = useCallback(async () => {
    const idToFetch = batteryId || rawBatteryId;
    if (!idToFetch || !window.api?.quiz) return;

    try {
      const data = await window.api.quiz.getBatteryWithQuestions(idToFetch);
      if (data) {
        setActiveBatteryData(data);

        // Map DB questions to QuestionItem view model
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

        setQuestions(mappedQuestions);

        // Optimistically keep cached attributes updated
        const tagSet = new Set<string>();
        data.questions.forEach((q) => (q.tags || []).forEach((t) => tagSet.add(t)));
        const tags = Array.from(tagSet);

        if (
          data.title !== cachedTitle ||
          data.questions.length !== cachedCount ||
          tags.length !== (cachedTags?.length || 0)
        ) {
          props.updateAttributes({
            cachedTitle: data.title,
            cachedCount: data.questions.length,
            cachedTags: tags,
          });
        }
      }
    } catch (err) {
      console.warn('[QuestionBlockNodeView] Falha ao sincronizar dados da bateria com banco:', err);
    }
  }, [batteryId, rawBatteryId, cachedTitle, cachedCount, cachedTags, props]);

  useEffect(() => {
    loadBatteryData();
  }, [loadBatteryData]);

  // Update single question handler (used in Focus Mode)
  const updateSingleQuestion = useCallback(
    async (qId: string, partial: Partial<QuestionItem>) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === qId ? { ...q, ...partial } : q))
      );

      // Persist attempt atomically to DB if answered
      const targetQuestion = questions.find((q) => q.id === qId);
      const bId = batteryId || rawBatteryId;

      if (bId && targetQuestion && window.api?.quiz) {
        const isAttemptUpdate =
          partial.answered !== undefined ||
          partial.selectedIndex !== undefined ||
          partial.userTypedAnswer !== undefined ||
          partial.aiFeedback !== undefined;

        if (isAttemptUpdate) {
          const updatedType = targetQuestion.type;
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
            console.error('[QuestionBlockNodeView] Falha ao persistir tentativa no banco:', err);
          }
        }
      }
    },
    [questions, batteryId, rawBatteryId]
  );

  const { evaluatingIds, handleEvaluateOpenAnswer } = useQuizEvaluation(updateSingleQuestion);

  // Navigate to dedicated Questions Module
  const handleNavigateToQuestionsModule = useCallback(() => {
    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
    if (activeTab) {
      dispatch({
        type: 'UPDATE_TAB_MODULE',
        tabId: activeTab.id,
        module: 'quiz' as any,
        moduleState: { selectedBatteryId: batteryId || rawBatteryId },
      });
    }
  }, [state.tabs, state.activeTabId, dispatch, batteryId, rawBatteryId]);

  // Handle Save in Editor Modal
  const handleSaveEditor = useCallback(
    async (newTitle: string, newDescription: string, newQuestions: QuestionItem[]) => {
      const bId = batteryId || rawBatteryId;
      if (!bId || !window.api?.quiz) return;

      const tagSet = new Set<string>();
      newQuestions.forEach((q) => (q.tags || []).forEach((t) => tagSet.add(t)));
      const tags = Array.from(tagSet);

      await window.api.quiz.saveBattery({
        id: bId,
        title: newTitle,
        description: newDescription,
        tags,
      });

      const questionRecords = newQuestions.map((q, idx) => ({
        id: q.id,
        battery_id: bId,
        type: q.type,
        question: q.question,
        options: q.options,
        correct_index: q.correctIndex,
        expected_answer: q.expectedAnswer,
        explanation: q.explanation,
        tags: q.tags || [],
        sort_order: idx + 1,
      }));

      await window.api.quiz.saveQuestionsBatch(questionRecords);

      props.updateAttributes({
        cachedTitle: newTitle,
        cachedCount: newQuestions.length,
        cachedTags: tags,
      });

      setQuestions(newQuestions);
      await loadBatteryData();
    },
    [batteryId, rawBatteryId, props, loadBatteryData]
  );

  // Stats computation for the embed card
  const stats = useMemo(() => {
    const total = questions.length || cachedCount || 0;
    const answered = questions.filter((q) => q.answered || q.selectedIndex !== null).length;
    const correct = questions.filter((q) => {
      if (q.type === 'multiple_choice') return q.selectedIndex === q.correctIndex;
      return q.aiFeedback?.verdict === 'Correto';
    }).length;
    const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    return { total, answered, correct, accuracy };
  }, [questions, cachedCount]);

  const displayTags: string[] = cachedTags && cachedTags.length > 0
    ? cachedTags
    : Array.from(new Set(questions.flatMap((q) => q.tags || [])));

  return (
    <NodeViewWrapper className="question-block-embed-wrapper my-4">
      {/* High-Performance Embed Card */}
      <div
        className="w-full bg-zinc-900/60 hover:bg-zinc-900/80 border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-4 md:p-5 transition-all duration-150 relative group shadow-sm select-none"
        style={{ contain: 'layout style' }}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Drag Handle */}
            <div
              data-drag-handle
              className="p-1 rounded text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
              title="Arrastar bloco"
            >
              <GripVertical size={16} />
            </div>

            {/* Icon */}
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20 shrink-0">
              <CheckCircle2 size={18} />
            </div>

            {/* Title & Badge */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm md:text-base font-semibold text-zinc-100 truncate">
                  {title}
                </h4>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 shrink-0">
                  {stats.total} {stats.total === 1 ? 'questão' : 'questões'}
                </span>
              </div>
              {description && (
                <p className="text-xs text-zinc-400 truncate mt-0.5">{description}</p>
              )}
            </div>
          </div>

          {/* Quick Actions (Right Header) */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleNavigateToQuestionsModule}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Abrir no Módulo de Questões"
            >
              <ExternalLink size={15} />
            </button>

            <button
              onClick={() => setIsEditorModalOpen(true)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Editar questões"
            >
              <Edit3 size={15} />
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Remover bloco da nota"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Tags & Progress Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.05]">
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {displayTags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-zinc-400 flex items-center gap-1"
              >
                <Tag size={10} className="text-zinc-500" />
                {tag}
              </span>
            ))}
            {displayTags.length > 4 && (
              <span className="text-[10px] text-zinc-500 font-mono">
                +{displayTags.length - 4}
              </span>
            )}
          </div>

          {/* Progress / Score Badge */}
          {stats.answered > 0 && (
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
              <span className="text-emerald-400 font-mono">{stats.accuracy}% acertos</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400 font-mono">
                {stats.answered}/{stats.total} respondidas
              </span>
            </div>
          )}
        </div>

        {/* Primary Launch Button */}
        <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setActiveIndex(0);
              setIsFocusModeOpen(true);
            }}
            className="flex-1 py-2 px-4 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 hover:border-brand-500/50 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <Play size={14} className="fill-brand-300" />
            <span>Iniciar no Modo Foco</span>
          </button>

          <button
            onClick={() => setIsEditorModalOpen(true)}
            className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition-all cursor-pointer"
            title="Gerenciar questões desta bateria"
          >
            Editar
          </button>
        </div>
      </div>

      {/* Zen Full-Canvas Focus Modal */}
      <QuizSequentialFocusModal
        isOpen={isFocusModeOpen}
        onClose={() => {
          setIsFocusModeOpen(false);
          loadBatteryData();
        }}
        title={title}
        questions={questions}
        onUpdateSingleQuestion={updateSingleQuestion}
        onEvaluateOpenAnswer={handleEvaluateOpenAnswer}
        evaluatingIds={evaluatingIds}
        onDiscussInChat={() => {}}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        onEditQuestion={() => {
          setIsFocusModeOpen(false);
          setIsEditorModalOpen(true);
        }}
      />

      {/* Editor Modal */}
      <QuizEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        batteryTitle={title}
        batteryDescription={description}
        initialQuestions={questions}
        onSave={handleSaveEditor}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fade-in">
            <h4 className="text-sm font-semibold text-zinc-100">Remover Bloco de Questões?</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              O card será removido desta nota. A bateria e suas questões{' '}
              <strong className="text-zinc-200">continuarão salvas no banco de dados</strong> e acessíveis no Módulo de Questões.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  props.deleteNode();
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium cursor-pointer"
              >
                Remover da Nota
              </button>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}

export default memo(QuestionBlockNodeViewInner, (prev, next) => {
  return (
    prev.node.attrs.batteryId === next.node.attrs.batteryId &&
    prev.node.attrs.cachedTitle === next.node.attrs.cachedTitle &&
    prev.node.attrs.cachedCount === next.node.attrs.cachedCount &&
    prev.selected === next.selected
  );
});
