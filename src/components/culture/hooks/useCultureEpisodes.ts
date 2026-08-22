import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { CultureItem, CultureEpisode } from '../../../types';
import { CultureService } from '../../../services/culture';
import { syncTvMazeEpisodes, syncJikanEpisodes } from '../../../services/culture/culture-episodes-sync';
import { enrichEpisodes, type EnrichedEpisode } from '../episodes/EpisodeRow';

interface UseCultureEpisodesProps {
  item: CultureItem;
  isOpen: boolean;
  onUpdateProgress: (progress: number) => void;
}

export function useCultureEpisodes({ item, isOpen, onUpdateProgress }: UseCultureEpisodesProps) {
  const [episodes, setEpisodes] = useState<CultureEpisode[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showFuture, setShowFuture] = useState(true);
  const [epSearch, setEpSearch] = useState('');
  const isMounted = useRef(true);

  const startBackgroundSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setError(null);
    setSyncProgress(0);

    try {
      if (item.api_source === 'tvmaze') {
        const synced = await syncTvMazeEpisodes(item, {
          onProgress: (count) => setSyncProgress(count),
          shouldContinue: () => isMounted.current,
        });
        if (isMounted.current) setEpisodes(synced);
      } else if (item.api_source === 'jikan') {
        const synced = await syncJikanEpisodes(item, {
          onProgress: (count) => {
            if (isMounted.current) {
              setSyncProgress(prev => prev + count);
              CultureService.getEpisodes(item.id).then(curr => {
                if (isMounted.current) setEpisodes(curr);
              });
            }
          },
          shouldContinue: () => isMounted.current,
        });
        if (isMounted.current) setEpisodes(synced);
      }
    } catch (err: any) {
      console.error('Erro na sincronização:', err);
      if (isMounted.current) setError('Falha ao sincronizar episódios. Tente novamente.');
    } finally {
      if (isMounted.current) setIsSyncing(false);
    }
  }, [isSyncing, item]);

  const loadEpisodes = useCallback(async () => {
    try {
      const eps = await CultureService.getEpisodes(item.id);
      setEpisodes(eps);
      if (eps.length === 0 && item.api_id && item.api_source) {
        startBackgroundSync();
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar episódios locais.');
    }
  }, [item.api_id, item.api_source, item.id, startBackgroundSync]);

  useEffect(() => {
    isMounted.current = true;
    if (isOpen) {
      loadEpisodes();
      setEpSearch('');
    }
    return () => {
      isMounted.current = false;
    };
  }, [isOpen, loadEpisodes]);

  const toggleWatched = async (ep: CultureEpisode) => {
    try {
      const newState = !ep.is_watched;
      await CultureService.toggleEpisodeWatched(ep.id, newState);
      setEpisodes(prev => prev.map(e => e.id === ep.id ? { ...e, is_watched: newState } : e));
      const count = episodes.filter(e => e.id !== ep.id ? e.is_watched : newState).length;
      onUpdateProgress(count);
    } catch (err) {
      console.error('Erro ao marcar episódio', err);
    }
  };

  const markSeasonAll = async (eps: EnrichedEpisode[], watched: boolean) => {
    try {
      await Promise.all(eps.map(ep => CultureService.toggleEpisodeWatched(ep.id, watched)));
      const idsSet = new Set(eps.map(e => e.id));
      setEpisodes(prev => prev.map(e => idsSet.has(e.id) ? { ...e, is_watched: watched } : e));
      const count = episodes.filter(e => idsSet.has(e.id) ? watched : e.is_watched).length;
      onUpdateProgress(count);
    } catch (err) {
      console.error('Erro ao marcar temporada', err);
    }
  };

  // Derived data
  const isTvMaze = item.api_source === 'tvmaze';
  const enriched = useMemo(() => enrichEpisodes(episodes, isTvMaze), [episodes, isTvMaze]);

  const futureEpisodes = useMemo(() => enriched.filter(e => e._isFuture), [enriched]);
  const pastEpisodes = useMemo(() => enriched.filter(e => !e._isFuture), [enriched]);

  const hasSeasonsData = useMemo(() => pastEpisodes.some(e => e._season != null), [pastEpisodes]);

  const seasonGroups = useMemo(() => {
    if (!hasSeasonsData) return null;
    const map = new Map<number, EnrichedEpisode[]>();
    for (const ep of pastEpisodes) {
      const s = ep._season ?? 0;
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(ep);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([season, eps]) => ({
        season,
        episodes: eps.sort((a, b) => (a._epInSeason ?? a.episode_number) - (b._epInSeason ?? b.episode_number)),
      }));
  }, [pastEpisodes, hasSeasonsData]);

  const currentSeasonNum = useMemo(() => {
    if (!seasonGroups) return null;
    for (const g of seasonGroups) {
      if (g.episodes.some(e => !e.is_watched)) return g.season;
    }
    return seasonGroups[seasonGroups.length - 1]?.season ?? null;
  }, [seasonGroups]);

  const nextEpisode = useMemo(() => pastEpisodes.find(e => !e.is_watched) ?? null, [pastEpisodes]);

  const searchedEpisodes = useMemo(() => {
    const q = epSearch.trim().toLowerCase();
    if (!q) return null;
    return enriched.filter(e =>
      e.title.toLowerCase().includes(q) ||
      String(e.episode_number).includes(q) ||
      (e._epInSeason != null && String(e._epInSeason).includes(q))
    );
  }, [epSearch, enriched]);

  const watchedCount = episodes.filter(e => e.is_watched).length;
  const progressPercent = episodes.length > 0 ? Math.round((watchedCount / episodes.length) * 100) : 0;

  return {
    episodes,
    isSyncing,
    syncProgress,
    error,
    showFuture,
    setShowFuture,
    epSearch,
    setEpSearch,
    startBackgroundSync,
    toggleWatched,
    markSeasonAll,
    enriched,
    futureEpisodes,
    pastEpisodes,
    hasSeasonsData,
    seasonGroups,
    currentSeasonNum,
    nextEpisode,
    searchedEpisodes,
    watchedCount,
    progressPercent,
  };
}
