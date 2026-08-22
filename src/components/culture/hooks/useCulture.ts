import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CultureItem, CultureEpisode } from '../../../types';
import { CultureService } from '../../../services/culture';
import { useLocalStorage } from '../../../hooks/useLocalStorage';

export type FilterType = 'all' | 'goals' | 'finished' | 'anime' | 'filme' | 'série' | 'hq' | 'manga' | 'livro' | 'novel';
export type ViewMode = 'grid' | 'compact' | 'list';
export type SortMode = 'default' | 'alpha' | 'progress' | 'added';

export const DEFAULT_TYPE_ORDER: string[] = ['anime', 'série', 'filme', 'manga', 'hq', 'livro', 'novel'];

export const TYPE_LABELS: Record<string, string> = {
  anime: '🎌 Animes',
  série: '📺 Séries',
  filme: '🎬 Filmes',
  manga: '📖 Mangás',
  hq: '💥 HQs',
  livro: '📚 Livros',
  novel: '📝 Novels',
};

export const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'default', label: 'Padrão' },
  { value: 'alpha',   label: 'Alfabético' },
  { value: 'progress', label: '% Progresso' },
  { value: 'added',  label: 'Mais recente' },
];

export function sortItems(items: CultureItem[], mode: SortMode): CultureItem[] {
  return [...items].sort((a, b) => {
    if (mode === 'alpha') return (a.title || '').localeCompare(b.title || '', 'pt-BR');
    if (mode === 'progress') {
      const pa = a.total_progress > 0 ? a.progress / a.total_progress : 0;
      const pb = b.total_progress > 0 ? b.progress / b.total_progress : 0;
      return pb - pa;
    }
    if (mode === 'added') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    // default: goals -> recent -> completed last
    const aFinished = a.total_progress > 0 && a.progress >= a.total_progress;
    const bFinished = b.total_progress > 0 && b.progress >= b.total_progress;
    if (aFinished !== bFinished) return aFinished ? 1 : -1;
    if (!!a.is_goal !== !!b.is_goal) return a.is_goal ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

function loadSectionOrder(): string[] {
  try {
    const stored = localStorage.getItem('culture_section_order');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_TYPE_ORDER];
}

export function useCulture() {
  const [items, setItems] = useState<CultureItem[]>([]);
  const [recentReleases, setRecentReleases] = useState<(CultureEpisode & { item_title: string; item_cover: string })[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('culture_view_mode', 'grid');
  const [sortMode, setSortMode] = useLocalStorage<SortMode>('culture_sort_mode', 'default');
  const [showGoalsSection, setShowGoalsSection] = useLocalStorage<boolean>('culture_show_goals_section', true);
  const [sectionOrder, setSectionOrder] = useState<string[]>(loadSectionOrder);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await CultureService.getItems();
      setItems(data);
      const releases = await CultureService.getRecentReleases();
      setRecentReleases(releases);
      
      // Sync background (non-blocking)
      CultureService.syncOngoingItems(data).then(() => {
        CultureService.getRecentReleases().then(r => setRecentReleases(r));
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const removeListener = window.api?.onSyncTrigger?.(() => loadData());
    return () => {
      if (removeListener) removeListener();
    };
  }, [loadData]);

  const toggleGoalsSection = useCallback(() => {
    setShowGoalsSection(prev => !prev);
  }, [setShowGoalsSection]);

  const moveSectionUp = useCallback((type: string) => {
    setSectionOrder(prev => {
      const idx = prev.indexOf(type);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      localStorage.setItem('culture_section_order', JSON.stringify(next));
      return next;
    });
  }, []);

  const moveSectionDown = useCallback((type: string) => {
    setSectionOrder(prev => {
      const idx = prev.indexOf(type);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      localStorage.setItem('culture_section_order', JSON.stringify(next));
      return next;
    });
  }, []);

  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => {
      const titleStr = item.title || 'Obra sem nome';
      const matchSearch =
        titleStr.toLowerCase().includes(search.toLowerCase()) ||
        (item.synopsis && item.synopsis.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;

      if (activeFilter === 'goals') return !!item.is_goal;
      if (activeFilter === 'finished') return item.total_progress > 0 && item.progress >= item.total_progress;
      if (activeFilter !== 'all') return item.type === activeFilter;

      return true;
    });

    return sortItems(filtered, sortMode);
  }, [items, search, activeFilter, sortMode]);

  const goalItems = useMemo(() => filteredItems.filter(i => !!i.is_goal), [filteredItems]);
  const finishedItems = useMemo(() => filteredItems.filter(i => i.total_progress > 0 && i.progress >= i.total_progress), [filteredItems]);

  const itemsByType = useMemo(() => {
    const map: Record<string, CultureItem[]> = {};
    filteredItems.forEach(item => {
      const isFinished = item.total_progress > 0 && item.progress >= item.total_progress;
      if (activeFilter === 'goals' && !item.is_goal) return;
      if (activeFilter === 'finished' && !isFinished) return;
      if (activeFilter !== 'all' && activeFilter !== 'goals' && activeFilter !== 'finished') {
        if (item.type !== activeFilter) return;
      }
      
      const t = item.type || 'outros';
      if (!map[t]) map[t] = [];
      map[t].push(item);
    });
    return map;
  }, [filteredItems, activeFilter]);

  return {
    items,
    recentReleases,
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    isLoading,
    viewMode,
    setViewMode,
    sortMode,
    setSortMode,
    showGoalsSection,
    toggleGoalsSection,
    sectionOrder,
    moveSectionUp,
    moveSectionDown,
    filteredItems,
    goalItems,
    finishedItems,
    itemsByType,
    loadData
  };
}
