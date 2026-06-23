import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { X, MessageSquare, Trash2, ChevronRight, FileText, ExternalLink, Image as ImageIcon, Sparkles, Send, Plus } from 'lucide-react';
import { promptGemini } from '../services/gemini';

export default function AiSidebar() {
  const { state, dispatch } = useStore();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const sessions = Object.values(state.aiChatSessions).sort((a, b) => b.updatedAt - a.updatedAt);

  if (!state.showAiSidebar) return null;

  const handleNavigate = (pageId: string, contextText?: string) => {
    dispatch({ type: 'NAVIGATE_IN_TAB', pageId });
    if (contextText) {
      setTimeout(() => {
        (window as any).find(contextText, false, false, true, false, true, false);
      }, 300);
    }
  };

  const activeSession = state.activeAiChatId ? state.aiChatSessions[state.activeAiChatId] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !activeSession) return;

    setLoading(true);
    try {
      const response = await promptGemini(prompt, undefined, activeSession.messages);
      const newUserMsg = { role: 'user', parts: [{ text: prompt }] };
      const newModelMsg = { role: 'model', parts: [{ text: response }] };
      
      dispatch({
        type: 'UPDATE_AI_CHAT',
        session: {
          ...activeSession,
          messages: [...activeSession.messages, newUserMsg, newModelMsg],
          updatedAt: Date.now(),
        }
      });
      setPrompt('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = (text: string) => {
    if (!activeSession) return;
    handleNavigate(activeSession.pageId);
    navigator.clipboard.writeText(text);
    alert('Texto copiado! Pressione Ctrl+V no editor para inserir.');
  };

  return (
    <div className="w-[340px] bg-dark-card border-l border-white/5 flex flex-col h-full absolute right-0 top-0 z-50 shadow-2xl animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-2 text-brand-400 font-medium">
          <Sparkles size={18} />
          <span>Chats Ativos</span>
        </div>
        <button 
          onClick={() => dispatch({ type: 'TOGGLE_AI_SIDEBAR' })}
          className="p-1.5 text-dark-subtext hover:text-white rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {!state.activeAiChatId ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {sessions.length === 0 ? (
            <div className="text-center text-dark-subtext text-sm py-10">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
              Nenhum chat ativo no momento.
            </div>
          ) : (
            sessions.map(session => (
              <div key={session.id} className="bg-dark-bg border border-white/5 rounded-xl p-3 hover:border-brand-500/30 transition-all group">
                <div 
                  className="cursor-pointer"
                  onClick={() => dispatch({ type: 'OPEN_AI_CHAT', chatId: session.id })}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-dark-subtext truncate pr-2">
                      {new Date(session.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'DELETE_AI_CHAT', id: session.id });
                      }}
                      className="text-dark-subtext hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-start gap-2 mb-3">
                    {session.contextImage ? (
                      <ImageIcon size={14} className="mt-1 shrink-0 text-brand-500" />
                    ) : (
                      <FileText size={14} className="mt-1 shrink-0 text-brand-500" />
                    )}
                    <p className="text-sm text-white line-clamp-2">
                      {session.contextImage ? 'Imagem referenciada' : `"${session.contextText}"`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="text-xs text-brand-400 font-medium truncate flex-1">
                    {session.pageTitle}
                  </div>
                  <button 
                    onClick={() => handleNavigate(session.pageId, session.contextText)}
                    className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-300 font-medium px-2 py-1 rounded transition-colors bg-brand-500/10 hover:bg-brand-500/20"
                    title="Ir para a página"
                  >
                    <ExternalLink size={12} />
                    Ir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col h-full bg-dark-bg">
          {/* Chat Header */}
          <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-dark-card">
            <button 
              onClick={() => dispatch({ type: 'OPEN_AI_CHAT', chatId: null })}
              className="p-1.5 text-dark-subtext hover:text-white rounded transition-colors"
            >
              <ChevronRight size={18} className="rotate-180" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">Conversa com IA</div>
              <div className="text-xs text-brand-400 truncate cursor-pointer hover:underline flex items-center gap-1" onClick={() => handleNavigate(activeSession!.pageId, activeSession!.contextText)}>
                {activeSession?.pageTitle} <ExternalLink size={10} />
              </div>
            </div>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {activeSession?.messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              const textContent = msg.parts.find((p: any) => p.text)?.text || '';
              const isQuestionJson = textContent.includes('"enunciado"') && textContent.includes('"opcoes"');
              
              let displayUserText = textContent;
              if (isUser && idx === 0 && displayUserText.startsWith('Contexto:')) {
                const split = displayUserText.split('Instrução:\n');
                if (split.length > 1) displayUserText = split[1];
              }

              return (
                <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] rounded-xl px-3 py-2 text-sm shadow-sm ${
                    isUser 
                      ? 'bg-brand-600 text-white rounded-tr-sm' 
                      : 'bg-dark-card border border-white/10 text-brand-50 rounded-tl-sm'
                  }`}>
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{displayUserText}</p>
                    ) : isQuestionJson ? (
                      (() => {
                        try {
                          const parsed = JSON.parse(textContent);
                          return (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-brand-300 font-medium pb-2 border-b border-white/10">
                                <Sparkles size={14} />
                                <span>✨ Questão Gerada</span>
                              </div>
                              <p className="text-sm font-medium leading-relaxed">{parsed.enunciado}</p>
                              <ul className="text-xs space-y-1.5 text-brand-50/80 mt-1">
                                {parsed.opcoes.map((opt: string, i: number) => (
                                  <li key={i} className="flex gap-2">
                                    <span className="font-bold text-brand-400">{String.fromCharCode(65 + i)})</span>
                                    <span>{opt}</span>
                                  </li>
                                ))}
                              </ul>
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
                      onClick={() => handleInsert(textContent)}
                      className="mt-1 flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium px-2 py-1 hover:bg-brand-500/10 rounded transition-colors"
                    >
                      <Plus size={12} />
                      <span>Copiar para Inserir</span>
                    </button>
                  )}
                </div>
              );
            })}
            {loading && (
              <div className="flex items-start">
                <div className="bg-dark-card border border-white/10 text-brand-50 rounded-xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <span className="animate-pulse text-xs">Processando...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 bg-dark-card">
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Continuar conversa..."
                disabled={loading}
                className="w-full bg-dark-bg border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 w-8 flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white rounded-md transition-all disabled:opacity-50"
              >
                <Send size={14} className="ml-0.5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
