import React, { useEffect, useState, useRef } from 'react';
import { X, ExternalLink, Download, FileText, File, Moon, Sun, Eye, Code, Bookmark, BookmarkCheck, Clock, RotateCcw, Plus, Trash2, Pencil, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js';
import { Portal } from '../ui/Portal';
import type { FileItem } from '../../types';
import { useStore } from '../../store/useStore';
import { getDecryptedFileUrl } from '../../utils/file-fetcher';
import { 
  getReadingProgress, 
  saveReadingProgress, 
  addBookmark, 
  removeBookmark,
  updateBookmarkLabel
} from '../../utils/reading-progress';
import type { Bookmark as BookmarkType, ReadingProgressData } from '../../utils/reading-progress';

interface FileViewerProps {
  item: FileItem;
  onClose: () => void;
}

function FileViewerContent({ item, onClose }: FileViewerProps) {
  const { state } = useStore();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [darkMode, setDarkMode] = useState<boolean>(false);

  const isMd = item.name.toLowerCase().endsWith('.md') || item.name.toLowerCase().endsWith('.markdown');
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>(isMd ? 'rendered' : 'raw');

  // Reading progress and bookmark states
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);
  const progressPercentRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [showResumePrompt, setShowResumePrompt] = useState<boolean>(false);
  const [savedProgressData, setSavedProgressData] = useState<ReadingProgressData | null>(null);
  const [showBookmarksMenu, setShowBookmarksMenu] = useState<boolean>(false);
  const [newBookmarkLabel, setNewBookmarkLabel] = useState<string>('');
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);

  useEffect(() => {
    let url: string | null = null;
    
    // Load local file content via backend or drive
    if (['image', 'pdf', 'text', 'other'].includes(item.file_type)) {
      getDecryptedFileUrl(item, state.moduleKeys['files']).then(async url => {
        if (url && typeof url === 'string') {
          setObjectUrl(url);
          if (item.file_type === 'text') {
            try {
              const res = await fetch(url);
              const txt = await res.text();
              setTextContent(txt);
            } catch(e) {
              console.error("Failed to fetch text", e);
              setTextContent("Erro ao carregar texto.");
            }
          }
        } else {
          console.warn("Nenhum arquivo local ou no Drive disponível");
        }
      }).catch(console.error);
    }
    
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [item]);

  // Load saved reading progress and bookmarks on text ready
  useEffect(() => {
    if (textContent && isText) {
      const saved = getReadingProgress(item.id);
      if (saved) {
        setBookmarks(saved.bookmarks || []);
        if (saved.percentage > 5 && saved.percentage < 98) {
          setSavedProgressData(saved);
          setShowResumePrompt(true);
        }
      }
    }
  }, [textContent, item.id]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll <= 0) return;

    const pct = Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100)));
    progressPercentRef.current = pct;
    
    // Atualiza a UI da barra de progresso diretamente via DOM para não engasgar o render do React
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${pct}%`;
    }
    if (progressTextRef.current) {
      progressTextRef.current.textContent = `${pct}% lido`;
    }

    // Throttling: Salva o progresso no localStorage no máximo a cada 500ms
    if (!saveTimeoutRef.current) {
      saveTimeoutRef.current = setTimeout(() => {
        saveReadingProgress(item.id, { scrollTop, percentage: pct, scrollHeight });
        saveTimeoutRef.current = null;
      }, 500);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleResumeReading = () => {
    if (savedProgressData && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: savedProgressData.scrollTop,
        behavior: 'smooth'
      });
      setShowResumePrompt(false);
    }
  };

  const [editingBmId, setEditingBmId] = useState<string | null>(null);
  const [editingBmText, setEditingBmText] = useState<string>('');

  const handleAddBookmark = (customLabel?: string) => {
    if (!scrollContainerRef.current) return;
    const scrollTop = scrollContainerRef.current.scrollTop;
    const autoName = `Marcador ${bookmarks.length + 1} (${progressPercentRef.current}%)`;
    const label = customLabel || newBookmarkLabel.trim() || autoName;
    const bm = addBookmark(item.id, label, scrollTop);
    if (bm) {
      setBookmarks(prev => [...prev, bm]);
      setNewBookmarkLabel('');
      setActiveBookmarkToast(`Marcador salvo: ${bm.label}`);
      setTimeout(() => setActiveBookmarkToast(null), 2500);
    }
  };

  const handleStartRenameBookmark = (bm: BookmarkType, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBmId(bm.id);
    setEditingBmText(bm.label);
  };

  const handleSaveRenameBookmark = (bmId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingBmText.trim()) {
      updateBookmarkLabel(item.id, bmId, editingBmText.trim());
      setBookmarks(prev => prev.map(b => b.id === bmId ? { ...b, label: editingBmText.trim() } : b));
    }
    setEditingBmId(null);
  };

  const handleRemoveBookmark = (bmId: string) => {
    removeBookmark(item.id, bmId);
    setBookmarks(prev => prev.filter(b => b.id !== bmId));
  };

  const [activeBookmarkToast, setActiveBookmarkToast] = useState<string | null>(null);

  const handleJumpToBookmark = (targetScrollTop: number, label?: string) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
      setShowBookmarksMenu(false);
      if (label) {
        setActiveBookmarkToast(label);
        setTimeout(() => setActiveBookmarkToast(null), 2500);
      }
    }
  };

  const handleOpenNative = () => {
    // If it's a video, route to video module
    if (item.file_type === 'video') {
      alert("Para abrir vídeos, vá para a aba Vídeos e importe o arquivo. Em breve terá integração direta!");
      onClose();
    } else if (item.file_type === 'epub') {
      alert("Para abrir EPUBs, vá para a aba Biblioteca e importe o arquivo. Em breve terá integração direta!");
      onClose();
    }
  };

  const isImage = item.file_type === 'image';
  const isPdf = item.file_type === 'pdf';
  const isText = item.file_type === 'text';

  // Navegação suave por teclado (Setas cima/baixo, PageUp/PageDown) sem perder o foco na rolagem
  useEffect(() => {
    if (!isText || !textContent) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se o usuário estiver digitando em um input ou textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (!scrollContainerRef.current) return;

      const container = scrollContainerRef.current;
      const step = 60;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        container.scrollBy({ top: step, behavior: 'auto' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        container.scrollBy({ top: -step, behavior: 'auto' });
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        container.scrollBy({ top: container.clientHeight * 0.8, behavior: 'smooth' });
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        container.scrollBy({ top: -container.clientHeight * 0.8, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isText, textContent]);

  const wordCount = textContent ? textContent.trim().split(/\s+/).filter(Boolean).length : 0;
  const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const mdRenderers = {
    p: ({ children }: any) => <p className="mb-3 leading-relaxed text-gray-200">{children}</p>,
    strong: ({ children }: any) => <strong className="font-bold text-brand-300">{children}</strong>,
    em: ({ children }: any) => <em className="italic text-gray-300">{children}</em>,
    h1: ({ children }: any) => <h1 className="text-2xl font-bold mb-4 mt-6 text-white border-b border-white/10 pb-2">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-bold mb-3 mt-5 text-white border-b border-white/5 pb-1">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-bold mb-2 mt-4 text-brand-300">{children}</h3>,
    h4: ({ children }: any) => <h4 className="text-base font-semibold mb-2 mt-3 text-brand-400">{children}</h4>,
    ul: ({ children }: any) => <ul className="list-disc pl-6 mb-3 space-y-1 text-gray-200">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-6 mb-3 space-y-1 text-gray-200">{children}</ol>,
    li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }: any) => <blockquote className="border-l-4 border-brand-500 bg-brand-500/10 pl-4 py-2 my-3 text-gray-300 italic rounded-r">{children}</blockquote>,
    hr: () => <hr className="border-white/10 my-6" />,
    a: ({ href, children }: any) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">{children}</a>,
    table: ({ children }: any) => <div className="overflow-x-auto my-4"><table className="min-w-full border border-white/10 rounded-lg overflow-hidden">{children}</table></div>,
    thead: ({ children }: any) => <thead className="bg-white/5 text-left text-xs font-semibold text-gray-300 uppercase">{children}</thead>,
    tbody: ({ children }: any) => <tbody className="divide-y divide-white/5">{children}</tbody>,
    tr: ({ children }: any) => <tr className="hover:bg-white/5 transition-colors">{children}</tr>,
    th: ({ children }: any) => <th className="px-4 py-2 border-b border-white/10">{children}</th>,
    td: ({ children }: any) => <td className="px-4 py-2 text-sm text-gray-300">{children}</td>,
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
        <code className="bg-white/10 px-1.5 py-0.5 rounded text-brand-300 text-xs font-mono" {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }: any) => (
      <pre className="bg-black/60 p-4 rounded-xl overflow-x-auto my-3 border border-white/10 font-mono text-sm text-gray-200 custom-scrollbar">
        {children}
      </pre>
    )
  };
  
  if (item.file_type === 'video' || item.file_type === 'epub' || item.file_type === 'slide') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center flex flex-col items-center gap-4">
          <h2 className="text-lg font-semibold text-white">Visualização Externa</h2>
          <p className="text-dark-subtext text-sm mb-2">
            Este tipo de arquivo ({item.file_type}) é melhor visualizado em seu módulo nativo ou aplicativo externo.
          </p>
          <button 
            onClick={handleOpenNative}
            className="w-full px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink size={16} />
            Abrir no Módulo Adequado
          </button>
          <button 
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // Para PDFs, layout full-screen sem barra extra (o iframe já tem toolbar própria)
  if (isPdf) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        {/* Barra compacta flutuante sobre o PDF */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-dark-bg/80 backdrop-blur-md border border-white/10 rounded-lg px-2 py-1 shadow-lg max-w-[calc(100vw-24px)]">
          <span className="text-xs text-dark-subtext font-medium truncate flex-1 min-w-0 max-w-24 sm:max-w-48 px-1" title={item.name}>
            {item.name}
          </span>
          <button 
            onClick={() => setDarkMode(!darkMode)} 
            className="p-1.5 text-dark-subtext hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title="Alternar Tema"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {objectUrl && (
            <a 
              href={objectUrl} 
              download={item.name}
              className="p-1.5 text-dark-subtext hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Download"
            >
              <Download size={16} />
            </a>
          )}
          <button 
            onClick={onClose} 
            className="p-1.5 text-dark-subtext hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {!objectUrl ? (
          <div className="flex-1 flex items-center justify-center text-dark-subtext animate-pulse">Carregando PDF...</div>
        ) : (
          <iframe 
            src={objectUrl} 
            className="w-full h-full bg-white transition-all duration-300"
            style={{ filter: darkMode ? 'invert(100%) hue-rotate(180deg) contrast(90%)' : 'none' }}
            title={item.name}
          />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50 gap-4">
        <div className="flex items-center gap-3 truncate flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white truncate min-w-0" title={item.name}>
            {item.name}
          </h2>
          {isText && textContent && (
            <div className="flex items-center gap-2 border-l border-white/10 pl-3 shrink-0 hidden sm:flex">
              <span className="text-xs text-dark-subtext">
                {wordCount} palavras
              </span>
              <span className="text-xs text-dark-subtext flex items-center gap-1">
                <Clock size={12} /> ~{estimatedMinutes} min
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 shrink-0 relative">
          {isText && (
            <>
              {/* Botão de Marcação Rápida com 1 Clique */}
              <button
                onClick={() => handleAddBookmark()}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 shrink-0 shadow-sm"
                title="Marcar ponto atual com 1 clique"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Marcar Ponto</span>
              </button>

              {/* Marcadores / Bookmarks Dropdown Toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowBookmarksMenu(!showBookmarksMenu)}
                  className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium border border-white/10 ${
                    bookmarks.length > 0 ? 'bg-brand-500/20 text-brand-300 border-brand-500/30' : 'bg-white/5 text-dark-subtext hover:text-white'
                  }`}
                  title="Marcadores de Leitura"
                >
                  <Bookmark size={16} />
                  <span className="hidden md:inline">Marcadores</span>
                  {bookmarks.length > 0 && (
                    <span className="bg-brand-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {bookmarks.length}
                    </span>
                  )}
                </button>

                {showBookmarksMenu && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-dark-card border border-white/10 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <h4 className="text-xs font-semibold text-white mb-2 flex items-center justify-between">
                      <span>Marcadores Salvos</span>
                      <span ref={progressTextRef} className="text-[10px] text-dark-subtext">{progressPercentRef.current}% lido</span>
                    </h4>

                    {/* Add Bookmark input */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <input
                        type="text"
                        placeholder="Nome personalizado (opcional)..."
                        value={newBookmarkLabel}
                        onChange={e => setNewBookmarkLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddBookmark()}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-dark-subtext focus:outline-none focus:border-brand-500"
                      />
                      <button
                        onClick={() => handleAddBookmark()}
                        className="p-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 shrink-0"
                        title="Marcar Ponto Atual"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Bookmark List */}
                    {bookmarks.length === 0 ? (
                      <p className="text-xs text-dark-subtext italic text-center py-2">
                        Nenhum marcador criado. Clique em "Marcar Ponto".
                      </p>
                    ) : (
                      <div className="max-h-48 overflow-auto space-y-1 custom-scrollbar">
                        {bookmarks.map(bm => (
                          <div
                            key={bm.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
                            onClick={() => handleJumpToBookmark(bm.scrollTop, bm.label)}
                          >
                            {editingBmId === bm.id ? (
                              <form
                                onSubmit={(e) => handleSaveRenameBookmark(bm.id, e)}
                                className="flex items-center gap-1 flex-1 min-w-0 pr-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  value={editingBmText}
                                  onChange={(e) => setEditingBmText(e.target.value)}
                                  autoFocus
                                  className="flex-1 bg-black/50 border border-brand-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                                />
                                <button
                                  type="submit"
                                  className="p-1 bg-brand-500 hover:bg-brand-600 text-white rounded"
                                  title="Salvar Nome"
                                >
                                  <Check size={12} />
                                </button>
                              </form>
                            ) : (
                              <>
                                <div className="truncate flex-1 min-w-0 pr-2">
                                  <p className="text-xs text-white truncate font-medium">{bm.label}</p>
                                  <p className="text-[10px] text-dark-subtext">{bm.scrollTop}px</p>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={(e) => handleStartRenameBookmark(bm, e)}
                                    className="p-1 text-dark-subtext hover:text-white rounded transition-colors opacity-60 group-hover:opacity-100"
                                    title="Editar Nome"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveBookmark(bm.id);
                                    }}
                                    className="p-1 text-dark-subtext hover:text-red-400 rounded transition-colors opacity-60 group-hover:opacity-100"
                                    title="Remover Marcador"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setViewMode('rendered')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                    viewMode === 'rendered' ? 'bg-brand-500 text-white' : 'text-dark-subtext hover:text-white'
                  }`}
                  title="Visualizar Formatado (Renderizado)"
                >
                  <Eye size={14} />
                  <span>Formatado</span>
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                    viewMode === 'raw' ? 'bg-brand-500 text-white' : 'text-dark-subtext hover:text-white'
                  }`}
                  title="Visualizar Texto Puro (Código Fonte)"
                >
                  <Code size={14} />
                  <span>Texto Puro</span>
                </button>
              </div>
            </>
          )}

          {objectUrl && (
            <a 
              href={objectUrl} 
              download={item.name}
              className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
              title="Download"
            >
              <Download size={20} />
            </a>
          )}
          <button onClick={onClose} className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Fechar">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Barra de Progresso de Leitura com Marcadores Visuais */}
      {isText && (
        <div className="w-full bg-white/5 h-1.5 relative z-20">
          <div 
            ref={progressBarRef}
            className="bg-brand-500 h-full transition-all duration-150" 
            style={{ width: `${progressPercentRef.current}%` }}
          />

          {/* Pins Visuais dos Marcadores */}
          {scrollContainerRef.current && (scrollContainerRef.current.scrollHeight - scrollContainerRef.current.clientHeight) > 0 && (
            bookmarks.map(bm => {
              const maxScroll = scrollContainerRef.current!.scrollHeight - scrollContainerRef.current!.clientHeight;
              const bmPercent = Math.min(100, Math.max(0, (bm.scrollTop / maxScroll) * 100));
              return (
                <button
                  key={bm.id}
                  onClick={() => handleJumpToBookmark(bm.scrollTop, bm.label)}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-amber-400 hover:bg-amber-300 hover:scale-150 rounded-full border border-black shadow-md transition-all z-30 cursor-pointer"
                  style={{ left: `${bmPercent}%` }}
                  title={`📌 ${bm.label} (${Math.round(bmPercent)}%)`}
                />
              );
            })
          )}
        </div>
      )}
      
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
        {/* Toast Notificação de Marcador Ativo */}
        {activeBookmarkToast && (
          <div className="absolute top-4 right-6 z-50 bg-amber-500/90 text-black font-medium text-xs px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
            <Bookmark size={15} className="fill-black" />
            <span>Navegou para: <strong>{activeBookmarkToast}</strong></span>
          </div>
        )}
        {/* Banner/Modal de Confirmação de Retorno de Leitura */}
        {showResumePrompt && savedProgressData && (
          <div className="absolute bottom-6 right-6 z-50 bg-dark-card/95 backdrop-blur-md border border-brand-500/40 rounded-xl shadow-2xl p-4 max-w-sm flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-brand-400">
                <RotateCcw size={18} />
                <h4 className="text-sm font-semibold text-white">Continuar Leitura?</h4>
              </div>
              <button 
                onClick={() => setShowResumePrompt(false)} 
                className="text-dark-subtext hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-gray-300">
              Você parou em <strong className="text-brand-300 font-bold">{savedProgressData.percentage}%</strong> deste documento. Deseja retornar de onde parou?
            </p>
            <div className="flex items-center gap-2 justify-end mt-1">
              <button
                onClick={() => setShowResumePrompt(false)}
                className="px-3 py-1.5 text-xs text-dark-subtext hover:bg-white/10 rounded-lg transition-colors"
              >
                Começar do Início
              </button>
              <button
                onClick={handleResumeReading}
                className="px-3 py-1.5 text-xs bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg shadow transition-colors flex items-center gap-1.5"
              >
                <BookmarkCheck size={14} />
                Continuar Leitura
              </button>
            </div>
          </div>
        )}

        {!objectUrl ? (
          <div className="text-dark-subtext animate-pulse">Carregando arquivo...</div>
        ) : isImage ? (
          <img 
            src={objectUrl} 
            alt={item.name} 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        ) : isText ? (
          <div 
            ref={scrollContainerRef}
            tabIndex={0}
            onScroll={handleScroll}
            className="w-full h-full max-w-4xl bg-dark-card border border-white/10 rounded-xl shadow-2xl p-6 sm:p-8 overflow-auto custom-scrollbar outline-none focus:outline-none"
          >
            {textContent ? (
              viewMode === 'rendered' ? (
                <div className="text-gray-200">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdRenderers}>
                    {textContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <pre className="text-gray-300 text-sm font-mono whitespace-pre-wrap">{textContent}</pre>
              )
            ) : (
              <div className="text-dark-subtext animate-pulse">Lendo texto...</div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-dark-card border border-white/10 rounded-2xl max-w-md w-full shadow-2xl gap-4">
            <div className="p-4 bg-brand-500/20 text-brand-400 rounded-2xl mb-2">
              <File size={48} />
            </div>
            <h3 className="text-xl font-semibold text-white text-center break-all">{item.name}</h3>
            <p className="text-dark-subtext text-center mb-4 text-sm">
              Visualização não suportada para este formato. <br/> 
              Tamanho: {(item.file_size / 1024 / 1024).toFixed(2)} MB
            </p>
            <a 
              href={objectUrl} 
              download={item.name}
              className="w-full px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Baixar Arquivo
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FileViewer(props: FileViewerProps) {
  return (
    <Portal>
      <FileViewerContent {...props} />
    </Portal>
  );
}

