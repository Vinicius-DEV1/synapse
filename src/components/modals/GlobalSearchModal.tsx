import { useCallback } from 'react';
import { Search, FileText, Sparkles } from 'lucide-react';
import { HighlightedText } from './search/SearchHighlight';
import { useGlobalSearch } from './search/useGlobalSearch';
import { GlobalSearchItem } from './search/GlobalSearchItem';

export default function GlobalSearchModal() {
  const {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    debouncedQuery,
    selectedIndex,
    setSelectedIndex,
    scope,
    setScope,
    inputRef,
    scrollRef,
    results,
    handleSelect,
    handleKeyDownList,
  } = useGlobalSearch();

  /** Generates safe contextual snippet highlighting matched terms */
  const getSnippet = useCallback((content: string | undefined, queryStr: string) => {
    if (!content || !queryStr.trim()) return null;

    const terms = queryStr.trim().split(/\s+/).filter(Boolean);
    const lowerContent = content.toLowerCase();
    let firstIndex = -1;
    let matchedTerm = '';

    for (const term of terms) {
      const idx = lowerContent.indexOf(term.toLowerCase());
      if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) {
        firstIndex = idx;
        matchedTerm = term;
      }
    }

    if (firstIndex === -1) return null;

    const start = Math.max(0, firstIndex - 45);
    const end = Math.min(content.length, firstIndex + matchedTerm.length + 55);

    let snippet = content.substring(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < content.length) snippet = snippet + '…';

    return (
      <HighlightedText
        text={snippet}
        query={queryStr}
        className="text-dark-subtext text-xs leading-relaxed"
      />
    );
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] animate-fade-in"
      onClick={() => setIsOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-bg/65 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-[640px] max-w-[95vw] max-h-[75vh] bg-dark-bg/95 border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDownList}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 shrink-0 bg-dark-card/40">
          <Search size={20} className="text-brand-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por título, pasta ou conteúdo..."
            className="flex-1 bg-transparent text-base text-dark-text placeholder-dark-subtext/70 outline-none font-medium"
            autoFocus
          />
          <kbd className="text-[10px] font-mono text-dark-subtext bg-white/5 border border-white/10 px-1.5 py-0.5 rounded shadow-sm">
            ESC
          </kbd>
        </div>

        {/* Scope Filter Chips */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/5 bg-dark-card/20 text-xs shrink-0 overflow-x-auto">
          {(
            [
              { key: 'all', label: 'Todos' },
              { key: 'title', label: 'Títulos e Pastas' },
              { key: 'content', label: 'Conteúdo' },
              { key: 'pinned', label: 'Fixadas' },
            ] as const
          ).map(tab => {
            const isActive = scope === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setScope(tab.key);
                  setSelectedIndex(0);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm'
                    : 'text-dark-subtext hover:text-dark-text hover:bg-white/5 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          {debouncedQuery.trim() === '' && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-dark-subtext opacity-60 p-12 text-center">
              <Sparkles size={36} className="mb-3 opacity-30 text-brand-400" />
              <p className="text-sm font-medium text-dark-text">Nenhuma página disponível</p>
              <p className="text-xs mt-1 opacity-70">Crie sua primeira página para começar</p>
            </div>
          ) : debouncedQuery.trim() !== '' && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-dark-subtext p-12 text-center">
              <FileText size={32} className="mb-3 opacity-40 text-rose-400" />
              <p className="text-sm font-medium text-dark-text">Nenhum resultado encontrado</p>
              <p className="text-xs mt-1 opacity-70">
                Não encontramos nada correspondente a "{debouncedQuery}"
              </p>
            </div>
          ) : (
            <div ref={scrollRef} className="p-2 space-y-1">
              {debouncedQuery.trim() === '' && (
                <div className="px-2.5 py-1 text-[11px] font-semibold text-dark-subtext/70 uppercase tracking-wider">
                  {scope === 'pinned' ? 'Páginas Fixadas' : 'Páginas Recentes'}
                </div>
              )}
              {results.map((page, index) => (
                <GlobalSearchItem
                  key={page.id}
                  page={page}
                  isSelected={index === selectedIndex}
                  debouncedQuery={debouncedQuery}
                  onSelect={handleSelect}
                  onMouseEnter={() => setSelectedIndex(index)}
                  getSnippet={getSnippet}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="flex items-center gap-3 sm:gap-4 px-4 py-2.5 border-t border-white/5 bg-dark-card/30 text-[11px] text-dark-subtext shrink-0 select-none flex-wrap">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[10px]">
                ↑↓
              </kbd>{' '}
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[10px]">
                Enter
              </kbd>{' '}
              abrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[10px]">
                Ctrl+Enter
              </kbd>{' '}
              nova aba
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[10px]">
                Tab
              </kbd>{' '}
              filtro
            </span>
            <span className="ml-auto opacity-70 font-medium">
              {debouncedQuery.trim() === ''
                ? `${results.length} sugestõe${results.length !== 1 ? 's' : ''}`
                : `${results.length} resultado${results.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
