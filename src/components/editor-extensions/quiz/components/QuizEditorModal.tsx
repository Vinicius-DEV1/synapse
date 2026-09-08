import { useState, useCallback } from 'react';
import { X, Sparkles, Upload, Check } from 'lucide-react';
import { Portal } from '../../../ui/Portal';
import QuizEditor from './QuizEditor';
import QuizAIAssistant from './QuizAIAssistant';
import QuizImportModal from './QuizImportModal';
import { QuizDeleteModals } from './QuizDeleteModals';
import { createDefaultQuestion } from '../utils/fireworks';
import { useQuizAiChat } from '../hooks/useQuizAiChat';
import type { QuestionItem, QuizChatMessage } from '../types';

interface QuizEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  batteryTitle: string;
  batteryDescription?: string;
  initialQuestions: QuestionItem[];
  onSave: (title: string, description: string, questions: QuestionItem[]) => Promise<void>;
}

export function QuizEditorModal({
  isOpen,
  onClose,
  batteryTitle,
  batteryDescription = '',
  initialQuestions,
  onSave,
}: QuizEditorModalProps) {
  const [title, setTitle] = useState(batteryTitle);
  const [description, setDescription] = useState(batteryDescription);
  const [questions, setQuestions] = useState<QuestionItem[]>(() =>
    initialQuestions.length > 0 ? initialQuestions : [createDefaultQuestion(1)]
  );
  const [isSaving, setIsSaving] = useState(false);

  // Modals inside editor
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAiAssistantModal, setShowAiAssistantModal] = useState(false);
  const [deletingQuestionInfo, setDeletingQuestionInfo] = useState<{ id: string; index: number } | null>(null);

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
    <Portal>
      <div className="fixed inset-0 z-[100] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none">
        <div className="w-full max-w-4xl h-[90vh] bg-zinc-900 border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <header className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-zinc-900/90">
            <div className="flex-1 mr-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da Bateria..."
                className="text-base sm:text-lg font-semibold text-zinc-100 bg-transparent border-b border-transparent hover:border-white/10 focus:border-brand-500/50 outline-none w-full px-1 py-0.5 transition-colors"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição opcional..."
                className="text-xs text-zinc-400 bg-transparent border-b border-transparent hover:border-white/10 focus:border-brand-500/50 outline-none w-full px-1 py-0.5 mt-0.5 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAiAssistantModal(true)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-brand-500/10 text-zinc-300 hover:text-brand-300 border border-white/10 hover:border-brand-500/20 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
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
                className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Check size={14} />
                <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-1 cursor-pointer"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          {/* Body with question cards */}
          <main className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            <div className="max-w-3xl mx-auto space-y-6">
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
        </div>

        {/* AI Assistant Modal */}
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

        {/* Import Modal */}
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

        {/* Delete Confirmation Modal */}
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
    </Portal>
  );
}
