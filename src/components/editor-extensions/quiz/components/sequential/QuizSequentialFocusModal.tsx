import { useEffect, useRef, useState, useCallback } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { Portal } from '../../../../ui/Portal';
import QuizSequentialPlayer from '../QuizSequentialPlayer';
import QuizAIAssistant from '../QuizAIAssistant';
import { useQuizAiChat } from '../../hooks/useQuizAiChat';
import type { QuestionItem, QuizChatMessage } from '../../types';

interface QuizSequentialFocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  questions: QuestionItem[];
  onUpdateSingleQuestion: (qId: string, partial: Partial<QuestionItem>, immediate?: boolean) => void;
  onEvaluateOpenAnswer: (q: QuestionItem, index: number) => Promise<void> | void;
  evaluatingIds: Record<string, boolean>;
  onDiscussInChat?: (q: QuestionItem, index: number) => void;
  onSwitchToListLayout?: () => void;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  onDeleteQuestion?: (qId: string, index: number) => void;
  onOpenAiAssistant?: () => void;
  onEditQuestion?: () => void;
}

export function QuizSequentialFocusModal({
  isOpen,
  onClose,
  title,
  questions,
  onUpdateSingleQuestion,
  onEvaluateOpenAnswer,
  evaluatingIds,
  onDiscussInChat,
  onSwitchToListLayout,
  activeIndex,
  onActiveIndexChange,
  onDeleteQuestion,
  onOpenAiAssistant,
  onEditQuestion,
}: QuizSequentialFocusModalProps) {
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [showAiAssistantModal, setShowAiAssistantModal] = useState(false);
  const [chatHistory, setChatHistory] = useState<QuizChatMessage[]>([]);

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
    updateQuestions: () => {},
    updateSingleQuestion: onUpdateSingleQuestion,
    handleRemoveQuestion: (id) => {
      if (onDeleteQuestion) {
        const idx = questions.findIndex((q) => q.id === id);
        onDeleteQuestion(id, idx);
      }
    },
    title,
  });

  const handleInternalDiscussInChat = useCallback(
    (q: QuestionItem, index: number) => {
      setShowAiAssistantModal(true);

      const questionTag = `Questão ${index + 1}`;
      const alreadySent = chatHistory.some((m) => m.text.includes(questionTag));

      if (!alreadySent) {
        const promptMessage = `Olá! Gostaria de tirar dúvidas e aprofundar meu entendimento sobre a ${questionTag}:
"${q.question}"

Minha resposta:
"${q.userTypedAnswer || (q.selectedIndex !== null && q.options[q.selectedIndex] !== undefined ? q.options[q.selectedIndex] : '')}"

Avaliação da IA (${q.aiFeedback?.verdict || 'Resultado'}):
"${q.aiFeedback?.feedback || ''}"
${q.expectedAnswer ? `\nGabarito de referência: "${q.expectedAnswer}"` : ''}

Poderia me explicar detalhadamente os conceitos envolvidos, onde posso melhorar e me dar dicas práticas para fixar o aprendizado?`;

        handleSendChatMessage(promptMessage);
      }

      if (onDiscussInChat) {
        onDiscussInChat(q, index);
      }
    },
    [chatHistory, handleSendChatMessage, onDiscussInChat]
  );

  // Auto-focus the player on open so all keyboard shortcuts work instantly
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const playerEl = modalContainerRef.current?.querySelector<HTMLElement>('[tabindex="0"]');
      if (playerEl) {
        playerEl.focus();
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Tecla Esc para fechar o modo foco (se o assistente não estiver aberto)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAiAssistantModal) {
          return;
        }
        e.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showAiAssistantModal]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        ref={modalContainerRef}
        className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col animate-fade-in select-none text-zinc-100"
      >
        {/* Minimalist Zen Header */}
        <header className="h-13 px-5 sm:px-6 border-b border-white/[0.06] bg-zinc-950/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 shrink-0">
              <HelpCircle size={16} />
            </div>
            <h3 className="text-sm font-medium text-zinc-200 truncate max-w-xs sm:max-w-md">
              {title || 'Bateria de Exercícios'}
            </h3>
            <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 shrink-0">
              Modo Foco
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/[0.06] transition-colors flex items-center gap-1.5 text-xs cursor-pointer shadow-xs"
              title="Fechar (Esc)"
            >
              <kbd className="px-1 py-0.5 text-[10px] font-mono bg-black/40 border border-white/10 rounded text-zinc-400">
                Esc
              </kbd>
              <span className="hidden sm:inline">Sair</span>
              <X size={14} />
            </button>
          </div>
        </header>

        {/* Central Reading Measure (Zen Focus Canvas) */}
        <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center py-6 md:py-10 px-4">
          <div className="w-full max-w-3xl mx-auto space-y-6">
            <QuizSequentialPlayer
              questions={questions}
              onUpdateSingleQuestion={onUpdateSingleQuestion}
              onEvaluateOpenAnswer={onEvaluateOpenAnswer}
              evaluatingIds={evaluatingIds}
              onDiscussInChat={handleInternalDiscussInChat}
              onSwitchToListLayout={onSwitchToListLayout}
              activeIndex={activeIndex}
              onActiveIndexChange={onActiveIndexChange}
              onDeleteQuestion={onDeleteQuestion}
              onOpenAiAssistant={onOpenAiAssistant || (() => setShowAiAssistantModal(true))}
              onEditQuestion={onEditQuestion}
            />
          </div>
        </main>

        {/* Assistente de IA para Discussão de Questões no Modo Foco */}
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
      </div>
    </Portal>
  );
}

