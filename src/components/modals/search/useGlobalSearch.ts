import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../../../store/useStore';
import { getPageAncestors, type HierarchyNode } from '../../../utils/hierarchy';
import type { Page } from '../../../types';
import {
  type SearchScope,
  type SearchResultItem,
  getCachedPlainText,
} from './search-utils';

export function useGlobalSearch() {
  const { state, dispatch } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scope, setScope] = useState<SearchScope>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ancestor breadcrumbs map per page - computed only when modal is actively open
  const pageAncestorsMap = useMemo(() => {
    if (!isOpen) return new Map<string, HierarchyNode[]>();
    const map = new Map<string, HierarchyNode[]>();
    for (const p of state.pages) {
      map.set(p.id, getPageAncestors(state.pages, p.id));
    }
    return map;
  }, [state.pages, isOpen]);

  // Open/close keyboard shortcut listeners
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

  // Result ranking calculation - deferred until modal is open
  const results: SearchResultItem[] = useMemo(() => {
    if (!isOpen) return [];
    const trimmed = debouncedQuery.trim().toLowerCase();

    // 1. Initial empty state: show pinned and recent pages (Quick Switcher)
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

      const sortedByDate = [...state.pages].sort((a, b) => {
        const dateA = a.updated_at || '';
        const dateB = b.updated_at || '';
        return dateB > dateA ? 1 : dateB < dateA ? -1 : 0;
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

    // 2. Active search across terms
    const terms = trimmed.split(/\s+/).filter(Boolean);
    const matchedItems: SearchResultItem[] = [];

    state.pages.forEach((p: Page) => {
      if (scope === 'pinned' && p.is_pinned !== 1) {
        return;
      }

      const pageTitle = (p.title || 'Sem título').trim();
      const pageTitleLower = pageTitle.toLowerCase();
      const ancestors = pageAncestorsMap.get(p.id) || [];
      const ancestryTitles = ancestors.map(a => a.title || 'Sem título').join(' ');
      const ancestryTitlesLower = ancestryTitles.toLowerCase();
      const fullPathLower = `${ancestryTitlesLower} ${pageTitleLower}`;

      const shouldSearchContent = scope === 'all' || scope === 'content';
      const plainContent = shouldSearchContent && p.content ? getCachedPlainText(p.id, p.content) : '';
      const plainContentLower = plainContent.toLowerCase();

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

    matchedItems.sort((a, b) => b.score - a.score);
    return matchedItems;
  }, [isOpen, debouncedQuery, scope, state.pages, pageAncestorsMap]);

  // Keep selected index visible in scroll view
  useEffect(() => {
    if (scrollRef.current) {
      const selectedEl = scrollRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (pageId: string, openInNewTab = false) => {
      setIsOpen(false);
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
    },
    [dispatch]
  );

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

  return {
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
  };
}
