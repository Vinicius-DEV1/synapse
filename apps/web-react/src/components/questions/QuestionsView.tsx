import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { QuestionsHeader } from './QuestionsHeader';
import { QuestionsMainContent } from './QuestionsMainContent';
import { useQuestionsData, resetQuestionsViewCache } from './hooks/useQuestionsData';
import { useQuestionsFocusSession } from './hooks/useQuestionsFocusSession';
import {
  getAvailableParentOptions,
  getBatteryBreadcrumb,
} from '../../services/quiz/quizHierarchy';
import { useStoreSelector, useStoreDispatch, getStoreState } from '../../store/useStore';
import type { BatteryWithQuestions } from '../../types/quiz';
import type { QuestionItem } from '../editor-extensions/quiz/types';

const QuizSequentialFocusModal = lazy(() =>
  import('../editor-extensions/quiz/components/sequential/QuizSequentialFocusModal').then((m) => ({
    default: m.QuizSequentialFocusModal,
  }))
);

const QuizEditorModal = lazy(() =>
  import('../editor-extensions/quiz/components/QuizEditorModal').then((m) => ({
    default: m.QuizEditorModal,
  }))
);

export { resetQuestionsViewCache };

interface QuestionsViewProps {
  tabId?: string;
}

export default function QuestionsView({ tabId }: QuestionsViewProps) {
  const dispatch = useStoreDispatch();
  const activeTab = useStoreSelector(
    (s) => s.tabs.find((t) => t.id === (tabId || s.activeTabId)) || s.tabs[0]
  );

  const [activeTabSection, setActiveTabSection] = useState<'explorer' | 'dashboard' | 'playlists'>('explorer');

  // Core data hooks
  const {
    batteries,
    stats,
    isLoading,
    allAvailableTags,
    loadData,
    handleDeleteBattery,
    handleMoveBattery,
    handleSaveBattery,
  } = useQuestionsData();

  const handleSilentReload = useCallback(() => loadData(true), [loadData]);

  // Focus mode session orchestration
  const {
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
  } = useQuestionsFocusSession(batteries, handleSilentReload);

  // Editing / Creation state
  const [editingBattery, setEditingBattery] = useState<BatteryWithQuestions | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [creationParentId, setCreationParentId] = useState<string | null>(null);
  const [editorInitialAi, setEditorInitialAi] = useState(false);

  // Check if a specific batteryId or creation mode was passed via tab moduleState
  useEffect(() => {
    const moduleState = activeTab?.moduleState;
    if (!moduleState) return;

    const editingId = moduleState.editingBatteryId;
    if (editingId && typeof editingId === 'string') {
      if (batteries.length > 0) {
        const target = batteries.find((b) => b.id === editingId);
        if (target) {
          setEditingBattery(target);
          if (moduleState.initialShowAi) {
            setEditorInitialAi(true);
          }
        }
      } else if (window.api?.quiz) {
        window.api.quiz
          .getBatteryWithQuestions(editingId)
          .then((b) => {
            if (b) {
              setEditingBattery(b);
              if (moduleState.initialShowAi) {
                setEditorInitialAi(true);
              }
            }
          })
          .catch(console.error);
      }
    } else if (moduleState.isCreatingNew) {
      setIsCreatingNew(true);
    } else if (moduleState.selectedBatteryId && typeof moduleState.selectedBatteryId === 'string' && batteries.length > 0) {
      const target = batteries.find((b) => b.id === moduleState.selectedBatteryId);
      if (target) {
        setActiveTabSection('explorer');
      }
    }
  }, [activeTab?.moduleState, batteries]);

  // Navigate directly to note in Caderno
  const handleNavigateToPage = useCallback(
    (pageId: string) => {
      const targetTabId = tabId || activeTab.id;
      dispatch({
        type: 'UPDATE_TAB_MODULE',
        tabId: targetTabId,
        module: 'notes',
      });
      dispatch({
        type: 'NAVIGATE_IN_TAB',
        pageId,
      });
    },
    [dispatch, tabId, activeTab]
  );

  // Resolve live page title from store with O(1) Map lookup without subscribing QuestionsView to every page list mutation
  const getPageTitle = useCallback(
    (pageId: string) => {
      const pages = getStoreState().pages;
      for (let i = 0; i < pages.length; i++) {
        if (pages[i].id === pageId) return pages[i].title || null;
      }
      return null;
    },
    []
  );

  const handleNewBattery = useCallback(() => {
    setCreationParentId(null);
    setIsCreatingNew(true);
  }, []);

  const handleEditBattery = useCallback((b: BatteryWithQuestions) => {
    setEditingBattery(b);
  }, []);

  const handleCreateSubgroup = useCallback((parentBatteryId: string) => {
    setCreationParentId(parentBatteryId);
    setIsCreatingNew(true);
  }, []);

  const handleCreateBattery = useCallback(() => {
    setIsCreatingNew(true);
  }, []);

  // Close Question Editor page and return to Explorer or origin Note
  const handleCloseEditor = useCallback(() => {
    const returnPageId = activeTab?.moduleState?.returnPageId;
    setEditingBattery(null);
    setIsCreatingNew(false);
    setCreationParentId(null);
    setEditorInitialAi(false);

    if (returnPageId && typeof returnPageId === 'string') {
      const targetTabId = tabId || activeTab.id;
      dispatch({
        type: 'UPDATE_TAB_MODULE',
        tabId: targetTabId,
        module: 'notes',
      });
      dispatch({
        type: 'NAVIGATE_IN_TAB',
        pageId: returnPageId,
      });
    } else if (activeTab?.moduleState?.editingBatteryId || activeTab?.moduleState?.isCreatingNew) {
      const targetTabId = tabId || activeTab.id;
      dispatch({
        type: 'UPDATE_TAB_MODULE',
        tabId: targetTabId,
        module: 'quiz',
        moduleState: undefined,
      });
    }
  }, [activeTab, tabId, dispatch]);

  const onSaveBatteryModal = useCallback(
    async (newTitle: string, newDesc: string, newQuestions: QuestionItem[], parentId?: string | null) => {
      await handleSaveBattery(editingBattery, creationParentId, newTitle, newDesc, newQuestions, parentId);
      handleCloseEditor();
    },
    [handleSaveBattery, editingBattery, creationParentId, handleCloseEditor]
  );

  const isEditorOpen = Boolean(editingBattery || isCreatingNew);

  const availableParentOptions = useMemo(
    () => (isEditorOpen ? getAvailableParentOptions(editingBattery?.id, batteries) : []),
    [isEditorOpen, editingBattery?.id, batteries]
  );

  const activeBreadcrumbs = useMemo(() => {
    if (!isEditorOpen) return [];
    const parentId = editingBattery ? editingBattery.parent_id : creationParentId;
    return parentId ? getBatteryBreadcrumb(parentId, batteries) : [];
  }, [isEditorOpen, editingBattery, creationParentId, batteries]);

  // Full-Page Question Editor View (Preserving Caderno's TabBar and Sidebar)
  if (isEditorOpen) {
    return (
      <Suspense fallback={null}>
        <QuizEditorModal
          isOpen={true}
          onClose={handleCloseEditor}
          initialShowAiAssistant={editorInitialAi}
          batteryTitle={editingBattery?.title || ''}
          batteryDescription={editingBattery?.description || ''}
          initialParentId={editingBattery ? editingBattery.parent_id : creationParentId}
          availableParentOptions={availableParentOptions}
          breadcrumbs={activeBreadcrumbs}
          initialQuestions={
            editingBattery
              ? editingBattery.questions.map((q) => ({
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
                }))
              : []
          }
          onSave={onSaveBatteryModal}
        />
      </Suspense>
    );
  }

  return (
    <div className="w-full h-full bg-dark-bg text-zinc-100 overflow-y-auto smooth-scroll-container overscroll-contain custom-scrollbar select-none relative">
      <div className="max-w-5xl mx-auto flex flex-col min-h-full">
        <QuestionsHeader
          totalQuestions={stats.totalQuestions}
          activeTabSection={activeTabSection}
          onSelectTabSection={setActiveTabSection}
          onNewBattery={handleNewBattery}
        />

        <main className="flex-1 p-5 md:p-8">
          <div className="max-w-full">
            <QuestionsMainContent
              isLoading={isLoading}
              batteries={batteries}
              stats={stats}
              activeTabSection={activeTabSection}
              allAvailableTags={allAvailableTags}
              highlightedBatteryId={
                typeof activeTab?.moduleState?.selectedBatteryId === 'string'
                  ? activeTab.moduleState.selectedBatteryId
                  : undefined
              }
              onPlayBattery={handlePlayBattery}
              onEditBattery={handleEditBattery}
              onDeleteBattery={handleDeleteBattery}
              onNavigateToPage={handleNavigateToPage}
              getPageTitle={getPageTitle}
              onCreateSubgroup={handleCreateSubgroup}
              onMoveBattery={handleMoveBattery}
              onSelectTabSection={setActiveTabSection}
              onCreateBattery={handleCreateBattery}
              onStartSession={handleStartGeneratedSession}
            />
          </div>
        </main>
      </div>

      {activePlayingSession && (
        <Suspense fallback={null}>
          <QuizSequentialFocusModal
            isOpen={Boolean(activePlayingSession)}
            onClose={() => {
              setActivePlayingSession(null);
              loadData(true);
            }}
            title={activePlayingSession.title}
            questions={activePlayingSession.questions}
            onUpdateQuestions={updateQuestionsInFocus}
            onUpdateSingleQuestion={updateSingleQuestionInFocus}
            onEvaluateOpenAnswer={handleEvaluateOpenAnswer}
            evaluatingIds={evaluatingIds}
            onDiscussInChat={() => {}}
            activeIndex={activeIndex}
            onActiveIndexChange={setActiveIndex}
            onEditQuestion={() => {
              const b = batteries.find((x) => x.id === activePlayingSession.batteryId);
              if (b) {
                setActivePlayingSession(null);
                setEditorInitialAi(false);
                setEditingBattery(b);
              }
            }}
            onDeleteQuestion={handleDeleteQuestionInFocus}
          />
        </Suspense>
      )}
    </div>
  );
}
