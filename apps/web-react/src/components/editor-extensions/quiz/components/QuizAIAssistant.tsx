import { useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Trash2,
  AtSign,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { Portal } from '../../../ui/Portal';
import { getSettings } from '../../../../utils/settings';
import { useQuizBatteryMentions } from '../hooks/useQuizBatteryMentions';
import { QuizAiQuickShortcuts } from './ai/QuizAiQuickShortcuts';
import { QuizAiMessageItem } from './ai/QuizAiMessageItem';
import type { QuestionItem, QuizChatMessage, SuggestedAction, ReferencedBattery } from '../types';
import type { ChatProgressStatus } from '../hooks/useQuizAiChat';

interface QuizAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: QuizChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  isSendingChat: boolean;
  chatProgressStatus?: ChatProgressStatus | null;
  onSendMessage: (override?: string, referencedBatteries?: ReferencedBattery[]) => Promise<void>;
  onClearHistory: () => void;
  onAcceptAction: (action: SuggestedAction) => void;
  onRejectAction: (action: SuggestedAction) => void;
  onAcceptAllInMessage?: (msgId: string) => void;
  onRejectAllInMessage?: (msgId: string) => void;
  questions: QuestionItem[];
  currentBatteryTitle?: string;
}

export default function QuizAIAssistant({
  isOpen,
  onClose,
  chatHistory,
  chatInput,
  setChatInput,
  isSendingChat,
  chatProgressStatus,
  onSendMessage,
  onClearHistory,
  onAcceptAction,
  onRejectAction,
  onAcceptAllInMessage,
  onRejectAllInMessage,
  questions,
  currentBatteryTitle,
}: QuizAIAssistantProps) {
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    attachedBatteries,
    showMentionMenu,
    setShowMentionMenu,
    mentionQuery,
    mentionSelectedIndex,
    filteredBatteries,
    handleAttachBattery,
    handleRemoveBattery,
    handleInputChange,
    handleKeyDown: handleMentionKeyDown,
  } = useQuizBatteryMentions(chatInput, setChatInput, currentBatteryTitle);

  useEffect(() => {
    if (isOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      const rafId = requestAnimationFrame(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      });
      const timerId = setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 80);
      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timerId);
      };
    }
  }, [isOpen, chatHistory, isSendingChat]);

  // Adjust textarea height on chatInput changes
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(Math.max(el.scrollHeight, 42), 140)}px`;
    }
  }, [chatInput]);

  // Handle Escape key to close modal or mention menu
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMentionMenu) {
          e.preventDefault();
          e.stopPropagation();
          setShowMentionMenu(false);
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showMentionMenu, setShowMentionMenu]);

  const modelName = useMemo(() => {
    try {
      const s = getSettings();
      return (s.geminiModel || 'gemini').replace(/^models\//, '');
    } catch {
      return 'gemini';
    }
  }, []);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
        onClick={onClose}
      >
        <div
          className="bg-dark-card border border-purple-500/30 rounded-3xl w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-gradient-to-r from-purple-950/50 via-dark-card to-purple-950/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-300 shadow-md shadow-purple-500/10">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                  <span>Assistente de IA para Exercícios</span>
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-full font-semibold flex items-center gap-1"
                    title={`Modelo IA: ${modelName}`}
                  >
                    <span>Gemini AI</span>
                    {modelName && (
                      <>
                        <span className="opacity-40">•</span>
                        <span>{modelName}</span>
                      </>
                    )}
                  </span>
                </h3>
                <p className="text-xs text-purple-200/70">
                  Crie, aprimore, avalie e revise suas questões interativamente
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {chatHistory.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="text-xs text-dark-subtext hover:text-red-400 px-3 py-1.5 rounded-xl hover:bg-white/5 transition-colors flex items-center gap-1.5 border border-white/5"
                  title="Limpar histórico da conversa"
                >
                  <Trash2 size={13} />
                  <span>Limpar Histórico</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-dark-subtext hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                title="Fechar (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div
            ref={chatScrollRef}
            className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar bg-black/40"
          >
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="w-14 h-14 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/10">
                  <Sparkles size={28} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-purple-100">
                    Como posso te ajudar com esta bateria de exercícios hoje?
                  </h4>
                  <p className="text-xs text-dark-subtext max-w-md">
                    Peça novas questões, correções didáticas, ajustes de pegadinhas ou explicações aprofundadas.
                  </p>
                </div>
                <QuizAiQuickShortcuts onSendMessage={onSendMessage} />
              </div>
            ) : (
              chatHistory.map((msg) => (
                <QuizAiMessageItem
                  key={msg.id}
                  msg={msg}
                  questions={questions}
                  onAcceptAction={onAcceptAction}
                  onRejectAction={onRejectAction}
                  onAcceptAllInMessage={onAcceptAllInMessage}
                  onRejectAllInMessage={onRejectAllInMessage}
                />
              ))
            )}

            {isSendingChat && (
              <div className="flex items-center gap-3 text-xs p-3 bg-purple-950/40 border border-purple-500/30 rounded-2xl w-fit shadow-lg shadow-purple-950/30 animate-fade-in">
                {chatProgressStatus?.step === 'validating' ? (
                  <>
                    <ShieldCheck size={16} className="text-emerald-400 animate-pulse shrink-0" />
                    <span className="font-medium text-emerald-200">
                      Revisando precisão e validando fatos com 2ª IA...
                    </span>
                    {chatProgressStatus.model && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded">
                        {chatProgressStatus.model}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Loader2 size={16} className="animate-spin text-purple-400 shrink-0" />
                    <span className="font-medium text-purple-200">
                      Gerando questões com IA...
                    </span>
                    {chatProgressStatus?.model && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded">
                        {chatProgressStatus.model}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Chips de Baterias Referenciadas */}
          {attachedBatteries.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap px-5 py-2.5 border-t border-purple-500/20 bg-dark-bg/80">
              <span className="text-[11px] text-purple-300 font-semibold flex items-center gap-1.5">
                <Layers size={13} className="text-purple-400" />
                <span>Baterias de Referência ({attachedBatteries.length}):</span>
              </span>
              {attachedBatteries.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-200 text-xs font-medium shadow-sm animate-fade-in"
                >
                  <span className="font-semibold">@{b.title}</span>
                  <span className="text-[10px] opacity-75">({b.questionCount} q.)</span>
                  <button
                    onClick={() => handleRemoveBattery(b.id)}
                    className="hover:text-white hover:bg-white/10 p-0.5 rounded transition-colors ml-0.5"
                    title="Remover referência"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              <span className="text-[10px] text-dark-subtext italic ml-auto hidden sm:inline">
                A IA evitará repetir questões já existentes nessas baterias
              </span>
            </div>
          )}

          {/* Chat Input & Mention Menu */}
          <div className="p-4 border-t border-purple-500/20 bg-gradient-to-r from-purple-950/30 via-dark-card to-purple-950/20 relative flex items-end gap-3">
            {/* Popover de Menções com @ */}
            {showMentionMenu && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-dark-card border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden z-30 max-h-64 flex flex-col animate-fade-in">
                <div className="px-3.5 py-2 bg-purple-950/70 border-b border-purple-500/20 text-[11px] font-semibold text-purple-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <AtSign size={13} className="text-purple-400" />
                    <span>Referenciar Bateria de Exercícios</span>
                  </span>
                  <span className="text-[10px] text-dark-subtext">Use ↑ ↓ e Enter para selecionar</span>
                </div>
                <div className="overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                  {filteredBatteries.length === 0 ? (
                    <div className="p-4 text-center text-xs text-dark-subtext">
                      Nenhuma bateria de exercícios encontrada {mentionQuery ? `com "${mentionQuery}"` : 'no app'}.
                    </div>
                  ) : (
                    filteredBatteries.map((b, idx) => {
                      const isSelected = idx === mentionSelectedIndex;
                      return (
                        <button
                          key={b.id}
                          onClick={() => handleAttachBattery(b)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-3 transition-colors ${
                            isSelected
                              ? 'bg-purple-600 text-white font-medium shadow-sm'
                              : 'hover:bg-white/5 text-purple-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="p-1 rounded-lg bg-black/40 border border-white/10 text-purple-300 text-xs shrink-0">
                              🎯
                            </span>
                            <div className="truncate">
                              <span className="font-semibold block truncate">{b.title}</span>
                              <span className={`block text-[10px] truncate ${isSelected ? 'text-purple-200' : 'text-dark-subtext'}`}>
                                Página: {b.pageTitle}
                              </span>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-mono ${
                            isSelected ? 'bg-purple-700 text-purple-100' : 'bg-white/5 text-purple-300 border border-white/5'
                          }`}>
                            {b.questionCount} {b.questionCount === 1 ? 'questão' : 'questões'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                rows={1}
                value={chatInput}
                onChange={(e) => {
                  handleInputChange(e);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(Math.max(e.target.scrollHeight, 42), 140)}px`;
                }}
                onKeyDown={(e) => {
                  const intercepted = handleMentionKeyDown(e);
                  if (intercepted) return;

                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (chatInput.trim() && !isSendingChat) {
                      onSendMessage(undefined, attachedBatteries);
                      if (textareaRef.current) {
                        textareaRef.current.style.height = 'auto';
                      }
                    }
                  }
                }}
                placeholder="Digite seu pedido para a IA... (Shift+Enter para nova linha, @ para referenciar outras baterias)"
                className="w-full bg-black/50 border border-purple-500/20 focus:border-purple-500/60 rounded-xl pl-4 pr-10 py-2.5 text-xs text-purple-100 placeholder-white/25 outline-none transition-all shadow-inner resize-none min-h-[42px] max-h-[140px] overflow-y-auto leading-relaxed break-words"
              />
              <button
                type="button"
                onClick={() => setShowMentionMenu((prev) => !prev)}
                className={`absolute right-3 top-2.5 p-1 rounded-lg transition-colors text-xs flex items-center gap-0.5 ${
                  showMentionMenu ? 'bg-purple-500/30 text-white' : 'text-purple-400/60 hover:text-purple-300'
                }`}
                title="Referenciar outra bateria de exercícios (@)"
              >
                <AtSign size={14} />
              </button>
            </div>

            <button
              onClick={() => {
                if (chatInput.trim() && !isSendingChat) {
                  onSendMessage(undefined, attachedBatteries);
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                  }
                }
              }}
              disabled={isSendingChat || !chatInput.trim()}
              className="px-4 py-2.5 h-[42px] bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl shadow-lg shadow-purple-600/30 transition-all font-semibold text-xs flex items-center justify-center gap-2 shrink-0"
            >
              {isSendingChat ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              <span>Enviar</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
