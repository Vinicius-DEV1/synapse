import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Image as ImageIcon, FileText, Trash2, Plus, Send } from 'lucide-react';
import { promptGemini } from '../services/gemini';
import { Portal } from './ui/Portal';

interface AiPromptModalProps {
  x: number;
  y: number;
  chatId: string;
  messages: any[];
  contextText?: string;
  contextImage?: string; // base64
  onMessageAdd: (chatId: string, msgs: any[]) => void;
  onClear: (chatId: string) => void;
  onClose: () => void;
  onSuccess: (response: string) => void;
}

export default function AiPromptModal({ x, y, chatId, messages, contextText, contextImage, onMessageAdd, onClear, onClose, onSuccess }: AiPromptModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !contextText && !contextImage) return;

    setLoading(true);
    setError('');
    
    try {
      const isFirst = messages.length === 0;
      const finalPrompt = (isFirst && contextText) ? `Contexto:\n"${contextText}"\n\nInstrução:\n${prompt}` : prompt;
      const imageToPass = isFirst ? contextImage : undefined;

      const responseObj = await promptGemini(finalPrompt, imageToPass, messages);
      const response = responseObj.text;
      
      const newUserParts: any[] = [{ text: finalPrompt }];
      if (imageToPass) {
        const mimeTypeMatch = imageToPass.match(/^data:(image\/[a-zA-Z]*);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
        const base64Data = imageToPass.replace(/^data:image\/[a-zA-Z]*;base64,/, '');
        newUserParts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
      }

      const newUserMsg = { role: 'user', parts: newUserParts };
      const newModelMsg = { role: 'model', parts: [{ text: response }] };
      
      onMessageAdd(chatId, [...messages, newUserMsg, newModelMsg]);
      setPrompt('');
    } catch (err: any) {
      setError(err.message || 'Erro ao comunicar com a IA');
    } finally {
      setLoading(false);
    }
  };

  const adjustedX = Math.min(x, window.innerWidth - 380);
  const adjustedY = Math.min(y, window.innerHeight - 450);

  return (
    <Portal>
      <div
      ref={modalRef}
      className="fixed z-[100] w-[360px] max-h-[500px] flex flex-col bg-dark-card border border-brand-500/30 rounded-xl shadow-2xl overflow-hidden animate-scale-in"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/5 bg-dark-bg/50">
        <div className="flex items-center gap-2 text-brand-400 font-medium text-sm">
          <Sparkles size={16} />
          <span>Assistente de IA</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button type="button" onClick={() => onClear(chatId)} className="p-1.5 text-dark-subtext hover:text-red-400 hover:bg-white/5 rounded transition-colors" title="Limpar Chat">
              <Trash2 size={14} />
            </button>
          )}
          <button type="button" onClick={onClose} className="p-1.5 text-dark-subtext hover:text-white hover:bg-white/5 rounded transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-[100px] max-h-[300px] custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-dark-subtext text-xs space-y-2 py-4">
            <Sparkles size={24} className="opacity-20" />
            <p>Como posso ajudar com este conteúdo?</p>
            {(contextText || contextImage) && (
              <div className="flex items-center gap-2 bg-dark-bg rounded-lg p-2 mt-2 border border-white/5 max-w-[90%]">
                {contextImage ? <ImageIcon size={14} className="shrink-0 text-brand-500" /> : <FileText size={14} className="shrink-0 text-brand-500" />}
                <span className="truncate">
                  {contextImage ? 'Imagem selecionada' : `"${contextText?.substring(0, 40)}..."`}
                </span>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const textContent = msg.parts.find((p: any) => p.text)?.text || '';
            const isQuestionJson = textContent.includes('"enunciado"') && textContent.includes('"opcoes"');
            
            // Clean up prompt text for user bubbles (remove the context injection prefix)
            let displayUserText = textContent;
            if (isUser && idx === 0 && displayUserText.startsWith('Contexto:')) {
              const split = displayUserText.split('Instrução:\n');
              if (split.length > 1) displayUserText = split[1];
            }

            return (
              <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm ${
                  isUser 
                    ? 'bg-brand-600 text-white rounded-tr-sm' 
                    : 'bg-dark-bg border border-white/10 text-brand-50 rounded-tl-sm'
                }`}>
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{displayUserText}</p>
                  ) : isQuestionJson ? (
                    (() => {
                      try {
                        const parsed = JSON.parse(textContent);
                        const questions = Array.isArray(parsed) ? parsed : [parsed];
                        const validQuestions = questions.filter(q => q.enunciado && Array.isArray(q.opcoes));
                        
                        if (validQuestions.length === 0) throw new Error("No valid questions");

                        return (
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-brand-300 font-medium pb-2 border-b border-white/10">
                              <Sparkles size={14} />
                              <span>✨ {validQuestions.length > 1 ? 'Questões Geradas' : 'Questão Gerada'}</span>
                            </div>
                            {validQuestions.map((q, idx) => (
                              <div key={idx} className="flex flex-col gap-2">
                                <p className="text-sm font-medium leading-relaxed">{q.enunciado}</p>
                                <ul className="text-xs space-y-1.5 text-brand-50/80 mt-1">
                                  {q.opcoes.map((opt: string, i: number) => (
                                    <li key={i} className="flex gap-2">
                                      <span className={`font-bold ${q.correta === i ? 'text-emerald-400' : 'text-brand-400'}`}>{String.fromCharCode(65 + i)})</span>
                                      <span className={q.correta === i ? 'text-emerald-50' : ''}>{opt}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        );
                      } catch (e) {
                        return <p className="whitespace-pre-wrap leading-relaxed">{textContent}</p>;
                      }
                    })()
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{textContent}</p>
                  )}
                </div>
                {!isUser && (
                  <button 
                    onClick={() => onSuccess(textContent)}
                    className="mt-1 flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium px-2 py-1 hover:bg-brand-500/10 rounded transition-colors"
                  >
                    <Plus size={12} />
                    <span>Inserir no Caderno</span>
                  </button>
                )}
              </div>
            );
          })
        )}
        {loading && (
          <div className="flex items-start">
            <div className="bg-dark-bg border border-white/10 text-brand-50 rounded-xl rounded-tl-sm px-4 py-3 shadow-sm">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 bg-dark-bg/30">
        {error && <div className="text-xs text-red-400 mb-2 px-1">{error}</div>}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Mande uma mensagem para a IA..."
            disabled={loading}
            className="w-full bg-dark-bg border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors placeholder:text-dark-subtext/50"
          />
          <button
            type="submit"
            disabled={loading || (!prompt.trim() && messages.length === 0 && !contextImage && !contextText)}
            className="absolute right-1.5 top-1.5 bottom-1.5 w-8 flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </div>
      </form>
    </div>
    </Portal>
  );
}
