import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Search, FileText, CornerDownLeft } from 'lucide-react';
import { useStore } from '../store/useStore';

/** Escapa caracteres especiais de regex para uso seguro em new RegExp() */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Remove tags HTML e normaliza espaços para busca em texto puro */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

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

  // Debounced query
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setSelectedIndex(0);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const lowerQuery = debouncedQuery.toLowerCase();
    const matchesTitle: Array<{ id: string; title: string; icon: string; content?: string; matchType: 'title' | 'content' }> = [];
    const matchesContent: typeof matchesTitle = [];

    state.pages.forEach(p => {
      const titleMatch = p.title.toLowerCase().includes(lowerQuery);
      // Busca em texto puro (sem tags HTML) para evitar falsos positivos
      const plainContent = p.content ? stripHtml(p.content) : '';
      const contentMatch = plainContent.toLowerCase().includes(lowerQuery);

      if (titleMatch) {
        matchesTitle.push({ id: p.id, title: p.title, icon: p.icon, content: plainContent, matchType: 'title' });
      } else if (contentMatch) {
        matchesContent.push({ id: p.id, title: p.title, icon: p.icon, content: plainContent, matchType: 'content' });
      }
    });

    return [...matchesTitle, ...matchesContent];
  }, [debouncedQuery, state.pages]);

  /** Gera snippet com highlight seguro do termo buscado */
  const getSnippet = useCallback((content: string | undefined, term: string) => {
    if (!content || !term) return null;

    const lowerContent = content.toLowerCase();
    const idx = lowerContent.indexOf(term.toLowerCase());
    if (idx === -1) return null;

    const start = Math.max(0, idx - 50);
    const end = Math.min(content.length, idx + term.length + 50);

    let snippet = content.substring(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < content.length) snippet = snippet + '…';

    // Escapa o termo antes de usar em regex para evitar injeção
    const safeTerm = escapeRegex(term);
    const parts = snippet.split(new RegExp(`(${safeTerm})`, 'gi'));

    return (
      <span className="text-dark-subtext text-xs leading-relaxed">
        {parts.map((part, i) =>
          part.toLowerCase() === term.toLowerCase()
            ? <span key={i} className="text-brand-300 font-semibold bg-brand-500/15 px-0.5 rounded">{part}</span>
            : part
        )}
      </span>
    );
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const selectedEl = scrollRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleSelect = useCallback((pageId: string) => {
    dispatch({ type: 'NAVIGATE_IN_TAB', pageId });
    setIsOpen(false);
  }, [dispatch]);

  const handleKeyDownList = useCallback((e: React.KeyboardEvent) => {
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
  }, [results, selectedIndex, handleSelect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] animate-fade-in" onClick={() => setIsOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-bg/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-[600px] max-w-[95vw] max-h-[70vh] bg-dark-bg/95 border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDownList}
      >

        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0 bg-dark-card/30">
          <Search size={20} className="text-brand-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar em todas as páginas..."
            className="flex-1 bg-transparent text-base text-dark-text placeholder-dark-subtext outline-none font-medium"
            autoFocus
          />
          <kbd className="text-[10px] font-mono text-dark-subtext bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          {debouncedQuery.trim() === '' ? (
            <div className="flex flex-col items-center justify-center text-dark-subtext opacity-50 p-10 text-center">
              <Search size={40} className="mb-3 opacity-20" />
              <p className="text-sm font-medium">Digite para buscar no Caderno</p>
              <p className="text-xs mt-1 opacity-70">Busca títulos e conteúdos de todas as páginas</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-dark-subtext p-10 text-center">
              <FileText size={28} className="mb-3 opacity-30 text-red-400" />
              <p className="text-sm font-medium text-dark-text">Nenhum resultado encontrado</p>
              <p className="text-xs mt-1 opacity-70">Não achamos nada com "{debouncedQuery}"</p>
            </div>
          ) : (
            <div ref={scrollRef} className="p-1.5">
              {results.map((page, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={page.id}
                    onClick={() => handleSelect(page.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      isSelected
                        ? 'bg-brand-500/15 border border-brand-500/30'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-base">
                      {page.icon || '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm truncate font-medium ${isSelected ? 'text-brand-300' : 'text-dark-text'}`}>
                          {page.title || 'Sem título'}
                        </span>
                        {page.matchType === 'title' && (
                          <span className="ml-auto shrink-0 text-[10px] uppercase tracking-widest text-brand-400/70 font-semibold bg-brand-500/10 px-1.5 py-0.5 rounded">
                            Título
                          </span>
                        )}
                        {page.matchType === 'content' && (
                          <span className="ml-auto shrink-0 text-[10px] uppercase tracking-widest text-emerald-400/70 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            Conteúdo
                          </span>
                        )}
                      </div>
                      {page.matchType === 'content' && page.content && (
                        <div className="mt-1">
                          {getSnippet(page.content, debouncedQuery)}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <CornerDownLeft size={14} className="text-brand-400 shrink-0 opacity-60" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 border-t border-white/5 bg-dark-card/20 text-[11px] text-dark-subtext shrink-0">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white/5 border border-white/10 px-1 rounded">↑↓</kbd> navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white/5 border border-white/10 px-1 rounded">Enter</kbd> abrir
            </span>
            <span className="ml-auto opacity-60">{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}
