import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, MessageSquare, Trash2, ChevronRight, FileText, ExternalLink, Image as ImageIcon, Sparkles, Send, Plus, Minimize2, AtSign, Check, Paperclip } from 'lucide-react';
import { promptGemini } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';

export default function AiSidebar() {
  const { state, dispatch } = useStore();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedPages, setAttachedPages] = useState<{ id: string; title: string; content?: string; isLoading?: boolean }[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeTab = state.tabs.find(t => t.id === state.activeTabId);
  const currentPage = activeTab?.pageId ? state.pages.find(p => p.id === activeTab.pageId) : undefined;

  const stripHtml = (html?: string) => {
    if (!html) return '(página sem conteúdo em texto)';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '(página sem conteúdo em texto)').trim();
  };

  const extractImagesFromHtml = (html?: string): string[] => {
    if (!html) return [];
    const images: string[] = [];
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const imgTags = tmp.querySelectorAll('img');
    imgTags.forEach(img => {
      const src = img.getAttribute('src') || img.src;
      if (src && src.startsWith('data:image/')) {
        images.push(src);
      }
    });
    return images;
  };

  const handleAttachPage = async (page: { id: string; title: string; content?: string }) => {
    if (!attachedPages.some(p => p.id === page.id)) {
      setAttachedPages(prev => {
        if (prev.some(p => p.id === page.id)) return prev;
        return [...prev, { id: page.id, title: page.title, content: page.content, isLoading: true }];
      });

      let content = page.content;
      if (activeTab?.pageId === page.id && activeTab?.unsavedContent) {
        content = activeTab.unsavedContent;
      }
      if (!content && window.api?.getPageContent) {
        try {
          const fullData = await window.api.getPageContent(page.id);
          content = fullData?.content || '';
        } catch (err) {
          console.error('Erro ao buscar conteúdo da página para o chat:', err);
        }
      }
      setAttachedPages(prev =>
        prev.map(p => (p.id === page.id ? { ...p, content, isLoading: false } : p))
      );
    }
    if (showMentionMenu) {
      const newPrompt = prompt.replace(/(?:^|\s)@([^\s@]*)$/, '').trim();
      setPrompt(newPrompt);
      setShowMentionMenu(false);
    }
  };

  const getPageAndDescendants = (rootPageId: string) => {
    const result: { id: string; title: string; content?: string }[] = [];
    const queue = [rootPageId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const found = state.pages.find(p => p.id === currentId);
      if (found) {
        result.push({ id: found.id, title: found.title, content: found.content });
        const children = state.pages.filter(p => p.parent_id === found.id);
        queue.push(...children.map(c => c.id));
      }
    }
    return result;
  };

  const handleAttachPageTree = async (rootPage: { id: string; title: string; content?: string }) => {
    const pagesToAttach = getPageAndDescendants(rootPage.id);
    for (const p of pagesToAttach) {
      await handleAttachPage(p);
    }
  };

  const filteredPages = React.useMemo(() => {
    const query = mentionQuery.toLowerCase().trim();
    let list = state.pages.filter(p => p.title.toLowerCase().includes(query));
    if (currentPage && currentPage.title.toLowerCase().includes(query)) {
      list = [currentPage, ...list.filter(p => p.id !== currentPage.id)];
    }
    return list.slice(0, 6);
  }, [state.pages, mentionQuery, currentPage]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPrompt(val);
    const match = val.match(/(?:^|\s)@([^\s@]*)$/);
    if (match) {
      setShowMentionMenu(true);
      setMentionQuery(match[1]);
      setMentionSelectedIndex(0);
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionMenu && filteredPages.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex(prev => (prev + 1) % filteredPages.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex(prev => (prev - 1 + filteredPages.length) % filteredPages.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredPages[mentionSelectedIndex] || filteredPages[0];
        if (selected) {
          handleAttachPage(selected);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionMenu(false);
      }
    }
  };

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
    if ((!prompt.trim() && attachedPages.length === 0) || !activeSession) return;

    const promptText = prompt.trim() || 'Faça um resumo com os principais pontos das páginas anexadas.';

    setLoading(true);
    try {
      let finalPromptToSend = promptText;
      let extractedImages: string[] = [];
      if (attachedPages.length > 0) {
        const pagesWithContent = await Promise.all(
          attachedPages.map(async p => {
            let content = p.content;
            if (activeTab?.pageId === p.id && activeTab?.unsavedContent) {
              content = activeTab.unsavedContent;
            }
            if (!content && window.api?.getPageContent) {
              try {
                const fullData = await window.api.getPageContent(p.id);
                content = fullData?.content || '';
              } catch (err) {
                console.error('Erro ao buscar conteúdo no submit:', err);
              }
            }
            return { ...p, content };
          })
        );

        const names = pagesWithContent.map(p => p.title).join(', ');
        const pagesContext = pagesWithContent.map(p => {
          const cleanContent = stripHtml(p.content);
          const pageImgs = extractImagesFromHtml(p.content);
          extractedImages.push(...pageImgs);
          return `📄 Página "${p.title}"${pageImgs.length > 0 ? ` [Contém ${pageImgs.length} imagem(ns) anexa(s)]` : ''}:\n${cleanContent}`;
        }).join('\n\n---\n\n');

        finalPromptToSend = `[Anexos: ${names}]\n--- CONTEXTO DAS PÁGINAS ANEXADAS ---\n${pagesContext}\n--- FIM DO CONTEXTO ---\n\nInstrução:\n${promptText}`;
      }

      const { getSettings } = await import('../utils/settings');
      const settings = getSettings();
      const imagesToSend = extractedImages.slice(0, 5); // limite seguro de até 5 imagens para controle de tokens
      const responseObj = await promptGemini(
        finalPromptToSend,
        imagesToSend.length > 0 ? imagesToSend : undefined,
        activeSession.messages,
        settings.geminiModelChat || settings.geminiModel
      );
      const response = responseObj.text;
      const newUserMsg = { role: 'user', parts: [{ text: finalPromptToSend }] };
      const newModelMsg = { role: 'model', parts: [{ text: response }], tokens: responseObj.usage };
      
      dispatch({
        type: 'UPDATE_AI_CHAT',
        session: {
          ...activeSession,
          messages: [...activeSession.messages, newUserMsg, newModelMsg],
          updatedAt: Date.now(),
        }
      });
      setPrompt('');
      setAttachedPages([]);
      setShowMentionMenu(false);
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
    code: ({ node, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const isBlock = match || String(children).includes('\n');
      
      if (isBlock) {
        const codeText = String(children).replace(/\n$/, '');
        let highlightedHtml: string | null = null;
        
        if (match && hljs.getLanguage(match[1])) {
          try {
            highlightedHtml = hljs.highlight(codeText, { language: match[1] }).value;
          } catch (e) {
            // fallback
          }
        } else {
          try {
            highlightedHtml = hljs.highlightAuto(codeText).value;
          } catch (e) {
            // fallback
          }
        }

        if (highlightedHtml) {
          return (
            <code
              className={`${className || ''} hljs`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              {...props}
            />
          );
        }

        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }

      return (
        <code className="bg-white/10 px-1 py-0.5 rounded text-brand-300 text-xs font-mono" {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }: any) => (
      <pre className="bg-black/30 p-3 rounded-lg overflow-x-auto mb-2 custom-scrollbar">
        {children}
      </pre>
    )
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
              let attachedNames: string[] = [];

              if (isUser && textContent.startsWith('[Anexos: ')) {
                const match = textContent.match(/^\[Anexos: (.*?)\]/);
                if (match && match[1]) {
                  attachedNames = match[1].split(', ').map(s => s.trim());
                }
                const split = textContent.split('Instrução:\n');
                if (split.length > 1) {
                  displayUserText = split[1];
                }
              } else if (isUser && idx === 0 && displayUserText.startsWith('Contexto:')) {
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
                      <div className="flex flex-col gap-1.5">
                        {attachedNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 pb-1.5 border-b border-white/20">
                            {attachedNames.map((name, i) => (
                              <span key={i} className="inline-flex items-center gap-1 bg-black/20 text-brand-100 px-2 py-0.5 rounded-full text-[11px] font-medium">
                                <FileText size={10} />
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{displayUserText}</p>
                      </div>
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
                    <div className="flex items-center gap-2 mt-1">
                      <button 
                        onClick={() => handleInsert(textContent)}
                        className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium px-2 py-1 hover:bg-brand-500/10 rounded transition-colors"
                      >
                        <Plus size={12} />
                        <span>Copiar para Inserir</span>
                      </button>
                      {msg.tokens && (
                        <div 
                          className="text-[10px] opacity-40 font-mono flex items-center gap-1 px-2 cursor-help" 
                          title={`Prompt: ${msg.tokens.promptTokenCount} | Resposta: ${msg.tokens.candidatesTokenCount} | Total: ${msg.tokens.totalTokenCount} tokens`}
                        >
                          {msg.tokens.totalTokenCount}
                        </div>
                      )}
                    </div>
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

          {/* Attached Pages Chips */}
          {attachedPages.length > 0 && (
            <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5 border-t border-white/5 bg-dark-card">
              {attachedPages.map(page => (
                <div key={page.id} className="flex items-center gap-1.5 bg-brand-600/20 border border-brand-500/40 text-brand-200 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm animate-scale-in">
                  {page.isLoading ? (
                    <span className="w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin shrink-0" title="Carregando conteúdo..." />
                  ) : (
                    <FileText size={12} className="text-brand-400 shrink-0" />
                  )}
                  <span className="truncate max-w-[160px]">{page.title || 'Sem título'}</span>
                  {page.isLoading && (
                    <span className="text-[10px] text-brand-300 opacity-70">...</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setAttachedPages(prev => prev.filter(p => p.id !== page.id))}
                    className="text-brand-300 hover:text-white hover:bg-brand-500/30 rounded-full p-0.5 transition-colors"
                    title="Remover anexo"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick attach current page suggestion (if not attached) */}
          {currentPage && !attachedPages.some(p => p.id === currentPage.id) && !showMentionMenu && (
            <div className="px-3 pt-2 pb-1 border-t border-white/5 bg-dark-card flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleAttachPage(currentPage)}
                className="flex items-center gap-1.5 text-xs text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 hover:border-brand-500/50 px-2.5 py-1 rounded-full transition-all group"
                title="Incluir conteúdo da página aberta no chat"
              >
                <Plus size={12} className="text-brand-400 group-hover:scale-125 transition-transform" />
                <span>Anexar página atual: <strong className="font-semibold text-white">{currentPage.title || 'Sem título'}</strong></span>
              </button>
              {(() => {
                const childCount = state.pages.filter(p => p.parent_id === currentPage.id).length;
                if (childCount === 0) return null;
                return (
                  <button
                    type="button"
                    onClick={() => handleAttachPageTree(currentPage)}
                    className="flex items-center gap-1 text-xs text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 hover:border-brand-500/50 px-2.5 py-1 rounded-full transition-all"
                    title={`Incluir página atual e suas ${childCount} subpágina(s)`}
                  >
                    <span>+ {childCount} subpágina{childCount > 1 ? 's' : ''}</span>
                  </button>
                );
              })()}
            </div>
          )}

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-white/5 bg-dark-card">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowMentionMenu(prev => !prev);
                  setMentionQuery('');
                  setMentionSelectedIndex(0);
                }}
                className={`p-2 rounded-lg transition-colors ${
                  showMentionMenu 
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' 
                    : 'text-dark-subtext hover:text-brand-400 hover:bg-white/5 border border-transparent'
                }`}
                title="Anexar página (@)"
              >
                <Paperclip size={18} />
              </button>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={prompt}
                  onChange={handlePromptChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Mensagem (digite @ para anexar página)..."
                  disabled={loading}
                  className="w-full bg-dark-bg border border-white/10 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading || (!prompt.trim() && attachedPages.length === 0)}
                  className="absolute right-1.5 top-1.5 bottom-1.5 w-8 flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white rounded-md transition-all disabled:opacity-50"
                >
                  <Send size={14} className="ml-0.5" />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
