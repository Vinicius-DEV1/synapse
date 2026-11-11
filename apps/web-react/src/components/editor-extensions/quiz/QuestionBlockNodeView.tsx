import { useState, useCallback, useMemo, useRef, memo } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import { QuizSequentialFocusModal } from './components/sequential/QuizSequentialFocusModal';
import { QuestionBlockGutterControls } from './components/QuestionBlockGutterControls';
import { QuestionBlockDeleteModal } from './components/QuestionBlockDeleteModal';
import { QuestionBlockCard } from './components/QuestionBlockCard';
import { useQuestionBlockSync } from './hooks/useQuestionBlockSync';
import { useQuestionBlockAttempt } from './hooks/useQuestionBlockAttempt';
import { useStore } from '../../../store/useStore';

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

  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const updateAttributesRef = useRef(props.updateAttributes);
  updateAttributesRef.current = props.updateAttributes;

  const {
    batteryId,
    setBatteryId,
    questions,
    setQuestions,
    loadBatteryData,
  } = useQuestionBlockSync({
    rawBatteryId,
    rawQuestions,
    title,
    description,
    cachedTitle,
    cachedCount,
    cachedTags,
    updateAttributes: props.updateAttributes,
    state,
  });

  const {
    updateSingleQuestion,
    evaluatingIds,
    handleEvaluateOpenAnswer,
  } = useQuestionBlockAttempt(questions, setQuestions, batteryId, rawBatteryId);

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
    [batteryId, rawBatteryId, state.tabs, state.activeTabId, title, description, cachedTags, dispatch, setBatteryId]
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

  return (
    <NodeViewWrapper className="quiz-block-wrapper relative group/quiz my-2">
      {/* Alça e controles verticais no gutter esquerdo */}
      <QuestionBlockGutterControls
        editor={props.editor}
        getPos={props.getPos}
        node={props.node}
      />

      {/* Card compacto em linha única */}
      <QuestionBlockCard
        title={title}
        description={description}
        stats={stats}
        displayTags={displayTags}
        isSelected={props.selected || isNodeSelected}
        onSelectNode={() => {
          if (typeof props.getPos === 'function' && props.editor) {
            const p = props.getPos();
            if (typeof p === 'number') {
              props.editor.commands.setNodeSelection(p);
            }
          }
        }}
        onPlayFocusMode={() => {
          setActiveIndex(0);
          setIsFocusModeOpen(true);
        }}
        onOpenQuestionsModule={handleNavigateToQuestionsModule}
        onEditQuestions={() => handleOpenEditorPage(false)}
        onDeleteBlock={() => setShowDeleteConfirm(true)}
      />

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
      <QuestionBlockDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
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
      />
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
