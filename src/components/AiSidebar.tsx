import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, MessageSquare, Trash2, ChevronRight, FileText, ExternalLink, Image as ImageIcon, Sparkles, Send, Plus, Minimize2 } from 'lucide-react';
import { promptGemini } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AiSidebar() {
  const { state, dispatch } = useStore();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.activeAiChatId, state.aiChatSessions, loading]);

  const sessions = Object.values(state.aiChatSessions).sort((a, b) => b.updatedAt - a.updatedAt);

  if (!state.showAiSidebar) return null;

  const handleNavigate = (pageId: string, contextText?: string) => {
    dispatch({ type: 'NAVIGATE_IN_TAB', pageId });
    if (contextText) {
      setTimeout(() => {
        window.find(contextText, false, false, true, false, true, false);
      }, 300);
    }
  };

  const activeSession = state.activeAiChatId ? state.aiChatSessions[state.activeAiChatId] : null;

  const handleNewQuickChat = () => {
    const id = `chat_${Date.now()}`;
    dispatch({
      type: 'UPDATE_AI_CHAT',
      session: {
        id,
        pageId: 'global',
        pageTitle: 'Chat Rápido',
        messages: [],
        updatedAt: Date.now()
      }
    });
    dispatch({ type: 'OPEN_AI_CHAT', chatId: id });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !activeSession) return;

    setLoading(true);
    try {
      const responseObj = await promptGemini(prompt, undefined, activeSession.messages);
      const response = responseObj.text;
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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = state.aiSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      let newWidth = startWidth + deltaX;
      
      if (newWidth < 300) newWidth = 300;
      if (newWidth > window.innerWidth * 0.8) newWidth = window.innerWidth * 0.8;

      dispatch({ type: 'SET_AI_SIDEBAR_WIDTH', width: newWidth });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResetWidth = () => {
    dispatch({ type: 'SET_AI_SIDEBAR_WIDTH', width: 340 });
  };

  const mdRenderers = {
    p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed whitespace-pre-wrap">{children}</p>,
    strong: ({ children }: any) => <strong className="font-bold text-brand-300">{children}</strong>,
    em: ({ children }: any) => <em className="italic">{children}</em>,
    h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2 text-white">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-md font-bold mb-2 text-white">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-sm font-bold mb-2 text-white">{children}</h3>,
    ul: ({ children }: any) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
    li: ({ children }: any) => <li>{children}</li>,
    blockquote: ({ children }: any) => <blockquote className="border-l-2 border-brand-500 pl-3 my-2 text-brand-50/80 italic">{children}</blockquote>,
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      return inline ? (
        <code className="bg-white/10 px-1 py-0.5 rounded text-brand-300 text-xs font-mono" {...props}>{children}</code>
      ) : (
        <pre className="bg-black/30 p-3 rounded-lg overflow-x-auto mb-2 custom-scrollbar">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    }
  };

  return (
    <div 
      className="bg-dark-card border-l border-white/5 flex flex-col h-full absolute right-0 top-0 z-50 shadow-2xl animate-slide-in-right"
      style={{ width: state.aiSidebarWidth }}
    >
      {/* Drag Handle */}
      <div 
        className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-brand-500 z-50 transition-colors"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleResetWidth}
        title="Arraste para redimensionar (Duplo clique para restaurar)"
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-2 text-brand-400 font-medium">
          <Sparkles size={18} />
          <span>Chats Ativos</span>
        </div>
        <div className="flex items-center gap-1">
          {!state.activeAiChatId && (
            <button 
              onClick={handleNewQuickChat}
              className="p-1.5 text-brand-400 hover:bg-brand-500/20 rounded-lg transition-colors"
              title="Novo Chat Rápido"
            >
              <Plus size={18} />
            </button>
          )}
          {state.aiSidebarWidth !== 340 && (
            <button 
              onClick={handleResetWidth}
              className="p-1.5 text-dark-subtext hover:text-brand-400 rounded-lg transition-colors"
              title="Restaurar largura padrão"
            >
              <Minimize2 size={16} />
            </button>
          )}
          <button 
            onClick={() => dispatch({ type: 'TOGGLE_AI_SIDEBAR' })}
            className="p-1.5 text-dark-subtext hover:text-white rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {!state.activeAiChatId ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {sessions.length === 0 ? (
            <div className="text-center text-dark-subtext text-sm py-10 flex flex-col items-center">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
              <p className="mb-4">Nenhum chat ativo no momento.</p>
              <button 
                onClick={handleNewQuickChat}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-colors font-medium text-xs shadow-lg shadow-brand-500/20"
              >
                <Plus size={14} />
                Novo Chat Rápido
              </button>
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
                    {session.pageId === 'global' ? (
                      <MessageSquare size={14} className="mt-1 shrink-0 text-brand-500" />
                    ) : session.contextImage ? (
                      <ImageIcon size={14} className="mt-1 shrink-0 text-brand-500" />
                    ) : (
                      <FileText size={14} className="mt-1 shrink-0 text-brand-500" />
                    )}
                    <p className="text-sm text-white line-clamp-2">
                      {session.pageId === 'global' 
                        ? (session.messages.length > 0 && session.messages[0].parts[0]?.text ? session.messages[0].parts[0].text : 'Nova conversa livre') 
                        : session.contextImage ? 'Imagem referenciada' : `"${session.contextText}"`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="text-xs text-brand-400 font-medium truncate flex-1">
                    {session.pageTitle}
                  </div>
                  {session.pageId !== 'global' && (
                    <button 
                      onClick={() => handleNavigate(session.pageId, session.contextText)}
                      className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-300 font-medium px-2 py-1 rounded transition-colors bg-brand-500/10 hover:bg-brand-500/20"
                      title="Ir para a página"
                    >
                      <ExternalLink size={12} />
                      Ir
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-dark-bg">
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
              {activeSession?.pageId !== 'global' ? (
                <div className="text-xs text-brand-400 truncate cursor-pointer hover:underline flex items-center gap-1" onClick={() => handleNavigate(activeSession!.pageId, activeSession!.contextText)}>
                  {activeSession?.pageTitle} <ExternalLink size={10} />
                </div>
              ) : (
                <div className="text-xs text-brand-400 truncate">
                  {activeSession?.pageTitle}
                </div>
              )}
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
                          return (
                            <div className="text-sm">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdRenderers}>
                                {textContent}
                              </ReactMarkdown>
                            </div>
                          );
                        }
                      })()
                    ) : (
                      <div className="text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdRenderers}>
                          {textContent}
                        </ReactMarkdown>
                      </div>
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
            <div ref={messagesEndRef} />
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
