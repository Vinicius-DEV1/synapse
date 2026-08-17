import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, ChevronRight, FileText, ExternalLink, Sparkles, Send, Plus, Minimize2, AtSign, Check, Paperclip } from 'lucide-react';
import { useAiSidebarResize } from './ai-sidebar/useAiSidebarResize';
import { usePageMentions } from './ai-sidebar/usePageMentions';
import { useAiChatSubmit } from './ai-sidebar/useAiChatSubmit';
import { AiChatMessageItem } from './ai-sidebar/AiChatMessageItem';
import { AiChatSessionList } from './ai-sidebar/AiChatSessionList';

export default function AiSidebar() {
  const { state, dispatch } = useStore();
  const [prompt, setPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { width, handleMouseDown, handleResetWidth } = useAiSidebarResize();
  
  const {
    attachedPages,
    setAttachedPages,
    showMentionMenu,
    setShowMentionMenu,
    mentionSelectedIndex,
    filteredPages,
    handleAttachPage,
    handleAttachPageTree,
    handlePromptChange,
    handleKeyDown
  } = usePageMentions(prompt, setPrompt);

  const { loading, handleSubmit } = useAiChatSubmit({
    prompt,
    setPrompt,
    attachedPages,
    setAttachedPages,
    setShowMentionMenu,
  });

  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  const currentPage = activeTab?.pageId ? state.pages.find(p => p.id === activeTab.pageId) : undefined;
  const activeSession = state.activeAiChatId ? state.aiChatSessions[state.activeAiChatId] : null;
  const sessions = Object.values(state.aiChatSessions).sort((a, b) => b.updatedAt - a.updatedAt);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.activeAiChatId, state.aiChatSessions, loading]);

  if (!state.showAiSidebar) return null;

  const handleNavigate = (pageId: string, contextText?: string) => {
    dispatch({ type: 'NAVIGATE_IN_TAB', pageId });
    if (contextText) {
      setTimeout(() => {
        // window.find é uma API legada não padronizada (suportada em Firefox/Safari/Chromium),
        // ausente das definições de tipos do DOM do TypeScript.
        const legacyWindow = window as Window & {
          find?: (
            searchString: string,
            caseSensitive?: boolean,
            backwards?: boolean,
            wrapAround?: boolean,
            wholeWord?: boolean,
            searchInFrames?: boolean,
            showDialog?: boolean
          ) => boolean;
        };
        legacyWindow.find?.(contextText, false, false, true, false, true, false);
      }, 300);
    }
  };

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


  const handleInsert = (text: string) => {
    if (!activeSession) return;
    handleNavigate(activeSession.pageId);
    navigator.clipboard.writeText(text);
    alert('Texto copiado! Pressione Ctrl+V no editor para inserir.');
  };

  return (
    <div 
      className="bg-dark-card border-l border-white/5 flex flex-col h-full absolute right-0 top-0 z-50 shadow-2xl animate-slide-in-right"
      style={{ width }}
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
          {width !== 340 && (
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
        <AiChatSessionList
          sessions={sessions}
          onOpenSession={(id) => dispatch({ type: 'OPEN_AI_CHAT', chatId: id })}
          onDeleteSession={(id) => dispatch({ type: 'DELETE_AI_CHAT', id })}
          onNewQuickChat={handleNewQuickChat}
          onNavigate={handleNavigate}
        />
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
            {activeSession?.messages.map((msg, idx) => (
              <AiChatMessageItem
                key={idx}
                msg={msg}
                idx={idx}
                onInsert={handleInsert}
              />
            ))}
            {loading && (
              <div className="flex items-start">
                <div className="bg-dark-card border border-white/10 text-brand-50 rounded-xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <span className="animate-pulse text-xs">Processando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Mention Menu */}
          {showMentionMenu && (
            <div className="mx-3 mb-2 bg-dark-card border border-brand-500/40 rounded-xl shadow-2xl overflow-hidden animate-scale-in max-h-56 overflow-y-auto custom-scrollbar">
              <div className="px-3 py-1.5 border-b border-white/5 text-[11px] font-medium text-brand-400 flex items-center justify-between">
                <span>Anexar página (@ para filtrar)</span>
                <span className="text-dark-subtext text-[10px]">↑↓ navegar | Enter escolher</span>
              </div>
              {filteredPages.length === 0 ? (
                <div className="p-3 text-center text-xs text-dark-subtext">Nenhuma página encontrada.</div>
              ) : (
                <div className="p-1 space-y-0.5">
                  {filteredPages.map((page, index) => {
                    const isCurrent = currentPage && page.id === currentPage.id;
                    const isSelected = index === mentionSelectedIndex;
                    const isAlreadyAttached = attachedPages.some(p => p.id === page.id);
                    const childCount = state.pages.filter(p => p.parent_id === page.id).length;
                    return (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => handleAttachPage(page)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                          isSelected ? 'bg-brand-500/20 text-white' : 'text-brand-50/80 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <FileText size={14} className={isCurrent ? 'text-brand-400' : 'text-dark-subtext'} />
                          <span className="truncate font-medium">{page.title || 'Sem título'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {childCount > 0 && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAttachPageTree(page);
                              }}
                              className="bg-brand-500/10 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                              title={`Anexar página e suas ${childCount} subpágina(s)`}
                            >
                              + {childCount} subpágina{childCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="bg-brand-500/20 text-brand-300 border border-brand-500/30 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                              Atual
                            </span>
                          )}
                          {isAlreadyAttached && (
                            <Check size={14} className="text-brand-400" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Attached Pages Badges */}
          {attachedPages.length > 0 && (
            <div className="px-3 py-1.5 bg-dark-card/60 border-t border-white/5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
              {attachedPages.map(page => (
                <div 
                  key={page.id}
                  className="flex items-center gap-1.5 bg-brand-500/20 text-brand-200 border border-brand-500/30 px-2 py-0.5 rounded-md text-xs"
                >
                  <FileText size={11} className="text-brand-400" />
                  <span className="truncate max-w-[140px] font-medium">{page.title}</span>
                  {page.isLoading ? (
                    <span className="animate-spin text-[10px]">⏳</span>
                  ) : (
                    <button 
                      onClick={() => setAttachedPages(prev => prev.filter(p => p.id !== page.id))}
                      className="hover:text-red-400 ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 bg-dark-card relative">
            <div className="flex items-center gap-2 bg-dark-bg border border-white/10 rounded-xl px-3 py-2 focus-within:border-brand-500/50 transition-colors">
              <input
                type="text"
                value={prompt}
                onChange={handlePromptChange}
                onKeyDown={handleKeyDown}
                placeholder={attachedPages.length > 0 ? "O que deseja saber sobre as páginas anexadas?" : "Digite sua mensagem... (@ para anexar)"}
                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-dark-subtext"
                disabled={loading}
              />
              
              {currentPage && !attachedPages.some(p => p.id === currentPage.id) && (
                <button
                  type="button"
                  onClick={() => handleAttachPage(currentPage)}
                  className="text-dark-subtext hover:text-brand-400 p-1 rounded transition-colors"
                  title={`Anexar página atual (${currentPage.title})`}
                >
                  <Paperclip size={16} />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowMentionMenu(prev => !prev);
                  setPrompt(prev => prev + '@');
                }}
                className={`p-1 rounded transition-colors ${showMentionMenu ? 'text-brand-400' : 'text-dark-subtext hover:text-brand-400'}`}
                title="Mencionar/Anexar página (@)"
              >
                <AtSign size={16} />
              </button>

              <button
                type="submit"
                disabled={loading || (!prompt.trim() && attachedPages.length === 0)}
                className="p-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
