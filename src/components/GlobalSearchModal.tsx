import { useEffect, useState, useRef, useMemo } from 'react';
import { Search, FileText, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useEditor, EditorContent } from '@tiptap/react';
import { useEditorExtensions } from './editor/hooks/useEditorExtensions';

export default function GlobalSearchModal() {
  const { state, dispatch } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle open/close events
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          setIsOpen(false);
        } else {
          handleOpen();
        }
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('open-global-search', handleOpen);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('open-global-search', handleOpen);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Debounced query logic - avoiding excessive re-renders when typing fast
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setSelectedIndex(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    
    const lowerQuery = debouncedQuery.toLowerCase();
    
    const matchesTitle: any[] = [];
    const matchesContent: any[] = [];

    state.pages.forEach(p => {
      const titleMatch = p.title.toLowerCase().includes(lowerQuery);
      const contentMatch = p.content && p.content.toLowerCase().includes(lowerQuery);
      
      if (titleMatch) {
        matchesTitle.push({ ...p, matchType: 'title' });
      } else if (contentMatch) {
        matchesContent.push({ ...p, matchType: 'content' });
      }
    });

    return [...matchesTitle, ...matchesContent];
  }, [debouncedQuery, state.pages]);

  const getSnippet = (content: string, term: string) => {
    if (!content || !term) return null;
    
    // Strip HTML tags to avoid showing raw markup like <div> or <p>
    const strippedContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    
    const lowerContent = strippedContent.toLowerCase();
    const idx = lowerContent.indexOf(term.toLowerCase());
    if (idx === -1) return null;
    
    const start = Math.max(0, idx - 40);
    const end = Math.min(strippedContent.length, idx + term.length + 40);
    
    let snippet = strippedContent.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < strippedContent.length) snippet = snippet + '...';
    
    // Highlight the term (naive implementation, splits by case-insensitive term)
    const parts = snippet.split(new RegExp(`(${term})`, 'gi'));
    
    return (
      <span className="text-dark-subtext text-xs italic opacity-70">
        {parts.map((part, i) => 
          part.toLowerCase() === term.toLowerCase() ? 
            <span key={i} className="text-brand-400 font-bold bg-brand-500/10 px-0.5 rounded">{part}</span> : part
        )}
      </span>
    );
  };

  useEffect(() => {
    // Scroll selected item into view
    if (scrollRef.current) {
      const selectedEl = scrollRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleSelect = (pageId: string) => {
    dispatch({ type: 'NAVIGATE_IN_TAB', pageId });
    setIsOpen(false);
  };

  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(results[selectedIndex].id);
    }
  };

  const selectedPage = results[selectedIndex] || null;

  // Initialize read-only Tiptap editor for perfect preview rendering
  const extensions = useEditorExtensions(null);
  const previewEditor = useEditor({
    extensions,
    editable: false,
    content: '',
  });

  // Update preview editor content and apply highlights
  useEffect(() => {
    if (previewEditor && selectedPage?.content) {
      const query = debouncedQuery.trim();
      let contentToRender = selectedPage.content;
      
      if (query) {
        // Safely inject <mark> tags outside of HTML elements
        const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${safeQuery})(?![^<]*>)`, 'gi');
        // We use data-color to leverage the multicolor Highlight extension
        contentToRender = contentToRender.replace(regex, '<mark data-color="#8b5cf6">$1</mark>');
      }
      
      previewEditor.commands.setContent(contentToRender);

      // Auto-scroll to the first mark after render
      setTimeout(() => {
        const modalEl = document.getElementById('global-search-preview-container');
        if (modalEl) {
          const mark = modalEl.querySelector('mark');
          if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else if (previewEditor) {
      previewEditor.commands.setContent('');
    }
  }, [previewEditor, selectedPage?.content, debouncedQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] animate-fade-in" onClick={() => setIsOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-bg/60 backdrop-blur-sm" />
      
      {/* Modal Container */}
      <div 
        className="relative w-[850px] max-w-[95vw] h-[550px] bg-dark-bg/95 border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDownList}
      >
        
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0 bg-dark-card/30">
          <Search size={22} className="text-brand-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar em todas as páginas... (Tente 'setup')"
            className="flex-1 bg-transparent text-lg text-dark-text placeholder-dark-subtext outline-none font-medium"
            autoFocus
          />
          <div className="flex items-center gap-2 text-xs font-medium text-dark-subtext bg-white/5 px-2 py-1 rounded">
            <span>ESC</span> para sair
          </div>
        </div>

        {/* Two-pane layout body */}
        <div className="flex-1 flex min-h-0">
          
          {/* Left Pane: Results */}
          <div className="w-1/2 flex flex-col border-r border-white/5 bg-dark-bg/50">
            {debouncedQuery.trim() === '' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-dark-subtext opacity-50 p-6 text-center">
                <Search size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Digite para buscar no Caderno.</p>
                <p className="text-xs mt-1">Busca títulos e conteúdos de todas as páginas.</p>
              </div>
            ) : results.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-dark-subtext p-6 text-center">
                <FileText size={32} className="mb-3 opacity-30 text-red-400" />
                <p className="text-sm font-medium text-dark-text">Nenhum resultado encontrado</p>
                <p className="text-xs mt-1">Não achamos nada com "{debouncedQuery}"</p>
              </div>
            ) : (
              <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {results.map((page, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <button
                      key={page.id}
                      onClick={() => handleSelect(page.id)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                        isSelected 
                          ? 'bg-brand-500/15 border border-brand-500/30 shadow-[inset_0_0_15px_rgba(var(--color-brand-500),0.1)]' 
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{page.icon || '📄'}</span>
                          <span className={`text-sm truncate font-medium ${isSelected ? 'text-brand-300' : 'text-dark-text'}`}>
                            {page.title}
                          </span>
                          {page.matchType === 'title' && (
                            <span className="ml-auto text-[10px] uppercase tracking-widest text-brand-400/70 font-semibold bg-brand-500/10 px-1.5 rounded">
                              TÍTULO
                            </span>
                          )}
                        </div>
                        {page.matchType === 'content' && (
                          <div className="mt-1 pl-6">
                            {getSnippet(page.content, debouncedQuery)}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Pane: Preview */}
          <div className="w-1/2 flex flex-col bg-dark-bg/80 relative min-h-0">
            {!selectedPage ? (
              <div className="flex-1 flex items-center justify-center text-dark-subtext">
                <p className="text-sm opacity-50">Preview indisponível</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2 bg-dark-card/20 shrink-0">
                  <span className="text-xl">{selectedPage.icon || '📄'}</span>
                  <h3 className="text-base font-semibold text-dark-text truncate">{selectedPage.title}</h3>
                </div>
                <div 
                  id="global-search-preview-container"
                  className="flex-1 overflow-y-auto custom-scrollbar p-6 relative"
                >
                  {selectedPage.content ? (
                    <div className="prose prose-invert prose-sm max-w-none opacity-90 pointer-events-none tiptap-preview">
                      <EditorContent editor={previewEditor} />
                    </div>
                  ) : (
                    <div className="text-center text-dark-subtext italic mt-10 opacity-50 text-sm">
                      Página vazia
                    </div>
                  )}
                </div>
                {/* Overlay gradient to hint it's a preview */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-dark-bg to-transparent pointer-events-none" />
              </div>
            )}
            
            {/* Enter to jump hint */}
            {selectedPage && (
              <div className="absolute bottom-4 right-4 bg-brand-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 animate-bounce">
                <span>Pressione</span>
                <span className="bg-white/20 px-1.5 rounded">Enter</span>
                <span>para acessar</span>
                <ChevronRight size={14} />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
