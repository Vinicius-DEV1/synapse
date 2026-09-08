import { useState, useCallback, useEffect } from 'react';
import { X, Sparkles, Upload, Check, ArrowLeft } from 'lucide-react';
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
  onSave: (title: string, description: string, questions: QuestionItem[]) => Promise<void>;
  initialShowAiAssistant?: boolean;
}

export function QuizEditorModal({
  isOpen = true,
  onClose,
  batteryTitle,
  batteryDescription = '',
  initialQuestions,
  onSave,
  initialShowAiAssistant = false,
}: QuizEditorModalProps) {
  const [title, setTitle] = useState(batteryTitle);
  const [description, setDescription] = useState(batteryDescription);
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
      await onSave(title, description, questions);
      onClose();
    } catch (err) {
      console.error('[QuizEditorModal] Falha ao salvar alterações:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden select-none animate-fade-in">
      {/* Page Header */}
      <header className="h-14 px-4 sm:px-6 border-b border-white/[0.08] bg-zinc-950/90 backdrop-blur-md flex items-center justify-between shrink-0 gap-4">
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
            const base = questions.length === 1 && !String(questions[0]?.question || '').trim() ? [] : questions;
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

