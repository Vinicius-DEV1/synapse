import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  RecommendationCluster,
  HydratedRecommendation,
  RecommendationFilterTab,
  SerendipityMode,
  AiCulturalDnaProfile,
} from '../../../types/culture-recommendations';
import { CultureRecommendationsService } from '../../../services/culture/culture-recommendations';
import { CultureFeedbackStorage } from '../../../services/culture/culture-feedback-storage';

export function useRecommendations(onLibraryUpdated?: () => void) {
  const [clusters, setClusters] = useState<RecommendationCluster[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSubFilter, setActiveSubFilter] = useState<RecommendationFilterTab>('all');
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [aiDna, setAiDna] = useState<AiCulturalDnaProfile | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{
    isActive: boolean;
    phase: string;
    currentBatch: number;
    totalBatches: number;
    message: string;
    progressPercent: number;
    totalItemsCount: number;
  }>({
    isActive: false,
    phase: 'idle',
    currentBatch: 0,
    totalBatches: 2,
    message: '',
    progressPercent: 0,
    totalItemsCount: 0,
  });

  const [expandingClusterId, setExpandingClusterId] = useState<string | null>(null);

  const [serendipityMode, setSerendipityModeState] = useState<SerendipityMode>(() => {
    try {
      const saved = localStorage.getItem('culture_rec_serendipity_mode');
      return (saved === 'explore' ? 'explore' : 'safe') as SerendipityMode;
    } catch {
      return 'safe';
    }
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadRecommendations = useCallback(async (forceRefresh = false, modeOverride?: SerendipityMode) => {
    const mode = modeOverride || serendipityMode;
    try {
      if (forceRefresh) {
        setIsGenerating(true);
      } else {
        // SWR fast path: synchronously check cache to render with 0ms perceived latency
        const cached = await CultureFeedbackStorage.getCachedRecommendations();
        if (cached && isMountedRef.current) {
          setClusters(cached.clusters);
          setLastGeneratedAt(cached.generated_at);
          setAiDna(cached.ai_dna || null);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }
      }
      if (isMountedRef.current) {
        setError(null);
      }

      const result = await CultureRecommendationsService.getRecommendationsProgressive(
        forceRefresh,
        mode,
        (update) => {
          if (!isMountedRef.current) return;

          setGenerationProgress({
            isActive: update.phase !== 'complete' && update.phase !== 'error',
            phase: update.phase,
            currentBatch: update.currentBatch,
            totalBatches: update.totalBatches,
            message: update.message,
            progressPercent: update.progressPercent,
            totalItemsCount: update.totalItemsCount,
          });

          // Progressive rendering: mount cards smoothly without collapsing page height or causing scroll jumps!
          if (update.clusters && update.clusters.length > 0) {
            setClusters(prevClusters => {
              if (!prevClusters || prevClusters.length === 0) {
                return update.clusters;
              }
              // If previous clusters existed, preserve the bottom clusters to avoid height collapse / scroll jump
              const merged = [...update.clusters];
              if (prevClusters.length > update.clusters.length) {
                merged.push(...prevClusters.slice(update.clusters.length));
              }
              return merged;
            });
            setIsLoading(false);
          }
        }
      );

      if (!isMountedRef.current) return;
      if (result && result.length > 0) {
        setClusters(result);
      }

      const cached = await CultureFeedbackStorage.getCachedRecommendations();
      if (cached && isMountedRef.current) {
        setLastGeneratedAt(cached.generated_at);
        setAiDna(cached.ai_dna || null);
      }
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Falha ao carregar recomendações.';
      console.error('[useRecommendations] Erro:', err);
      setError(message);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsGenerating(false);
        setGenerationProgress(prev => ({
          ...prev,
          isActive: false,
          progressPercent: 100,
        }));
      }
    }
  }, [serendipityMode]);

  useEffect(() => {
    loadRecommendations(false);

    const handleSettingsChanged = () => {
      loadRecommendations(false);
    };

    window.addEventListener('app-settings-changed', handleSettingsChanged);
    return () => {
      window.removeEventListener('app-settings-changed', handleSettingsChanged);
    };
  }, [loadRecommendations]);

  const setSerendipityMode = useCallback((newMode: SerendipityMode) => {
    setSerendipityModeState(newMode);
    try {
      localStorage.setItem('culture_rec_serendipity_mode', newMode);
    } catch {}
    loadRecommendations(false, newMode);
  }, [loadRecommendations]);

  const handleAddItem = useCallback(async (item: HydratedRecommendation) => {
    try {
      // Optimistic visual confirmation
      setAddedItemIds(prev => {
        const next = new Set(prev);
        next.add(item.id);
        next.add(item.title.toLowerCase().trim());
        return next;
      });

      await CultureRecommendationsService.addToLibrary(item);
      if (onLibraryUpdated) {
        onLibraryUpdated();
      }
    } catch (err) {
      console.error('[useRecommendations] Erro ao adicionar item à coleção:', err);
    }
  }, [onLibraryUpdated]);

  const handleDislikeItem = useCallback(async (item: HydratedRecommendation) => {
    // 0ms optimistic removal
    setClusters(prev =>
      prev
        .map(c => ({
          ...c,
          items: c.items.filter(i => i.id !== item.id),
        }))
        .filter(c => c.items.length > 0)
    );

    try {
      await CultureRecommendationsService.dislikeItem(item, 'not_interested');
    } catch (err) {
      console.error('[useRecommendations] Erro ao registrar não interesse:', err);
    }
  }, []);

  const handleMarkAlreadySeen = useCallback(async (item: HydratedRecommendation) => {
    // 0ms optimistic removal
    setClusters(prev =>
      prev
        .map(c => ({
          ...c,
          items: c.items.filter(i => i.id !== item.id),
        }))
        .filter(c => c.items.length > 0)
    );

    try {
      await CultureRecommendationsService.markAsAlreadySeen(item);
    } catch (err) {
      console.error('[useRecommendations] Erro ao registrar já visto/lido:', err);
    }
  }, []);

  const expandCluster = useCallback(async (clusterId: string) => {
    if (expandingClusterId) return;
    setExpandingClusterId(clusterId);
    try {
      const updated = await CultureRecommendationsService.expandCluster(clusterId, clusters);
      if (isMountedRef.current) {
        setClusters(updated);
      }
    } catch (err: unknown) {
      console.error('[useRecommendations] Falha ao expandir coleção:', err);
    } finally {
      if (isMountedRef.current) {
        setExpandingClusterId(null);
      }
    }
  }, [clusters, expandingClusterId]);

  const filteredClusters = useMemo(() => {
    if (activeSubFilter === 'all') return clusters;

    return clusters
      .map(cluster => ({
        ...cluster,
        items: cluster.items.filter(item => item.tier === activeSubFilter),
      }))
      .filter(cluster => cluster.items.length > 0);
  }, [clusters, activeSubFilter]);

  return {
    clusters: filteredClusters,
    rawClustersCount: clusters.length,
    isLoading,
    isGenerating,
    error,
    activeSubFilter,
    setActiveSubFilter,
    serendipityMode,
    setSerendipityMode,
    addedItemIds,
    lastGeneratedAt,
    aiDna,
    generationProgress,
    expandingClusterId,
    expandCluster,
    refresh: () => loadRecommendations(true),
    handleAddItem,
    handleDislikeItem,
    handleMarkAlreadySeen,
  };
}
