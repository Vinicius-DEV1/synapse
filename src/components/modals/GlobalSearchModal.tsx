import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Search, FileText, CornerDownLeft, ChevronRight, Pin, Clock, Sparkles } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getPageAncestors, type HierarchyNode } from '../../utils/hierarchy';
import type { Page } from '../../types';
import {
  type SearchScope,
  type SearchResultItem,
  getCachedPlainText,
} from './search/search-utils';
import { HighlightedText } from './search/SearchHighlight';

export default function GlobalSearchModal() {
  const { state, dispatch } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scope, setScope] = useState<SearchScope>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ancestor breadcrumbs map per page
  const pageAncestorsMap = useMemo(() => {
    const map = new Map<string, HierarchyNode[]>();
    for (const p of state.pages) {
      map.set(p.id, getPageAncestors(state.pages, p.id));
    }
    return map;
  }, [state.pages]);

  // Controle de abertura e fechamento
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
      setScope('all');
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
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setSelectedIndex(0);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  // Cálculo e ranking dos resultados
  const results: SearchResultItem[] = useMemo(() => {
    const trimmed = debouncedQuery.trim().toLowerCase();

    // 1. Estado sem digitação: exibe fixadas e páginas recentes (Quick Switcher)
    if (!trimmed) {
      if (scope === 'pinned') {
        return state.pages
          .filter((p: Page) => p.is_pinned === 1)
          .map((p: Page) => ({
            id: p.id,
            title: p.title || 'Sem título',
            icon: p.icon || '📄',
            ancestors: pageAncestorsMap.get(p.id) || [],
            matchType: 'pinned',
            is_pinned: p.is_pinned,
            score: 100,
          }));
      }

      // Recent pages sorted by updated_at
      const sortedByDate = [...state.pages].sort((a, b) => {
        const dateA = new Date(a.updated_at || 0).getTime();
        const dateB = new Date(b.updated_at || 0).getTime();
        return dateB - dateA;
      });

      const recentItems: SearchResultItem[] = sortedByDate.slice(0, 10).map((p: Page) => ({
        id: p.id,
        title: p.title || 'Sem título',
        icon: p.icon || '📄',
        ancestors: pageAncestorsMap.get(p.id) || [],
        matchType: p.is_pinned === 1 ? 'pinned' : 'recent',
        is_pinned: p.is_pinned,
        isRecent: true,
        score: 50,
      }));

      return recentItems;
    }

    // 2. Busca ativa com termos múltiplos
    const terms = trimmed.split(/\s+/).filter(Boolean);
    const matchedItems: SearchResultItem[] = [];

    state.pages.forEach((p: Page) => {
      // Filtro de fixadas
      if (scope === 'pinned' && p.is_pinned !== 1) {
        return;
      }

      const pageTitle = (p.title || 'Sem título').trim();
      const pageTitleLower = pageTitle.toLowerCase();
      const ancestors = pageAncestorsMap.get(p.id) || [];
      const ancestryTitles = ancestors.map(a => a.title || 'Sem título').join(' ');
      const ancestryTitlesLower = ancestryTitles.toLowerCase();
      const fullPathLower = `${ancestryTitlesLower} ${pageTitleLower}`;

      // Extrai texto puro para busca de conteúdo se escopo permitir
      const shouldSearchContent = scope === 'all' || scope === 'content';
      const plainContent = shouldSearchContent && p.content ? getCachedPlainText(p.id, p.content) : '';
      const plainContentLower = plainContent.toLowerCase();

      // Checagem de correspondência
      const titleExact = pageTitleLower === trimmed;
      const titleStartsWith = pageTitleLower.startsWith(trimmed);
      const titleIncludesAllTerms = terms.every(t => pageTitleLower.includes(t));
      const pathIncludesAllTerms = terms.every(t => fullPathLower.includes(t));
      const contentIncludesAllTerms = shouldSearchContent && terms.length > 0 && terms.every(t => plainContentLower.includes(t));

      let matchType: 'title' | 'path' | 'content' | null = null;
      let score = 0;

      if (scope === 'content') {
        if (contentIncludesAllTerms) {
          matchType = 'content';
          score = 300;
        }
      } else if (scope === 'title') {
        if (titleExact) {
          matchType = 'title';
          score = 1000;
        } else if (titleStartsWith) {
          matchType = 'title';
          score = 800;
        } else if (titleIncludesAllTerms) {
          matchType = 'title';
          score = 600;
        } else if (pathIncludesAllTerms) {
          matchType = 'path';
          score = 400;
        }
      } else {
        // Escopo 'all' ou 'pinned'
        if (titleExact) {
          matchType = 'title';
          score = 1000;
        } else if (titleStartsWith) {
          matchType = 'title';
          score = 800;
        } else if (titleIncludesAllTerms) {
          matchType = 'title';
          score = 600;
        } else if (pathIncludesAllTerms) {
          matchType = 'path';
          score = 450;
        } else if (contentIncludesAllTerms) {
          matchType = 'content';
          score = 250;
        }
      }

      if (matchType) {
        // Bônus se fixada
        if (p.is_pinned === 1) score += 30;

        matchedItems.push({
          id: p.id,
          title: pageTitle,
          icon: p.icon || '📄',
          content: plainContent,
          matchType,
          ancestors,
          is_pinned: p.is_pinned,
          score,
        });
      }
    });

    // Ordenação por pontuação decrescente
    matchedItems.sort((a, b) => b.score - a.score);
    return matchedItems;
  }, [debouncedQuery, scope, state.pages, pageAncestorsMap]);

  /** Gera snippet contextual seguro com destaque para o termo buscado */
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

  // Mantém o item selecionado visível no scroll
  useEffect(() => {
    if (scrollRef.current) {
      const selectedEl = scrollRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Ação de seleção de página (na aba atual ou em nova aba)
  const handleSelect = useCallback(
    (pageId: string, openInNewTab = false) => {
      if (openInNewTab) {
        const tabId =
          'tab_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        dispatch({
          type: 'ADD_TAB',
          tab: {
            id: tabId,
            module: 'notes',
            pageId,
            unsavedContent: null,
            scrollY: 0,
          },
        });
      } else {
        dispatch({ type: 'NAVIGATE_IN_TAB', pageId });
      }
      setIsOpen(false);
    },
    [dispatch]
  );

  // Navegação por teclado
  const handleKeyDownList = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const scopes: SearchScope[] = ['all', 'title', 'content', 'pinned'];
        const currentIdx = scopes.indexOf(scope);
        const nextScope = scopes[(currentIdx + 1) % scopes.length];
        setScope(nextScope);
        setSelectedIndex(0);
        return;
      }

      if (!results.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const isNewTab = e.ctrlKey || e.metaKey;
        handleSelect(results[selectedIndex].id, isNewTab);
      }
    },
    [results, selectedIndex, scope, handleSelect]
  );

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
              {results.map((page, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={page.id}
                    onClick={e => {
                      if (e.ctrlKey || e.metaKey) {
                        handleSelect(page.id, true);
                      } else {
                        handleSelect(page.id, false);
                      }
                    }}
                    onAuxClick={e => {
                      if (e.button === 1) {
                        e.preventDefault();
                        handleSelect(page.id, true);
                      }
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-brand-500/15 border border-brand-500/35 shadow-[0_2px_12px_rgba(139,92,246,0.12)]'
                        : 'hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base transition-colors ${
                        isSelected
                          ? 'bg-brand-500/25 border border-brand-500/40 text-brand-200'
                          : 'bg-white/5 border border-white/10 text-dark-text'
                      }`}
                    >
                      {page.icon || '📄'}
                    </div>

                    {/* Content & Path */}
                    <div className="flex-1 min-w-0">
                      {/* Breadcrumbs Ancestors */}
                      {page.ancestors && page.ancestors.length > 0 && (
                        <div className="flex items-center gap-1 text-[11px] text-dark-subtext/75 font-normal truncate mb-0.5 leading-none">
                          {page.ancestors.map(anc => (
                            <span
                              key={anc.id}
                              className="flex items-center gap-1 shrink-0 max-w-[140px] truncate"
                            >
                              <span className="opacity-80 text-[10px]">{anc.icon || '📁'}</span>
                              <HighlightedText
                                text={anc.title || 'Sem título'}
                                query={debouncedQuery}
                                className="truncate"
                              />
                              <ChevronRight
                                size={11}
                                className="text-dark-subtext/40 shrink-0 mx-0.5"
                              />
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Main Title & Badges */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm truncate font-medium ${
                            isSelected ? 'text-brand-200 font-semibold' : 'text-dark-text'
                          }`}
                        >
                          <HighlightedText text={page.title || 'Sem título'} query={debouncedQuery} />
                        </span>

                        {/* Badges */}
                        <div className="ml-auto flex items-center gap-1.5 shrink-0">
                          {page.is_pinned === 1 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                              <Pin size={10} className="shrink-0" />
                              <span>Fixada</span>
                            </span>
                          )}

                          {page.matchType === 'title' && (
                            <span className="text-[10px] uppercase tracking-wider text-brand-300 font-semibold bg-brand-500/15 border border-brand-500/30 px-1.5 py-0.5 rounded-md">
                              Título
                            </span>
                          )}

                          {page.matchType === 'path' && (
                            <span className="text-[10px] uppercase tracking-wider text-sky-300 font-semibold bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.5 rounded-md">
                              Caminho
                            </span>
                          )}

                          {page.matchType === 'content' && (
                            <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                              Conteúdo
                            </span>
                          )}

                          {page.isRecent && (
                            <span className="flex items-center gap-0.5 text-[10px] text-dark-subtext/80 font-medium bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md">
                              <Clock size={10} className="shrink-0" />
                              <span>Recente</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Snippet */}
                      {page.matchType === 'content' && page.content && (
                        <div className="mt-1 pl-1.5 border-l-2 border-emerald-500/30 py-0.5">
                          {getSnippet(page.content, debouncedQuery)}
                        </div>
                      )}
                    </div>

                    {/* Action Indicator */}
                    {isSelected && (
                      <CornerDownLeft size={14} className="text-brand-400 shrink-0 opacity-80 pl-1" />
                    )}
                  </button>
                );
              })}
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
