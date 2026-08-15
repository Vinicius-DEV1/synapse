import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Check,
  Trash2,
  PlusCircle,
  Edit3,
} from 'lucide-react';
import { Portal } from '../../../ui/Portal';
import { markdownComponents, preprocessMarkdownCode } from '../utils/markdownPreprocess';
import type { QuestionItem, QuizChatMessage, SuggestedAction } from '../types';

interface QuizAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: QuizChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  isSendingChat: boolean;
  onSendMessage: (override?: string) => Promise<void>;
  onClearHistory: () => void;
  onAcceptAction: (action: SuggestedAction) => void;
  onRejectAction: (action: SuggestedAction) => void;
  questions: QuestionItem[];
}

export default function QuizAIAssistant({
  isOpen,
  onClose,
  chatHistory,
  chatInput,
  setChatInput,
  isSendingChat,
  onSendMessage,
  onClearHistory,
  onAcceptAction,
  onRejectAction,
  questions,
}: QuizAIAssistantProps) {
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [isOpen, chatHistory, isSendingChat]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in"
        onClick={onClose}
      >
        <div
          className="bg-dark-card border border-purple-500/30 rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-purple-950/30">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">
                  Assistente de IA para Exercícios
                </h3>
                <p className="text-[11px] text-purple-200/70">
                  Crie, aprimore e revise suas questões interativamente
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {chatHistory.length > 0 && (
                <button
                  onClick={onClearHistory}
                  className="text-xs text-dark-subtext hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1"
                  title="Limpar histórico"
                >
                  <Trash2 size={14} />
                  <span>Limpar</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-dark-subtext hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div
            ref={chatScrollRef}
            className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar bg-black/30"
          >
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 opacity-60">
                <Sparkles size={36} className="text-purple-400" />
                <p className="text-sm text-purple-200">
                  Como posso te ajudar com esta bateria de exercícios hoje?
                </p>
                <div className="flex flex-wrap justify-center gap-2 max-w-md pt-2">
                  <button
                    onClick={() =>
                      onSendMessage(
                        'Crie 3 questões de nível intermediário sobre este tema com explicações didáticas.'
                      )
                    }
                    className="text-xs px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-200 transition-colors"
                  >
                    ✨ Gerar 3 questões
                  </button>
                  <button
                    onClick={() =>
                      onSendMessage(
                        'Revise a didática das alternativas de todas as questões e sugira distratores melhores.'
                      )
                    }
                    className="text-xs px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-200 transition-colors"
                  >
                    🔍 Revisar pegadinhas e clareza
                  </button>
                  <button
                    onClick={() =>
                      onSendMessage(
                        'Adicione tags temáticas e aprofunde as explicações do gabarito.'
                      )
                    }
                    className="text-xs px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-200 transition-colors"
                  >
                    🏷️ Adicionar tags e explicações
                  </button>
                </div>
              </div>
            ) : (
              chatHistory.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-2 ${
                        isUser
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                          : 'bg-dark-card border border-purple-500/20 text-purple-100 shadow-lg'
                      }`}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents as any}
                      >
                        {preprocessMarkdownCode(msg.text)}
                      </ReactMarkdown>

                      {/* Sugestões de Ação da IA */}
                      {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-purple-500/20 space-y-2.5">
                          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                            Ações Propostas ({msg.suggestedActions.length}):
                          </span>
                          {msg.suggestedActions.map((action) => {
                            const isPending = action.status === 'pending';
                            const isAccepted = action.status === 'accepted';
                            const isRejected = action.status === 'rejected';

                            return (
                              <div
                                key={action.id}
                                className={`p-3 rounded-xl border space-y-2 text-xs transition-all ${
                                  isAccepted
                                    ? 'bg-green-500/10 border-green-500/30 text-green-200'
                                    : isRejected
                                      ? 'bg-red-500/10 border-red-500/30 text-red-300 opacity-60'
                                      : 'bg-purple-950/40 border-purple-500/30 text-purple-100'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold flex items-center gap-1.5">
                                    {action.actionType === 'create' && (
                                      <PlusCircle size={14} className="text-green-400" />
                                    )}
                                    {action.actionType === 'edit' && (
                                      <Edit3 size={14} className="text-amber-400" />
                                    )}
                                    {action.actionType === 'delete' && (
                                      <Trash2 size={14} className="text-red-400" />
                                    )}
                                    {action.actionType === 'create' && 'Criar Nova Questão'}
                                    {action.actionType === 'edit' &&
                                      `Editar Questão #${(action.targetQuestionIndex ?? 0) + 1}`}
                                    {action.actionType === 'delete' &&
                                      `Excluir Questão #${(action.targetQuestionIndex ?? 0) + 1}`}
                                  </span>

                                  {isPending && (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => onAcceptAction(action)}
                                        className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center gap-1 text-[11px] transition-colors"
                                      >
                                        <Check size={12} />
                                        <span>Aplicar</span>
                                      </button>
                                      <button
                                        onClick={() => onRejectAction(action)}
                                        className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-medium flex items-center gap-1 text-[11px] transition-colors"
                                      >
                                        <X size={12} />
                                        <span>Rejeitar</span>
                                      </button>
                                    </div>
                                  )}

                                  {!isPending && (
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                        isAccepted
                                          ? 'bg-green-500/20 text-green-300'
                                          : 'bg-red-500/20 text-red-300'
                                      }`}
                                    >
                                      {isAccepted ? 'Aplicado' : 'Rejeitado'}
                                    </span>
                                  )}
                                </div>

                                {action.reason && (
                                  <p className="text-[11px] opacity-80 italic">
                                    Motivo: {action.reason}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isSendingChat && (
              <div className="flex items-center gap-2 text-purple-300 text-xs p-3 bg-purple-950/30 border border-purple-500/20 rounded-2xl w-fit">
                <Loader2 size={16} className="animate-spin text-purple-400" />
                <span>A IA está processando seu pedido...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-purple-500/20 bg-purple-950/20 flex items-center gap-3">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              placeholder="Digite sua mensagem para a IA..."
              className="flex-1 bg-black/50 border border-purple-500/20 focus:border-purple-500/60 rounded-xl px-4 py-2.5 text-xs text-purple-100 placeholder-white/25 outline-none transition-colors"
            />
            <button
              onClick={() => onSendMessage()}
              disabled={isSendingChat || !chatInput.trim()}
              className="p-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl shadow-lg shadow-purple-600/30 transition-colors"
            >
              {isSendingChat ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
