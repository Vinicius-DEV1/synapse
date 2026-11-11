import { useState, useCallback, useEffect } from 'react';
import { X, Sparkles, Upload, Check, ArrowLeft, Folder } from 'lucide-react';
import { triggerToast } from '../../../ui/ToastContext';
import QuizEditor from './QuizEditor';
import QuizAIAssistant from './QuizAIAssistant';
import QuizImportModal from './QuizImportModal';
import { QuizDeleteModals } from './QuizDeleteModals';
import { createDefaultQuestion } from '../utils/fireworks';
import { useQuizAiChat } from '../hooks/useQuizAiChat';
import type { QuestionItem, QuizChatMessage } from '../types';

interface QuizEditorModalProps {
  isOpen?: boolean;
  onClose: () => void;
  batteryTitle: string;
  batteryDescription?: string;
  initialQuestions: QuestionItem[];
  onSave: (title: string, description: string, questions: QuestionItem[], parentId?: string | null) => Promise<void>;
  initialShowAiAssistant?: boolean;
  initialParentId?: string | null;
  availableParentOptions?: Array<{ id: string; title: string; depth: number }>;
  breadcrumbs?: Array<{ id: string; title: string }>;
}

export function QuizEditorModal({
  isOpen = true,
  onClose,
  batteryTitle,
  batteryDescription = '',
  initialQuestions,
  onSave,
  initialShowAiAssistant = false,
  initialParentId = null,
  availableParentOptions,
  breadcrumbs,
}: QuizEditorModalProps) {
  const [title, setTitle] = useState(batteryTitle);
  const [description, setDescription] = useState(batteryDescription);
  const [parentId, setParentId] = useState<string | null>(initialParentId ?? null);
  const [questions, setQuestions] = useState<QuestionItem[]>(() =>
    initialQuestions.length > 0 ? initialQuestions : [createDefaultQuestion(1)]
  );
  const [isSaving, setIsSaving] = useState(false);

  // Modals inside editor
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAiAssistantModal, setShowAiAssistantModal] = useState(() => Boolean(initialShowAiAssistant));
  const [deletingQuestionInfo, setDeletingQuestionInfo] = useState<{ id: string; index: number } | null>(null);

  // Sync if initialShowAiAssistant changes when opening
  useEffect(() => {
    if (isOpen && initialShowAiAssistant) {
      setShowAiAssistantModal(true);
    }
  }, [isOpen, initialShowAiAssistant]);

  // Tecla Esc para fechar o editor com segurança se nenhum modal interno estiver aberto
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showAiAssistantModal && !showImportModal && !deletingQuestionInfo) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showAiAssistantModal, showImportModal, deletingQuestionInfo]);

  // AI chat state
  const [chatHistory, setChatHistory] = useState<QuizChatMessage[]>([]);

  const updateSingleQuestion = useCallback((qId: string, partial: Partial<QuestionItem>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qId ? { ...q, ...partial } : q))
    );
  }, []);

  const handleToggleQuestionType = useCallback(
    (q: QuestionItem, newType: 'multiple_choice' | 'open') => {
      updateSingleQuestion(q.id, {
        type: newType,
        options: newType === 'open' ? [] : (q.options.length > 0 ? q.options : ['', '', '', '']),
        correctIndex: 0,
      });
    },
    [updateSingleQuestion]
  );

  const handleMoveQuestion = useCallback((index: number, direction: 'up' | 'down') => {
    setQuestions((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }, []);

  const handleRemoveQuestion = useCallback((id: string) => {
    setQuestions((prev) => {
      const next = prev.filter((q) => q.id !== id);
      return next.length > 0 ? next : [createDefaultQuestion(1)];
    });
  }, []);

  const handleAddQuestion = useCallback(() => {
    setQuestions((prev) => [...prev, createDefaultQuestion(prev.length + 1)]);
  }, []);

  const {
    chatInput,
    setChatInput,
    isSendingChat,
    chatProgressStatus,
    handleSendChatMessage,
    handleAcceptAction,
    handleRejectAction,
    handleAcceptAllInMessage,
    handleRejectAllInMessage,
    handleClearChatHistory,
  } = useQuizAiChat({
    chatHistory,
    updateChatHistory: setChatHistory,
    questions,
    updateQuestions: setQuestions,
    updateSingleQuestion,
    handleRemoveQuestion,
    title,
    description,
  });

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      if (parentId !== null && parentId !== undefined) {
        await onSave(title, description, questions, parentId);
      } else if (initialParentId !== null && initialParentId !== undefined && parentId === null) {
        await onSave(title, description, questions, null);
      } else {
        await onSave(title, description, questions);
      }
      onClose();
    } catch (err) {
      console.error('[QuizEditorModal] Falha ao salvar alterações:', err);
      triggerToast('Falha ao salvar alterações da bateria de questões.', 'error', 3500);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full h-full flex flex-col bg-dark-bg text-zinc-100 overflow-hidden select-none animate-fade-in">
      {/* Page Header */}
      <header className="h-14 px-4 sm:px-6 border-b border-white/[0.08] bg-dark-bg/90 backdrop-blur-md flex items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/[0.08] transition-all cursor-pointer flex items-center gap-1.5 shrink-0 text-xs group"
            title="Voltar"
          >
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
            <span className="font-medium hidden sm:inline">Voltar</span>
          </button>

          <div className="flex-1 max-w-xl min-w-0">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-zinc-400 mb-0.5 truncate">
                <Folder size={11} className="text-brand-400 shrink-0" />
                {breadcrumbs.map((crumb, idx) => (
                  <span key={crumb.id} className="flex items-center gap-1">
                    {idx > 0 && <span className="text-zinc-600">/</span>}
                    <span className="truncate max-w-[120px]">{crumb.title}</span>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da Bateria..."
              className="text-base sm:text-lg font-semibold text-zinc-100 bg-transparent border-b border-transparent hover:border-white/10 focus:border-brand-500/50 outline-none w-full px-1 py-0.5 transition-colors truncate"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional..."
              className="text-xs text-zinc-400 bg-transparent border-b border-transparent hover:border-white/10 focus:border-brand-500/50 outline-none w-full px-1 py-0.5 mt-0.5 transition-colors truncate"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowAiAssistantModal(true)}
            className="px-3 py-1.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Assistente de IA"
          >
            <Sparkles size={14} className="text-brand-400" />
            <span className="hidden sm:inline">Assistente IA</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            title="Importar questões (JSON / Markdown / PDF)"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Importar</span>
          </button>

          <button
            onClick={handleConfirmSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <Check size={14} />
            <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/[0.06] transition-colors flex items-center gap-1.5 text-xs cursor-pointer ml-1"
            title="Voltar / Sair (Esc)"
          >
            <kbd className="px-1 py-0.5 text-[10px] font-mono bg-black/40 border border-white/10 rounded text-zinc-400">
              Esc
            </kbd>
            <span className="hidden sm:inline">Sair</span>
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Page Body */}
      <main className="flex-1 overflow-y-auto custom-scrollbar py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Parent Group Selector (if options available) */}
          {availableParentOptions && availableParentOptions.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-dark-card/60 border border-white/5 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <Folder size={15} className="text-brand-400 shrink-0" />
                <span className="font-medium text-zinc-200">Grupo de Questões:</span>
                <span className="text-[11px] text-zinc-500 hidden sm:inline">
                  (Organize esta bateria dentro de um grupo)
                </span>
              </div>
              <select
                value={parentId || ''}
                onChange={(e) => setParentId(e.target.value || null)}
                className="bg-dark-bg/90 text-zinc-200 border border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-brand-500/50 cursor-pointer max-w-xs transition-colors"
              >
                <option value="">Nenhum (Nível Raiz)</option>
                {availableParentOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {'\u00A0'.repeat(opt.depth * 3)}{opt.depth > 0 ? '↳ ' : ''}{opt.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <QuizEditor
            questions={questions}
            onUpdateQuestion={updateSingleQuestion}
            onToggleQuestionType={handleToggleQuestionType}
            onMoveQuestion={handleMoveQuestion}
            onDeleteQuestion={(id, idx) => setDeletingQuestionInfo({ id, index: idx })}
            onAddQuestion={handleAddQuestion}
          />
        </div>
      </main>

      {/* AI Assistant Modal (Centered dialog over page) */}
      <QuizAIAssistant
        isOpen={showAiAssistantModal}
        onClose={() => setShowAiAssistantModal(false)}
        chatHistory={chatHistory}
        chatInput={chatInput}
        setChatInput={setChatInput}
        isSendingChat={isSendingChat}
        chatProgressStatus={chatProgressStatus}
        onSendMessage={handleSendChatMessage}
        onClearHistory={handleClearChatHistory}
        onAcceptAction={handleAcceptAction}
        onRejectAction={handleRejectAction}
        onAcceptAllInMessage={handleAcceptAllInMessage}
        onRejectAllInMessage={handleRejectAllInMessage}
        questions={questions}
        currentBatteryTitle={title}
      />

      {/* Import Modal (Centered dialog over page) */}
      <QuizImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        currentBatteryQuestions={questions}
        onImport={(imported, importMode) => {
          if (importMode === 'replace') {
            setQuestions(imported);
          } else {
            // Filter out any blank draft questions so they don't linger as empty cards
            const base = questions.filter(
              (q) => String(q.question || '').trim().length > 0
            );
            setQuestions([...base, ...imported]);
          }
        }}
      />

      {/* Delete Confirmation Modal (Centered dialog over page) */}
      <QuizDeleteModals
        deletingQuestionInfo={deletingQuestionInfo}
        onCancelDeleteQuestion={() => setDeletingQuestionInfo(null)}
        onConfirmDeleteQuestion={(id) => {
          handleRemoveQuestion(id);
          setDeletingQuestionInfo(null);
        }}
        showDeleteContainerModal={false}
        totalQuestions={questions.length}
        onCancelDeleteContainer={() => {}}
        onConfirmDeleteContainer={() => {}}
      />
    </div>
  );
}

export const QuizEditorPage = QuizEditorModal;

