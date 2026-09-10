import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { GripVertical, Play, Edit3, ExternalLink, Trash2, CheckCircle2, Tag, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { selectNodeForDrag } from '../group-layout/DragToGroup';
import { moveBlockUp, moveBlockDown } from '../moveBlockCommands';
import { QuizSequentialFocusModal } from './components/sequential/QuizSequentialFocusModal';
import { Portal } from '../../ui/Portal';
import { useQuizEvaluation } from './hooks/useQuizEvaluation';
import { normalizeQuizQuestions } from './utils/quizNormalizer';
import { useStore } from '../../../store/useStore';
import type { QuestionItem } from './types';
import type { QuizQuestion } from '../../../types/quiz';

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

  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const isMigratingRef = useRef(false);
  const updateAttributesRef = useRef(props.updateAttributes);
  updateAttributesRef.current = props.updateAttributes;

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

    const legacyQuestions = props.node.attrs.questions;
    if (!Array.isArray(legacyQuestions) || legacyQuestions.length === 0) return;

    isMigratingRef.current = true;
    let isMounted = true;

    async function handleAutoMigration() {
      if (window.api?.quiz) {
        const normalized = normalizeQuizQuestions(rawQuestions);
        const tags = Array.from(new Set(normalized.flatMap((q) => q.tags || [])));

        const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
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
              questions: undefined, // Clear bloated attribute
              aiChatHistory: undefined,
            });
          }
        } catch (err) {
          isMigratingRef.current = false;
          console.warn('[QuestionBlockNodeView] Falha na migração automática de nó legado:', err);
        }
      }
    }

    handleAutoMigration();
    return () => {
      isMounted = false;
    };
  }, [rawBatteryId, rawQuestions, title, description, state.tabs, state.activeTabId]);

  // SWR: Load fresh battery & questions from DB silently in background
  const cachedTitleRef = useRef(cachedTitle);
  cachedTitleRef.current = cachedTitle;
  const cachedCountRef = useRef(cachedCount);
  cachedCountRef.current = cachedCount;
  const cachedTagsRef = useRef(cachedTags);
  cachedTagsRef.current = cachedTags;

  const loadBatteryData = useCallback(async () => {
    const idToFetch = batteryId || rawBatteryId;
    if (!idToFetch || !window.api?.quiz) return;

    try {
      const data = await window.api.quiz.getBatteryWithQuestions(idToFetch);
      if (!nodeViewMountedRef.current) return;
      if (data) {
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

        if (!nodeViewMountedRef.current) return;
        setQuestions(mappedQuestions);

        // Optimistically keep cached attributes updated
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
        console.warn('[QuestionBlockNodeView] Falha ao sincronizar dados da bateria com banco:', err);
      }
    }
  }, [batteryId, rawBatteryId]);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  const activeModule = activeTab?.module;

  useEffect(() => {
    if (activeModule === 'notes') {
      loadBatteryData();
    }
  }, [activeModule, loadBatteryData]);

  // Stable buffers to prevent stale closures and TipTap re-render thrashing
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
            console.error('[QuestionBlockNodeView] Falha ao salvar edição de questão no banco:', err);
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
            console.error('[QuestionBlockNodeView] Falha ao persistir tentativa no banco:', err);
          }
        }
      }
    },
    []
  );

  const { evaluatingIds, handleEvaluateOpenAnswer } = useQuizEvaluation(updateSingleQuestion);

  // Navigate to dedicated Questions Module
  const handleNavigateToQuestionsModule = useCallback(() => {
    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
    if (activeTab) {
      dispatch({
        type: 'UPDATE_TAB_MODULE',
        tabId: activeTab.id,
        module: 'quiz',
        moduleState: { selectedBatteryId: batteryId || rawBatteryId },
      });
    }
  }, [state.tabs, state.activeTabId, dispatch, batteryId, rawBatteryId]);

  // Navigate to Question Editor page in Quiz Module (preserving TabBar and Sidebar)
  const handleOpenEditorPage = useCallback(
    async (initialShowAi = false) => {
      let bId = batteryId || rawBatteryId;
      const currentTab = state.tabs.find((t) => t.id === state.activeTabId);

      // If not yet persisted to database, create battery first
      if (!bId && window.api?.quiz) {
        try {
          const saved = await window.api.quiz.saveBattery({
            title,
            description,
            page_id: currentTab?.pageId || undefined,
            layout: 'sequential',
            tags: cachedTags || [],
          });
          bId = saved.id;
          setBatteryId(bId);
          updateAttributesRef.current({ batteryId: bId });
          if (currentTab?.pageId) {
            await window.api.quiz.linkBatteryToPage(bId, currentTab.pageId);
          }
        } catch (err) {
          console.error('[QuestionBlockNodeView] Falha ao criar bateria antes de editar:', err);
        }
      }

      if (currentTab && bId) {
        dispatch({
          type: 'UPDATE_TAB_MODULE',
          tabId: currentTab.id,
          module: 'quiz',
          moduleState: {
            editingBatteryId: bId,
            returnPageId: currentTab.pageId,
            initialShowAi,
          },
        });
      }
    },
    [batteryId, rawBatteryId, state.tabs, state.activeTabId, title, description, cachedTags, dispatch]
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

  const pos = typeof props.getPos === 'function' ? props.getPos() : null;
  const isNodeSelected = !!(
    props.selected &&
    props.editor?.state?.selection instanceof NodeSelection &&
    typeof pos === 'number' &&
    props.editor.state.selection.from === pos
  );

  const handleDragHandleMouseDown = () => {
    if (typeof props.getPos === 'function' && props.editor?.view) {
      const p = props.getPos();
      if (typeof p === 'number') {
        selectNodeForDrag(props.editor.view, p, props.node);
      }
    }
  };

  return (
    <NodeViewWrapper className="quiz-block-wrapper relative group/quiz my-2">
      {/* Alça e controles verticais no gutter esquerdo */}
      <div
        contentEditable={false}
        className="absolute -left-7 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-0.5 rounded-md border border-white/10 bg-dark-bg/90 p-0.5 text-dark-subtext opacity-0 shadow-lg backdrop-blur-xl transition-all group-hover/quiz:opacity-100"
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof props.getPos === 'function' && props.editor) {
              const p = props.getPos();
              if (typeof p === 'number') moveBlockUp(props.editor.view, p);
            }
          }}
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          title="Subir bloco de questões (Mover para cima)"
        >
          <ArrowUp size={11} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof props.getPos === 'function' && props.editor) {
              const p = props.getPos();
              if (typeof p === 'number') {
                props.editor.chain().focus().insertContentAt(p + props.node.nodeSize, { type: 'paragraph' }).run();
              }
            }
          }}
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          title="Adicionar linha abaixo (+)"
        >
          <Plus size={11} />
        </button>
        <div
          data-drag-handle
          onMouseDown={handleDragHandleMouseDown}
          className="p-0.5 cursor-grab active:cursor-grabbing hover:text-white transition-colors"
          title="Arrastar bloco de questões"
        >
          <GripVertical size={13} />
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof props.getPos === 'function' && props.editor) {
              const p = props.getPos();
              if (typeof p === 'number') moveBlockDown(props.editor.view, p);
            }
          }}
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          title="Descer bloco de questões (Mover para baixo)"
        >
          <ArrowDown size={11} />
        </button>
      </div>

      {/* Card compacto em linha única */}
      <div
        onMouseDown={() => {
          if (typeof props.getPos === 'function' && props.editor) {
            const p = props.getPos();
            if (typeof p === 'number') {
              props.editor.commands.setNodeSelection(p);
            }
          }
        }}
        className={`group w-full flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl border select-none transition-all duration-150 ${
          props.selected || isNodeSelected
            ? 'bg-dark-card/90 border-brand-400 ring-1 ring-brand-400/50 shadow-sm'
            : 'bg-dark-card/50 hover:bg-white/[0.04] border-white/5 hover:border-brand-500/30'
        }`}
        style={{ contain: 'layout style' }}
      >
        {/* Left Side: Icon, Title, Badges */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20 shrink-0">
            <CheckCircle2 size={15} />
          </div>

          <span
            className="text-xs sm:text-sm font-semibold text-zinc-100 truncate max-w-[180px] sm:max-w-xs md:max-w-sm"
            title={title}
          >
            {title}
          </span>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 shrink-0">
            {stats.total} {stats.total === 1 ? 'questão' : 'questões'}
          </span>

          {stats.answered > 0 && (
            <span className="text-[11px] font-mono text-emerald-400/90 font-medium shrink-0 flex items-center gap-1">
              <span>{stats.accuracy}% acertos</span>
              <span className="text-zinc-600 text-[10px] hidden md:inline">({stats.answered}/{stats.total})</span>
            </span>
          )}

          {displayTags.length > 0 && (
            <div className="hidden lg:flex items-center gap-1 shrink-0">
              {displayTags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-zinc-400 flex items-center gap-0.5"
                >
                  <Tag size={9} className="text-zinc-500" />
                  <span>{tag}</span>
                </span>
              ))}
              {displayTags.length > 2 && (
                <span className="text-[10px] text-zinc-500 font-mono">+{displayTags.length - 2}</span>
              )}
            </div>
          )}

          {description && (
            <span className="hidden 2xl:inline text-xs text-zinc-500 truncate max-w-xs" title={description}>
              <span className="opacity-50 mr-1">•</span>
              {description}
            </span>
          )}
        </div>

        {/* Right Side: Quick Actions & Launch Button */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveIndex(0);
              setIsFocusModeOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 hover:border-brand-500/50 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Iniciar no Modo Foco"
          >
            <Play size={11} className="fill-brand-300 shrink-0" />
            <span className="hidden sm:inline">Iniciar no Modo Foco</span>
            <span className="sm:hidden">Foco</span>
          </button>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNavigateToQuestionsModule();
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Abrir no Módulo de Questões"
            >
              <ExternalLink size={13} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditorPage(false);
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Editar questões"
            >
              <Edit3 size={13} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Remover bloco da nota"
            >
              <Trash2 size={13} />
            </button>
          </div>
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
        onUpdateQuestions={setQuestions}
        onUpdateSingleQuestion={updateSingleQuestion}
        onEvaluateOpenAnswer={handleEvaluateOpenAnswer}
        evaluatingIds={evaluatingIds}
        onDiscussInChat={() => {}}
        activeIndex={activeIndex}
        onActiveIndexChange={setActiveIndex}
        onEditQuestion={() => {
          setIsFocusModeOpen(false);
          handleOpenEditorPage(false);
        }}
        onDeleteQuestion={async (qId) => {
          setQuestions((prev) => prev.filter((q) => q.id !== qId));
          const bId = batteryId || rawBatteryId;
          if (bId && window.api?.quiz) {
            try {
              await window.api.quiz.deleteQuestion(qId);
              await loadBatteryData();
            } catch (err) {
              console.error('[QuestionBlockNodeView] Falha ao excluir questão no banco:', err);
            }
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <Portal>
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-dark-card border border-white/10 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fade-in">
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
                  onClick={async () => {
                    setShowDeleteConfirm(false);
                    const bId = batteryId || rawBatteryId;
                    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
                    if (bId && activeTab?.pageId && window.api?.quiz) {
                      try {
                        await window.api.quiz.unlinkBatteryFromPage(bId, activeTab.pageId);
                      } catch (err) {
                        console.warn('[QuestionBlockNodeView] Falha ao desvincular página:', err);
                      }
                    }
                    props.deleteNode();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium cursor-pointer"
                >
                  Remover da Nota
                </button>
              </div>
            </div>
          </div>
        </Portal>
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
