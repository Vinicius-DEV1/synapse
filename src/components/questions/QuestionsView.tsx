import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CheckSquare, LayoutDashboard, Compass, Sparkles, Plus } from 'lucide-react';
import { QuestionsDashboard } from './QuestionsDashboard';
import { QuestionsExplorer } from './QuestionsExplorer';
import { QuestionsPlaylists } from './QuestionsPlaylists';
import { QuizSequentialFocusModal } from '../editor-extensions/quiz/components/sequential/QuizSequentialFocusModal';
import { QuizEditorModal } from '../editor-extensions/quiz/components/QuizEditorModal';
import { useQuizEvaluation } from '../editor-extensions/quiz/hooks/useQuizEvaluation';
import { useStore } from '../../store/useStore';
import type { BatteryWithQuestions, QuizStats } from '../../types/quiz';
import type { QuestionItem } from '../editor-extensions/quiz/types';
import type { GeneratedStudySession } from '../../services/quiz/quizSimulator';

interface QuestionsViewProps {
  tabId?: string;
}

// In-memory module cache for instant SWR transitions (0ms perceived latency)
let cachedBatteries: BatteryWithQuestions[] | null = null;
let cachedStats: QuizStats | null = null;

export function resetQuestionsViewCache() {
  cachedBatteries = null;
  cachedStats = null;
}

export default function QuestionsView({ tabId }: QuestionsViewProps) {
  const { dispatch, state } = useStore();
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0];

  const [activeTabSection, setActiveTabSection] = useState<'explorer' | 'dashboard' | 'playlists'>('explorer');
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

  // Playing session state (Focus Mode)
  const [activePlayingSession, setActivePlayingSession] = useState<{
    title: string;
    batteryId?: string;
    questions: QuestionItem[];
  } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Editing / Creation state
  const [editingBattery, setEditingBattery] = useState<BatteryWithQuestions | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editorInitialAi, setEditorInitialAi] = useState(false);

  // Load all batteries, questions and stats in parallel with single-tick queries
  const loadData = useCallback(async (silent = false) => {
    if (!window.api?.quiz) return;
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
      console.error('[QuestionsView] Falha ao carregar dados do módulo de questões:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(Boolean(cachedBatteries));
  }, [loadData]);

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

  // Aggregate all tags
  const allAvailableTags = useMemo(() => {
    const tagSet = new Set<string>();
    batteries.forEach((b) => {
      (b.tags || []).forEach((t) => tagSet.add(t.trim()));
      b.questions.forEach((q) => (q.tags || []).forEach((t) => tagSet.add(t.trim())));
    });
    return Array.from(tagSet).filter(Boolean);
  }, [batteries]);

  // Launch battery in Focus Mode
  const handlePlayBattery = useCallback((battery: BatteryWithQuestions) => {
    const mapped: QuestionItem[] = battery.questions.map((q) => {
      const attempt = battery.latestAttempts?.[q.id];
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
        batteryId: battery.id,
      };
    });

    setActiveIndex(0);
    setActivePlayingSession({
      title: battery.title,
      batteryId: battery.id,
      questions: mapped,
    });
  }, []);

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

  // Stable reference buffer to avoid stale closures & unnecessary re-render thrashing
  const activePlayingSessionRef = useRef(activePlayingSession);
  activePlayingSessionRef.current = activePlayingSession;

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
            console.error('[QuestionsView] Falha ao gravar tentativa no banco:', err);
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

  // Delete battery handler
  const handleDeleteBattery = useCallback(
    async (batteryId: string) => {
      if (!window.api?.quiz) return;
      try {
        await window.api.quiz.deleteBattery(batteryId);
        await loadData();
      } catch (err) {
        console.error('[QuestionsView] Falha ao mover bateria para lixeira:', err);
      }
    },
    [loadData]
  );

  // Resolve live page title from store
  const getPageTitle = useCallback(
    (pageId: string) => {
      const page = state.pages.find((p) => p.id === pageId);
      return page?.title || null;
    },
    [state.pages]
  );

  // Close Question Editor page and return to Explorer or origin Note
  const handleCloseEditor = useCallback(() => {
    const returnPageId = activeTab?.moduleState?.returnPageId;
    setEditingBattery(null);
    setIsCreatingNew(false);
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

  // Save edited / newly created battery
  const handleSaveBatteryModal = useCallback(
    async (newTitle: string, newDesc: string, newQuestions: QuestionItem[]) => {
      if (!window.api?.quiz) return;

      const tagSet = new Set<string>();
      newQuestions.forEach((q) => (q.tags || []).forEach((t) => tagSet.add(t)));
      const tags = Array.from(tagSet);

      const targetId = editingBattery?.id || undefined;

      const saved = await window.api.quiz.saveBattery({
        id: targetId,
        title: newTitle,
        description: newDesc,
        tags,
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
          console.warn('[QuestionsView] Falha ao conciliar questões excluídas:', err);
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
      handleCloseEditor();
    },
    [editingBattery, loadData, handleCloseEditor]
  );

  // Full-Page Question Editor View (Preserving Caderno's TabBar and Sidebar)
  if (editingBattery || isCreatingNew) {
    return (
      <QuizEditorModal
        isOpen={true}
        onClose={handleCloseEditor}
        initialShowAiAssistant={editorInitialAi}
        batteryTitle={editingBattery?.title || ''}
        batteryDescription={editingBattery?.description || ''}
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
        onSave={handleSaveBatteryModal}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden select-none">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/[0.04] text-zinc-300 border border-white/[0.06] shadow-xs">
            <CheckSquare size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Central de Questões</h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-zinc-400">
                {stats.totalQuestions} questões
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pratique exercícios, acompanhe sua taxa de acerto e monte simulados sob medida.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Section Switcher Tabs */}
          <div className="flex items-center bg-dark-card/50 p-1 rounded-xl border border-white/5 text-xs">
            <button
              onClick={() => setActiveTabSection('explorer')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTabSection === 'explorer'
                  ? 'bg-white/10 text-white font-medium shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Compass size={14} />
              <span>Explorador</span>
            </button>

            <button
              onClick={() => setActiveTabSection('dashboard')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTabSection === 'dashboard'
                  ? 'bg-white/10 text-white font-medium shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutDashboard size={14} />
              <span>Métricas</span>
            </button>

            <button
              onClick={() => setActiveTabSection('playlists')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTabSection === 'playlists'
                  ? 'bg-white/10 text-white font-medium shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles size={14} />
              <span>Simulados & Erros</span>
            </button>
          </div>

          {/* New Battery Button */}
          <button
            onClick={() => setIsCreatingNew(true)}
            className="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Plus size={15} />
            <span>Nova Bateria</span>
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-8">
        <div className="max-w-5xl mx-auto">
          {isLoading && batteries.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-500">
              <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-400 rounded-full animate-spin" />
              <p className="text-xs font-medium">Carregando questões...</p>
            </div>
          ) : (
            <>
              {activeTabSection === 'explorer' && (
                <QuestionsExplorer
                  batteries={batteries}
                  onPlayBattery={handlePlayBattery}
                  onEditBattery={(b) => setEditingBattery(b)}
                  onDeleteBattery={handleDeleteBattery}
                  onNavigateToPage={handleNavigateToPage}
                  allAvailableTags={allAvailableTags}
                  getPageTitle={getPageTitle}
                  highlightedBatteryId={
                    typeof activeTab?.moduleState?.selectedBatteryId === 'string'
                      ? activeTab.moduleState.selectedBatteryId
                      : undefined
                  }
                />
              )}

              {activeTabSection === 'dashboard' && (
                <QuestionsDashboard
                  stats={stats}
                  onLaunchErrorNotebook={() => setActiveTabSection('playlists')}
                  onLaunchQuickSimulation={() => setActiveTabSection('playlists')}
                  onCreateBattery={() => setIsCreatingNew(true)}
                />
              )}

              {activeTabSection === 'playlists' && (
                <QuestionsPlaylists
                  onStartSession={handleStartGeneratedSession}
                  availableTags={allAvailableTags}
                  errorCount={stats.incorrectAnswers}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Zen Focus Mode Player (Mounted via Portal) */}
      {activePlayingSession && (
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
          onDeleteQuestion={async (qId) => {
            if (activePlayingSession) {
              const updated = activePlayingSession.questions.filter((q) => q.id !== qId);
              setActivePlayingSession({
                ...activePlayingSession,
                questions: updated,
              });
              if (activePlayingSession.batteryId && window.api?.quiz) {
                try {
                  await window.api.quiz.deleteQuestion(qId);
                  await loadData(true);
                } catch (err) {
                  console.error('[QuestionsView] Falha ao excluir questão:', err);
                }
              }
            }
          }}
        />
      )}

    </div>
  );
}
