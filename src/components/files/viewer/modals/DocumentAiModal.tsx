import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Send, Loader2, FileDiff, MessageSquare, AlertTriangle, Settings } from 'lucide-react';
import { Portal } from '../../../ui/Portal';
import { DocumentDiffViewer } from '../components/DocumentDiffViewer';
import {
  sendDocumentAiPrompt,
  type DocumentAiMessage,
} from '../services/documentAiService';

interface DocumentAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentText: string;
  onApplyChanges: (newText: string) => Promise<boolean>;
}

const QUICK_SUGGESTIONS = [
  '🔍 Aprofundar o tópico principal',
  '✍️ Melhorar clareza e estilo',
  '✂️ Remover redundâncias e simplificar',
  '📝 Adicionar introdução e conclusão',
  '📊 Estruturar em tópicos e tabelas',
];

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        });

        const modelMsg: DocumentAiMessage = {
          role: 'model',
          text: result.chatText,
          proposedMarkdown: result.proposedMarkdown,
        };

        setMessages((prev) => [...prev, modelMsg]);

        if (result.proposedMarkdown && result.hasChanges) {
          setProposedMarkdown(result.proposedMarkdown);
          // Automatically offer diff tab switch
          setActiveTab('diff');
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao processar instrução da IA.';
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [inputPrompt, isLoading, messages, proposedMarkdown, documentText, documentTitle]
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

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
        <div className="relative flex flex-col w-full max-w-4xl h-[85vh] bg-dark-card/95 border border-brand-500/30 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-dark-bg/60">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-500/20 text-brand-400 rounded-xl">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  <span>Assistente IA:</span>
                  <span className="text-brand-300 font-mono text-xs">{documentTitle}</span>
                </h3>
                <p className="text-[11px] text-dark-subtext">
                  Contexto ativo do documento • Peça análises, ampliações ou edições
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Tabs Switcher */}
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    activeTab === 'chat' ? 'bg-brand-500 text-white' : 'text-dark-subtext hover:text-white'
                  }`}
                >
                  <MessageSquare size={14} />
                  <span>Chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('diff')}
                  disabled={!proposedMarkdown}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    activeTab === 'diff'
                      ? 'bg-brand-500 text-white'
                      : proposedMarkdown
                      ? 'text-brand-300 hover:text-white hover:bg-white/10'
                      : 'text-dark-subtext/40 cursor-not-allowed'
                  }`}
                >
                  <FileDiff size={14} />
                  <span>Revisão (Diff)</span>
                  {proposedMarkdown && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                title="Fechar assistente"
              >
                <X size={18} />
              </button>
            </div>
          </div>

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
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto text-dark-subtext">
                      <div className="p-4 bg-brand-500/10 text-brand-400 rounded-2xl mb-3">
                        <Sparkles size={32} />
                      </div>
                      <h4 className="text-white font-medium text-base mb-1">
                        Como posso ajudar com este documento?
                      </h4>
                      <p className="text-xs leading-relaxed mb-6">
                        Você pode me pedir para aprofundar um conceito, reformular trechos, remover tópicos ou organizar as seções em tabelas.
                      </p>

                      <div className="flex flex-wrap gap-2 justify-center">
                        {QUICK_SUGGESTIONS.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => handleSendMessage(sug)}
                            className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-brand-500/20 hover:border-brand-500/40 text-xs text-gray-300 hover:text-white transition-all text-left"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-md ${
                          msg.role === 'user'
                            ? 'bg-brand-600 text-white rounded-tr-sm'
                            : 'bg-dark-bg/80 border border-white/10 text-gray-200 rounded-tl-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {msg.proposedMarkdown && (
                          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                              ✓ Nova versão do documento gerada
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setProposedMarkdown(msg.proposedMarkdown || null);
                                setActiveTab('diff');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition-colors flex items-center gap-1"
                            >
                              <FileDiff size={13} />
                              <span>Ver Alterações (Diff)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-dark-bg/80 border border-white/10 text-brand-400 text-xs shadow-md">
                        <Loader2 size={15} className="animate-spin" />
                        <span>Analisando documento e formulando resposta...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

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

                {/* Prompt Input Bar */}
                <div className="p-4 border-t border-white/10 bg-dark-bg/60">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputPrompt}
                      onChange={(e) => setInputPrompt(e.target.value)}
                      placeholder="Peça à IA para editar o documento, expandir um ponto, resumir..."
                      disabled={isLoading}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-xs text-white placeholder:text-dark-subtext outline-none transition-colors"
                    />

                    <button
                      type="submit"
                      disabled={!inputPrompt.trim() || isLoading}
                      className="p-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:hover:bg-brand-500 text-white transition-all shadow-lg shadow-brand-950/40 active:scale-95"
                      title="Enviar instrução"
                    >
                      {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
