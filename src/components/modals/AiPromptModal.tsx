import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Image as ImageIcon, FileText, Trash2, Plus, Send, Check, Copy } from 'lucide-react';
import { promptGemini } from '../../services/gemini';
import { Portal } from '../ui/Portal';
import { AiChatMarkdown } from '../ai-sidebar/AiChatMarkdown';
import type { AiChatMessage, AiChatMessagePart } from '../../types/store';

export type { AiChatMessage, AiChatMessagePart };

export interface AiPromptModalProps {
  x: number;
  y: number;
  chatId: string;
  messages: AiChatMessage[];
  contextText?: string;
  contextImage?: string; // base64
  onMessageAdd: (chatId: string, msgs: AiChatMessage[]) => void;
  onClear: (chatId: string) => void;
  onClose: () => void;
  onSuccess?: (response: string) => void;
  blockBadge?: string;
  blockTitle?: string;
  systemInstruction?: string;
  targetType?: 'toggle' | 'blockquoteToggle' | 'code' | 'blockquote' | 'generic';
  onApplyReplacement?: (replacementText: string, newTitle?: string) => void;
  onInsertContent?: (content: string) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export default function AiPromptModal({
  x,
  y,
  chatId,
  messages,
  contextText,
  contextImage,
  onMessageAdd,
  onClear,
  onClose,
  onSuccess,
  blockBadge,
  blockTitle,
  systemInstruction,
  targetType = 'generic',
  onApplyReplacement,
  onInsertContent,
  anchorRef,
}: AiPromptModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef?.current && anchorRef.current.contains(target)) {
        return;
      }
      if (modalRef.current && !modalRef.current.contains(target)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, anchorRef]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !contextText && !contextImage) return;

    setLoading(true);
    setError('');

    try {
      const isFirst = messages.length === 0;
      const finalPrompt = isFirst && contextText ? `Contexto:\n"${contextText}"\n\nInstrução:\n${prompt}` : prompt;
      const imageToPass = isFirst ? contextImage : undefined;

      const { getSettings } = await import('../../utils/settings');
      const settings = getSettings();
      const responseObj = await promptGemini(
        finalPrompt,
        imageToPass,
        messages,
        settings.geminiModelChat || settings.geminiModel,
        systemInstruction
      );
      const response = responseObj.text;

      const newUserParts: AiChatMessagePart[] = [{ text: finalPrompt }];
      if (imageToPass) {
        const mimeTypeMatch = imageToPass.match(/^data:(.*?);base64,/);
        let mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
        if (mimeType.includes(';')) mimeType = mimeType.split(';')[0];
        const base64Data = imageToPass.replace(/^data:.*?;base64,/, '');
        newUserParts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
      }

      const newUserMsg: AiChatMessage = { role: 'user', parts: newUserParts };
      const newModelMsg: AiChatMessage = { role: 'model', parts: [{ text: response }] };

      onMessageAdd(chatId, [...messages, newUserMsg, newModelMsg]);
      setPrompt('');
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Erro ao comunicar com a IA';
      setError(errMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text: string, idx: number) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedMessageIndex(idx);
        setTimeout(() => setCopiedMessageIndex(null), 2000);
      })
      .catch((err) => {
        console.error('Falha ao copiar:', err);
      });
  };

  const parseModelProposal = (text: string) => {
    let cleanText = text;
    let proposedTitle: string | undefined;

    if (targetType === 'code') {
      const codeBlockMatch = text.match(/```(?:[a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleanText = codeBlockMatch[1].trim();
      } else {
        cleanText = text.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```$/, '').trim();
      }
    } else if (targetType === 'toggle' || targetType === 'blockquoteToggle' || targetType === 'blockquote') {
      const titleMatch = text.match(/^(?:Título|Titulo|Title):\s*(.+)$/m);
      if (titleMatch) {
        proposedTitle = titleMatch[1].trim().replace(/^\*+|\*+$/g, '');
      }
      const mdMatch = text.match(/```(?:markdown)?\s*\n([\s\S]*?)```/);
      if (mdMatch) {
        cleanText = mdMatch[1].trim();
      } else if (proposedTitle) {
        cleanText = text.replace(/^(?:Título|Titulo|Title):\s*.+$/m, '').trim();
      }
    }

    return { cleanText, proposedTitle };
  };

  const adjustedX = Math.max(16, Math.min(x, window.innerWidth - 380));
  const adjustedY = Math.max(16, Math.min(y, window.innerHeight - 450));

  const headerTitle = blockBadge || 'Assistente de IA';

  return (
    <Portal>
      <div
        ref={modalRef}
        className="fixed z-[100] w-[370px] max-h-[520px] flex flex-col bg-[#12141a] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-scale-in select-none text-zinc-100"
        style={{ left: adjustedX, top: adjustedY }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-brand-400 font-medium text-xs tracking-wide">
            <Sparkles size={14} className="animate-pulse" />
            <span className="truncate max-w-[200px]" title={headerTitle}>
              {headerTitle}
            </span>
            {blockTitle && (
              <span className="text-[10px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 truncate max-w-[90px]">
                {blockTitle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => onClear(chatId)}
                className="p-1 text-zinc-400 hover:text-red-400 hover:bg-white/5 rounded transition-colors"
                title="Limpar conversa"
              >
                <Trash2 size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-white hover:bg-white/5 rounded transition-colors"
              title="Fechar (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5 min-h-[140px] max-h-[320px] custom-scrollbar text-xs">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-xs space-y-2 py-6">
              <Sparkles size={22} className="opacity-30 text-brand-400" />
              <p className="font-medium text-zinc-300">Como posso ajudar com este bloco?</p>
              <p className="text-[11px] text-zinc-500 text-center max-w-[240px]">
                O escopo de edição está estritamente restrito a este elemento.
              </p>
              {(contextText || contextImage) && (
                <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-2.5 py-1.5 mt-2 border border-white/5 max-w-[92%]">
                  {contextImage ? (
                    <ImageIcon size={13} className="shrink-0 text-brand-400" />
                  ) : (
                    <FileText size={13} className="shrink-0 text-brand-400" />
                  )}
                  <span className="truncate text-[11px] text-zinc-400">
                    {contextImage ? 'Imagem referenciada' : `"${contextText?.split('\n')[0] || 'Conteúdo do bloco'}"`}
                  </span>
                </div>
              )}
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const textContent = msg.parts.find((p) => p.text)?.text || '';
              const isQuestionJson = textContent.includes('"enunciado"') && textContent.includes('"opcoes"');
              const { cleanText, proposedTitle } = !isUser ? parseModelProposal(textContent) : { cleanText: '', proposedTitle: undefined };

              // Clean up prompt text for user bubbles (remove the context injection prefix)
              let displayUserText = textContent;
              if (isUser && idx === 0 && displayUserText.startsWith('Contexto:')) {
                const split = displayUserText.split('Instrução:\n');
                if (split.length > 1) displayUserText = split[1];
              }

              return (
                <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                      isUser
                        ? 'bg-brand-600 text-white rounded-tr-sm'
                        : 'bg-white/[0.04] border border-white/10 text-zinc-200 rounded-tl-sm'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{displayUserText}</p>
                    ) : isQuestionJson ? (
                      (() => {
                        try {
                          const parsed = JSON.parse(textContent);
                          const questions = Array.isArray(parsed) ? parsed : [parsed];
                          const validQuestions = questions.filter(
                            (q: { enunciado?: string; opcoes?: string[] }) => q.enunciado && Array.isArray(q.opcoes)
                          );

                          if (validQuestions.length === 0) throw new Error('No valid questions');

                          return (
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-1.5 text-brand-300 font-medium pb-1.5 border-b border-white/10">
                                <Sparkles size={13} />
                                <span>✨ Questões Geradas</span>
                              </div>
                              {validQuestions.map((q: { enunciado: string; opcoes: string[]; correta?: number }, qIdx: number) => (
                                <div key={qIdx} className="flex flex-col gap-1.5">
                                  <p className="font-medium text-zinc-100">{q.enunciado}</p>
                                  <ul className="space-y-1 text-zinc-300">
                                    {q.opcoes.map((opt: string, optI: number) => (
                                      <li key={optI} className="flex gap-1.5">
                                        <span className={`font-semibold ${q.correta === optI ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                          {String.fromCharCode(65 + optI)})
                                        </span>
                                        <span className={q.correta === optI ? 'text-emerald-300 font-medium' : ''}>{opt}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          );
                        } catch {
                          return (
                            <div className="text-xs text-zinc-100 leading-relaxed overflow-x-auto">
                              <AiChatMarkdown content={textContent} />
                            </div>
                          );
                        }
                      })()
                    ) : (
                      <div className="text-xs text-zinc-100 leading-relaxed overflow-x-auto">
                        <AiChatMarkdown content={textContent} />
                      </div>
                    )}
                  </div>

                  {/* Actions under Model message */}
                  {!isUser && (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {onApplyReplacement && (
                        <button
                          type="button"
                          onClick={() => onApplyReplacement(cleanText || textContent, proposedTitle)}
                          className="flex items-center gap-1 text-[11px] text-brand-300 hover:text-white font-medium px-2 py-0.5 bg-brand-500/20 hover:bg-brand-500/40 border border-brand-500/30 rounded transition-colors"
                          title={targetType === 'code' ? 'Substituir código atual' : 'Substituir conteúdo do bloco'}
                        >
                          <Check size={11} />
                          <span>{targetType === 'code' ? 'Substituir Código' : 'Substituir no Bloco'}</span>
                        </button>
                      )}

                      {onInsertContent && (
                        <button
                          type="button"
                          onClick={() => onInsertContent(cleanText || textContent)}
                          className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white font-medium px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors"
                          title="Inserir conteúdo no bloco"
                        >
                          <Plus size={11} />
                          <span>Inserir</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyText(cleanText || textContent, idx)}
                        className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 px-1.5 py-0.5 hover:bg-white/5 rounded transition-colors"
                        title="Copiar resposta"
                      >
                        {copiedMessageIndex === idx ? (
                          <>
                            <Check size={11} className="text-emerald-400" />
                            <span className="text-emerald-400">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      {onSuccess && !onApplyReplacement && (
                        <button
                          type="button"
                          onClick={() => onSuccess(textContent)}
                          className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 font-medium px-2 py-0.5 hover:bg-brand-500/10 rounded transition-colors"
                        >
                          <Plus size={11} />
                          <span>Inserir no Caderno</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {loading && (
            <div className="flex items-start">
              <div className="bg-white/[0.04] border border-white/10 text-zinc-300 rounded-xl rounded-tl-sm px-3.5 py-2.5 shadow-sm">
                <span className="flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="ml-1 text-[11px] text-zinc-400">IA pensando...</span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-2.5 border-t border-white/5 bg-white/[0.02]">
          {error && <div className="text-[11px] text-red-400 mb-1.5 px-1">{error}</div>}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Instrução para a IA neste bloco..."
              disabled={loading}
              className="w-full bg-[#161820] border border-white/10 rounded-lg pl-3 pr-9 py-2 text-xs text-white focus:outline-none focus:border-brand-500/60 transition-colors placeholder:text-zinc-500"
            />
            <button
              type="submit"
              disabled={loading || (!prompt.trim() && messages.length === 0 && !contextImage && !contextText)}
              className="absolute right-1 top-1 bottom-1 w-7 flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Enviar"
            >
              <Send size={12} />
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
