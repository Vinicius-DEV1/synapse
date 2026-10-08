import { useState, useRef, useEffect, useCallback } from 'react';
import { X, AlertTriangle, Settings, Layers, AtSign } from 'lucide-react';
import { Portal } from '../../../ui/Portal';
import { DocumentDiffViewer } from '../components/DocumentDiffViewer';
import { useQuizBatteryMentions } from '../../../editor-extensions/quiz/hooks/useQuizBatteryMentions';
import { appendQuestionsToBattery } from '../services/quizBatteryAppender';
import {
  sendDocumentAiPrompt,
  type DocumentAiMessage,
} from '../services/documentAiService';
import type { QuestionItem, ReferencedBattery } from '../../../editor-extensions/quiz/types';
import { DocumentAiHeader } from './components/DocumentAiHeader';
import { DocumentAiMessageList } from './components/DocumentAiMessageList';
import { DocumentAiInputBar } from './components/DocumentAiInputBar';

interface DocumentAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentText: string;
  onApplyChanges: (newText: string) => Promise<boolean>;
}

export function DocumentAiModal({
  isOpen,
  onClose,
  documentTitle,
  documentText,
  onApplyChanges,
}: DocumentAiModalProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'diff'>('chat');
  const [messages, setMessages] = useState<DocumentAiMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposedMarkdown, setProposedMarkdown] = useState<string | null>(null);
  const [addedQuestionMessageIndices, setAddedQuestionMessageIndices] = useState<Set<number>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attachedBatteries,
    showMentionMenu,
    mentionQuery,
    mentionSelectedIndex,
    filteredBatteries,
    handleAttachBattery,
    handleRemoveBattery,
    handleInputChange,
    handleKeyDown: handleMentionKeyDown,
  } = useQuizBatteryMentions(inputPrompt, setInputPrompt);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = useCallback(
    async (instructionText?: string) => {
      const promptText = (instructionText || inputPrompt).trim();
      if (!promptText || isLoading) return;

      setInputPrompt('');
      setError(null);
      setIsLoading(true);

      const userMsg: DocumentAiMessage = { role: 'user', text: promptText };
      const updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);

      try {
        const result = await sendDocumentAiPrompt({
          documentText: proposedMarkdown || documentText,
          documentTitle,
          userInstruction: promptText,
          history: updatedHistory,
          referencedBatteries: attachedBatteries,
        });

        const modelMsg: DocumentAiMessage = {
          role: 'model',
          text: result.chatText,
          proposedMarkdown: result.proposedMarkdown,
          generatedQuestions: result.generatedQuestions,
          targetBattery: result.targetBattery,
        };

        setMessages((prev) => [...prev, modelMsg]);

        if (result.proposedMarkdown && result.hasChanges) {
          setProposedMarkdown(result.proposedMarkdown);
          setActiveTab('diff');
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao processar instrução da IA.';
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [inputPrompt, isLoading, messages, proposedMarkdown, documentText, documentTitle, attachedBatteries]
  );

  const handleApply = async (updatedContent: string) => {
    const success = await onApplyChanges(updatedContent);
    if (success) {
      setProposedMarkdown(null);
      setActiveTab('chat');
      onClose();
    }
  };

  const handleDiscard = () => {
    setProposedMarkdown(null);
    setActiveTab('chat');
  };

  const handleAddQuestions = async (
    battery: ReferencedBattery,
    questions: QuestionItem[],
    msgIndex: number
  ) => {
    const ok = await appendQuestionsToBattery(battery, questions);
    if (ok) {
      setAddedQuestionMessageIndices((prev) => new Set(prev).add(msgIndex));
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
        <div className="relative flex flex-col w-full max-w-4xl h-[85vh] bg-dark-card/95 border border-brand-500/30 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
          {/* Header */}
          <DocumentAiHeader
            documentTitle={documentTitle}
            activeTab={activeTab}
            proposedMarkdown={proposedMarkdown}
            onSelectTab={setActiveTab}
            onClose={onClose}
          />

          {/* Body Content */}
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'diff' && proposedMarkdown ? (
              <DocumentDiffViewer
                originalText={documentText}
                proposedText={proposedMarkdown}
                onApply={handleApply}
                onDiscard={handleDiscard}
              />
            ) : (
              <div className="flex flex-col h-full">
                {/* Chat Messages */}
                <DocumentAiMessageList
                  messages={messages}
                  isLoading={isLoading}
                  addedQuestionMessageIndices={addedQuestionMessageIndices}
                  messagesEndRef={messagesEndRef}
                  onSelectSuggestion={handleSendMessage}
                  onViewDiff={(markdown) => {
                    setProposedMarkdown(markdown);
                    setActiveTab('diff');
                  }}
                  onAddQuestions={handleAddQuestions}
                />

                {/* Error Banner */}
                {error && (
                  <div className="mx-6 mb-2 p-3 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-between text-xs text-red-300">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} className="text-red-400 shrink-0" />
                      <span>{error}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {error.includes('Configurações') && (
                        <button
                          type="button"
                          onClick={() => {
                            window.dispatchEvent(
                              new CustomEvent('open-settings', { detail: { tab: 'ai' } })
                            );
                          }}
                          className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Settings size={12} />
                          <span>Configurações</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setError(null)}
                        className="p-1 hover:text-white transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Attached Batteries Pill Bar */}
                {attachedBatteries.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 px-6 py-2 bg-dark-bg/80 border-t border-white/5">
                    <span className="text-[11px] text-dark-subtext flex items-center gap-1 mr-1">
                      <AtSign size={12} className="text-brand-400" />
                      <span>Baterias referenciadas:</span>
                    </span>
                    {attachedBatteries.map((bat) => (
                      <div
                        key={bat.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-brand-500/20 border border-brand-500/40 rounded-lg text-xs text-brand-300 animate-fade-in"
                      >
                        <Layers size={12} className="text-brand-400" />
                        <span className="font-medium max-w-[180px] truncate">{bat.title}</span>
                        <span className="text-[10px] text-dark-subtext">({bat.questionCount} q.)</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBattery(bat.id)}
                          className="p-0.5 hover:text-white rounded transition-colors ml-0.5"
                          title="Remover referência"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Prompt Input Bar with Autocomplete Dropdown */}
                <DocumentAiInputBar
                  inputPrompt={inputPrompt}
                  isLoading={isLoading}
                  inputRef={inputRef}
                  showMentionMenu={showMentionMenu}
                  mentionQuery={mentionQuery}
                  mentionSelectedIndex={mentionSelectedIndex}
                  filteredBatteries={filteredBatteries}
                  onInputChange={handleInputChange}
                  onKeyDown={handleMentionKeyDown}
                  onAttachBattery={handleAttachBattery}
                  onSubmit={handleSendMessage}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
