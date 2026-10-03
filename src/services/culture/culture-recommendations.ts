import type { CultureItem } from '../../types';
import type {
  RecommendationCluster,
  HydratedRecommendation,
  RawAIRecommendation,
  DislikedCultureItem,
  SerendipityMode,
  RecommendationProgressUpdate,
} from '../../types/culture-recommendations';
import { CultureService } from '../culture';
import { CultureFeedbackStorage } from './culture-feedback-storage';
import { extractCulturalDNA } from './culture-dna-extractor';
import { fetchCurrentFreshReleases } from './culture-fresh-releases';
import {
  CULTURE_RECOMMENDATIONS_SYSTEM_PROMPT,
  buildCultureRecommendationsPrompt,
  buildExpandClusterPrompt,
} from './culture-recommendations-prompt';
import { hydrateRecommendations } from './culture-recommendation-hydrator';
import { normalizeTitle, isItemInLibrary } from './culture-title-utils';
import { getSettings } from '../../utils/settings';
import { promptGemini } from '../gemini/client';
import { extractAiCulturalDna } from './culture-ai-dna';


interface RawClusterResponse {
  id?: string;
  title: string;
  description: string;
  items: RawAIRecommendation[];
}

interface RawGeminiOutput {
  clusters: RawClusterResponse[];
}

/**
 * Extracts and cleans JSON from AI response text with multi-strategy parsing.
 */
export function extractJsonFromResponse(text: string): RawGeminiOutput | null {
  if (!text || typeof text !== 'string') return null;

  const sanitizeJsonString = (str: string): string => {
    return str
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  };

  const tryParse = (rawCandidate: string): RawGeminiOutput | null => {
    try {
      const parsed = JSON.parse(rawCandidate);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed)) {
          return { clusters: parsed };
        }
        if (Array.isArray(parsed.clusters)) {
          return parsed as RawGeminiOutput;
        }
      }
    } catch {
      try {
        const sanitized = sanitizeJsonString(rawCandidate);
        const parsed = JSON.parse(sanitized);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed)) {
            return { clusters: parsed };
          }
          if (Array.isArray(parsed.clusters)) {
            return parsed as RawGeminiOutput;
          }
        }
      } catch {
        // Fall through
      }
    }
    return null;
  };

  // Strategy 1: Markdown codeblock ```json ... ```
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch && jsonMatch[1]) {
    const result = tryParse(jsonMatch[1].trim());
    if (result) return result;
  }

  // Strategy 2: Outermost { ... }
  const startObj = text.indexOf('{');
  const endObj = text.lastIndexOf('}');
  if (startObj !== -1 && endObj > startObj) {
    const result = tryParse(text.substring(startObj, endObj + 1));
    if (result) return result;
  }

  // Strategy 3: Outermost [ ... ]
  const startArr = text.indexOf('[');
  const endArr = text.lastIndexOf(']');
  if (startArr !== -1 && endArr > startArr) {
    const result = tryParse(text.substring(startArr, endArr + 1));
    if (result) return result;
  }

  return null;
}

/**
 * Robustly extracts an array of raw recommendations from an AI text response.
 * Handles markdown code blocks, JSON objects ({ recommendations: [...] }, { items: [...] }, { clusters: [{ items: [...] }] }),
 * and bare arrays ([...]).
 */
export function extractRecommendationsListFromResponse(text: string): RawAIRecommendation[] {
  if (!text || typeof text !== 'string') return [];

  const sanitizeJsonString = (str: string): string => {
    return str
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  };

  const tryExtractArray = (candidate: string): RawAIRecommendation[] | null => {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed as RawAIRecommendation[];
      if (parsed && typeof parsed === 'object') {
        const p = parsed as Record<string, unknown>;
        if (Array.isArray(p.recommendations)) return p.recommendations as RawAIRecommendation[];
        if (Array.isArray(p.items)) return p.items as RawAIRecommendation[];
        if (Array.isArray(p.clusters) && p.clusters.length > 0) {
          const first = p.clusters[0] as Record<string, unknown>;
          if (Array.isArray(first?.items)) return first.items as RawAIRecommendation[];
        }
      }
    } catch {
      try {
        const sanitized = sanitizeJsonString(candidate);
        const parsed = JSON.parse(sanitized);
        if (Array.isArray(parsed)) return parsed as RawAIRecommendation[];
        if (parsed && typeof parsed === 'object') {
          const p = parsed as Record<string, unknown>;
          if (Array.isArray(p.recommendations)) return p.recommendations as RawAIRecommendation[];
          if (Array.isArray(p.items)) return p.items as RawAIRecommendation[];
          if (Array.isArray(p.clusters) && p.clusters.length > 0) {
            const first = p.clusters[0] as Record<string, unknown>;
            if (Array.isArray(first?.items)) return first.items as RawAIRecommendation[];
          }
        }
      } catch {
        // Fall through
      }
    }
    return null;
  };

  // 1. Markdown code block
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch && jsonMatch[1]) {
    const res = tryExtractArray(jsonMatch[1].trim());
    if (res && res.length > 0) return res;
  }

  // 2. Outermost { ... }
  const startObj = text.indexOf('{');
  const endObj = text.lastIndexOf('}');
  if (startObj !== -1 && endObj > startObj) {
    const res = tryExtractArray(text.substring(startObj, endObj + 1));
    if (res && res.length > 0) return res;
  }

  // 3. Outermost [ ... ]
  const startArr = text.indexOf('[');
  const endArr = text.lastIndexOf(']');
  if (startArr !== -1 && endArr > startArr) {
    const res = tryExtractArray(text.substring(startArr, endArr + 1));
    if (res && res.length > 0) return res;
  }

  return [];
}

let activeProgressiveRun: {
  promise: Promise<RecommendationCluster[]>;
  listeners: Set<(update: RecommendationProgressUpdate) => void>;
  lastUpdate?: RecommendationProgressUpdate;
} | null = null;

export const CultureRecommendationsService = {
  /**
   * Generates or fetches cached personalized recommendations for the user.
   */
  async getRecommendations(
    forceRefresh = false,
    serendipityMode: SerendipityMode = 'safe'
  ): Promise<RecommendationCluster[]> {
    return this.getRecommendationsProgressive(forceRefresh, serendipityMode);
  },

  /**
   * Generates or fetches recommendations progressively in batches.
   * - Batch 1: Generates the first 2 high-priority collections and hydrates them (~4-7s).
   * - Safety Pacing: Introduces a 2s delay to protect API RPM rate limits.
   * - Batch 2: Background expansion for remaining collections with anti-duplication tracking and retry resilience.
   */
  async getRecommendationsProgressive(
    forceRefresh = false,
    serendipityMode: SerendipityMode = 'safe',
    onProgress?: (update: RecommendationProgressUpdate) => void
  ): Promise<RecommendationCluster[]> {
    const items = await CultureService.getItems();
    const disliked = await CultureFeedbackStorage.getDislikedItems();
    const ignored = await CultureFeedbackStorage.getIgnoredItems();

    const dna = extractCulturalDNA(items, disliked, ignored);
    const settings = getSettings();
    const volume = settings.cultureRecommendationsVolume || 'quadruple';
    const excludedTypes = settings.cultureExcludedTypes || [];
    const excludedThemes = settings.cultureExcludedThemes || [];
    const excludedTypeSet = new Set(excludedTypes);
    const excludedTypesKey = [...excludedTypes].sort().join('-');
    const excludedThemesKey = [...excludedThemes].map(t => t.trim().toLowerCase()).sort().join('-');
    const effectiveHash = `${dna.libraryHash}_${serendipityMode}_${volume}_exT:${excludedTypesKey}_exTh:${excludedThemesKey}_dense_v6_batched`;

    // 1. Check cache if not forcing refresh: serve cleaned cache without hitting AI on navigation
    const cached = await CultureFeedbackStorage.getCachedRecommendations();
    if (!forceRefresh && cached && cached.clusters && cached.clusters.length > 0) {
      // Filter out any newly disliked, ignored, or added items from cached clusters
      const dislikedIds = new Set(disliked.map(d => d.id));
      const dislikedTitles = new Set(disliked.map(d => normalizeTitle(d.title)));
      const ignoredTitles = new Set(ignored.map(ig => normalizeTitle(ig.title)));

      const cleanedClusters: RecommendationCluster[] = cached.clusters
        .map(cluster => ({
          ...cluster,
          items: cluster.items.filter(item => {
            const norm = normalizeTitle(item.title);
            const inLib = isItemInLibrary(item, items);
            return (
              !dislikedIds.has(item.id) &&
              !dislikedTitles.has(norm) &&
              !ignoredTitles.has(norm) &&
              !inLib &&
              !excludedTypeSet.has(item.type)
            );
          }),
        }))
        .filter(cluster => cluster.items.length > 0);

      const totalRemainingItems = cleanedClusters.reduce((acc, c) => acc + c.items.length, 0);

      // If we have cached recommendations, serve them immediately with zero network delay or layout shift
      if (totalRemainingItems >= 12 && cleanedClusters.length > 0) {
        onProgress?.({
          phase: 'complete',
          currentBatch: 2,
          totalBatches: 2,
          clusters: cleanedClusters,
          message: 'Recomendações prontas.',
          progressPercent: 100,
          isPartial: false,
          totalItemsCount: totalRemainingItems,
        });
        return cleanedClusters;
      }
    }

    // 1.5. In-flight singleton lock: attach to existing ongoing run if already generating
    if (activeProgressiveRun) {
      if (onProgress) {
        activeProgressiveRun.listeners.add(onProgress);
        if (activeProgressiveRun.lastUpdate) {
          try {
            onProgress(activeProgressiveRun.lastUpdate);
          } catch (err) {
            console.warn('[CultureRecommendations] Erro ao reproduzir lastUpdate no listener:', err);
          }
        }
      }
      return activeProgressiveRun.promise;
    }

    const listeners = new Set<(update: RecommendationProgressUpdate) => void>();
    if (onProgress) listeners.add(onProgress);

    const broadcast = (update: RecommendationProgressUpdate) => {
      if (activeProgressiveRun) {
        activeProgressiveRun.lastUpdate = update;
      }
      for (const listener of listeners) {
        try {
          listener(update);
        } catch (err) {
          console.warn('[CultureRecommendations] Erro no listener de progresso:', err);
        }
      }
    };

    const runPromise = (async () => {
      try {

    // 2. Fetch fresh broadcast/season anchors for up-to-the-minute release grounding
    const freshAnchors = await fetchCurrentFreshReleases();

    // 3. Collect previously recommended titles to ensure 100% novelty on refresh
    const historyTitles = await CultureFeedbackStorage.getRecentRecommendedTitles();
    const previousTitles = Array.from(
      new Set([
        ...(cached ? cached.clusters.flatMap(c => c.items.map(i => i.title)) : []),
        ...historyTitles,
      ])
    );

    // 3.5. Extract deep cultural DNA via AI (instant 0ms if cached for this library state)
    broadcast({
      phase: 'dna',
      currentBatch: 0,
      totalBatches: 2,
      clusters: cached?.clusters || [],
      message: 'Mapeando DNA cultural...',
      progressPercent: 10,
      isPartial: true,
      totalItemsCount: cached?.clusters ? cached.clusters.reduce((acc, c) => acc + c.items.length, 0) : 0,
    });
    const aiDna = await extractAiCulturalDna(items, dna.libraryHash);

    // Partition thematic axes across batches
    const thematicAxes = aiDna?.thematic_axes || [];
    const batch1ThematicFocus = thematicAxes.slice(0, 2);
    const batch2ThematicFocus = thematicAxes.slice(2, 5);

    // 4. BATCH 1: Prompt & Generation (~4-7s)
    broadcast({
      phase: 'batch_generating',
      currentBatch: 1,
      totalBatches: 2,
      clusters: [],
      message: 'Curando primeiro lote de obras (Lote 1 de 2)...',
      progressPercent: 25,
      isPartial: true,
      totalItemsCount: 0,
    });

    const prompt1 = buildCultureRecommendationsPrompt(
      dna,
      freshAnchors,
      serendipityMode,
      previousTitles,
      volume,
      aiDna,
      excludedTypes,
      excludedThemes,
      {
        batchIndex: 0,
        totalBatches: 2,
        targetClusterCount: 2,
        itemsPerCluster: 22,
        thematicFocus: batch1ThematicFocus,
      }
    );

    const result1 = await promptGemini(
      prompt1,
      undefined,
      [],
      undefined,
      CULTURE_RECOMMENDATIONS_SYSTEM_PROMPT,
      60000
    );

    const parsed1 = extractJsonFromResponse(result1.text);
    if (!parsed1 || !parsed1.clusters || !Array.isArray(parsed1.clusters)) {
      throw new Error('Não foi possível gerar recomendações no formato esperado. Tente novamente em instantes.');
    }

    // Hydrate Batch 1
    broadcast({
      phase: 'batch_hydrating',
      currentBatch: 1,
      totalBatches: 2,
      clusters: [],
      message: 'Buscando capas e avaliações do Lote 1...',
      progressPercent: 45,
      isPartial: true,
      totalItemsCount: 0,
    });

    const seenTracker = new Set<string>();
    const seenBatchTitles = new Set<string>();
    const accumulatedClusters: RecommendationCluster[] = [];

    for (let cIdx = 0; cIdx < parsed1.clusters.length; cIdx++) {
      const rawCluster = parsed1.clusters[cIdx];
      const validItems = (Array.isArray(rawCluster.items) ? rawCluster.items : [])
        .filter(item => !excludedTypeSet.has(item.type));
      if (validItems.length === 0) continue;

      for (const item of validItems) {
        seenBatchTitles.add(item.title);
      }

      const hydratedItems = await hydrateRecommendations(validItems, items, seenTracker);
      if (hydratedItems.length > 0) {
        accumulatedClusters.push({
          id: rawCluster.id || `cluster_${cIdx + 1}`,
          title: rawCluster.title || `Coleção ${cIdx + 1}`,
          description: rawCluster.description || '',
          items: hydratedItems,
        });
      }
    }

    const batch1ItemsCount = accumulatedClusters.reduce((acc, c) => acc + c.items.length, 0);

    // Emit Batch 1 Ready: UI will immediately render cards on screen!
    broadcast({
      phase: 'batch_ready',
      currentBatch: 1,
      totalBatches: 2,
      clusters: [...accumulatedClusters],
      message: 'Lote 1 pronto! Descobrindo mais coleções em segundo plano...',
      progressPercent: 55,
      isPartial: true,
      totalItemsCount: batch1ItemsCount,
    });

    // 5. SAFETY PACING (Rate-limit safeguard: 2000ms delay to prevent 429 RPM spikes)
    broadcast({
      phase: 'pacing',
      currentBatch: 1,
      totalBatches: 2,
      clusters: [...accumulatedClusters],
      message: 'Aguardando intervalo de segurança para expandir o acervo...',
      progressPercent: 60,
      isPartial: true,
      totalItemsCount: batch1ItemsCount,
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. BATCH 2: Background Expansion
    broadcast({
      phase: 'batch_generating',
      currentBatch: 2,
      totalBatches: 2,
      clusters: [...accumulatedClusters],
      message: 'Curando segundo lote de obras (Lote 2 de 2)...',
      progressPercent: 72,
      isPartial: true,
      totalItemsCount: batch1ItemsCount,
    });

    try {
      const prompt2 = buildCultureRecommendationsPrompt(
        dna,
        freshAnchors,
        serendipityMode,
        previousTitles,
        volume,
        aiDna,
        excludedTypes,
        excludedThemes,
        {
          batchIndex: 1,
          totalBatches: 2,
          targetClusterCount: 2,
          itemsPerCluster: 22,
          seenInPreviousBatches: Array.from(seenBatchTitles),
          thematicFocus: batch2ThematicFocus,
        }
      );

      let parsed2: RawGeminiOutput | null = null;
      try {
        const result2 = await promptGemini(
          prompt2,
          undefined,
          [],
          undefined,
          CULTURE_RECOMMENDATIONS_SYSTEM_PROMPT,
          60000
        );
        parsed2 = extractJsonFromResponse(result2.text);
      } catch (geminiError: unknown) {
        console.warn('[CultureRecommendations] Batch 2 falhou na primeira tentativa, aplicando backoff...', geminiError);
        await new Promise(resolve => setTimeout(resolve, 3000));
        const retryResult2 = await promptGemini(
          prompt2,
          undefined,
          [],
          undefined,
          CULTURE_RECOMMENDATIONS_SYSTEM_PROMPT,
          60000
        );
        parsed2 = extractJsonFromResponse(retryResult2.text);
      }

      if (parsed2 && Array.isArray(parsed2.clusters)) {
        broadcast({
          phase: 'batch_hydrating',
          currentBatch: 2,
          totalBatches: 2,
          clusters: [...accumulatedClusters],
          message: 'Buscando capas e avaliações do Lote 2...',
          progressPercent: 88,
          isPartial: true,
          totalItemsCount: batch1ItemsCount,
        });

        for (let cIdx = 0; cIdx < parsed2.clusters.length; cIdx++) {
          const rawCluster = parsed2.clusters[cIdx];
          const validItems = (Array.isArray(rawCluster.items) ? rawCluster.items : [])
            .filter(item => !excludedTypeSet.has(item.type));
          if (validItems.length === 0) continue;

          const hydratedItems = await hydrateRecommendations(validItems, items, seenTracker);
          if (hydratedItems.length > 0) {
            accumulatedClusters.push({
              id: rawCluster.id || `cluster_b2_${cIdx + 1}`,
              title: rawCluster.title || `Coleção ${accumulatedClusters.length + 1}`,
              description: rawCluster.description || '',
              items: hydratedItems,
            });
          }
        }
      }
    } catch (batch2Error: unknown) {
      console.warn('[CultureRecommendations] Batch 2 falhou ou atingiu limite de cota; mantendo Lote 1 de forma segura:', batch2Error);
    }

    // 7. Persist to cache & history
    if (accumulatedClusters.length > 0) {
      await CultureFeedbackStorage.saveCachedRecommendations(
        accumulatedClusters,
        effectiveHash,
        6,
        aiDna
      );

      const newlyRecommendedTitles = accumulatedClusters.flatMap(c => c.items.map(i => i.title));
      await CultureFeedbackStorage.addRecentRecommendedTitles(newlyRecommendedTitles);
    }

    const finalTotalItems = accumulatedClusters.reduce((acc, c) => acc + c.items.length, 0);

    broadcast({
      phase: 'complete',
      currentBatch: 2,
      totalBatches: 2,
      clusters: [...accumulatedClusters],
      message: `Catálogo completo: ${finalTotalItems} recomendações em ${accumulatedClusters.length} coleções.`,
      progressPercent: 100,
      isPartial: false,
      totalItemsCount: finalTotalItems,
    });

    return accumulatedClusters;
      } finally {
        activeProgressiveRun = null;
      }
    })();

    activeProgressiveRun = {
      promise: runPromise,
      listeners,
    };

    return runPromise;
  },

  /**
   * Negative feedback: Dislikes a recommendation so it won't appear again.
   */
  async dislikeItem(
    item: HydratedRecommendation,
    reason: DislikedCultureItem['reason'] = 'not_interested'
  ): Promise<void> {
    await CultureFeedbackStorage.addDislikedItem({
      id: item.id,
      title: item.title,
      type: item.type,
      reason,
    });
  },

  /**
   * Negative feedback: Marks item as already seen/read without adding it as an active goal.
   */
  async markAsAlreadySeen(item: HydratedRecommendation): Promise<void> {
    await CultureFeedbackStorage.addIgnoredItem({
      id: item.id,
      title: item.title,
      type: item.type,
      already_watched: true,
    });
  },

  /**
   * Converts a recommendation into a full item in the user's culture library.
   */
  async addToLibrary(item: HydratedRecommendation, asGoal = false): Promise<CultureItem> {
    const isGoal = asGoal || item.tier === 'upcoming';
    const goalNote = item.expected_release_date
      ? `Estreia prevista: ${item.expected_release_date}`
      : item.tier === 'upcoming'
      ? 'Lançamento futuro aguardado'
      : undefined;

    const newItem = await CultureService.createItem({
      title: item.title,
      type: item.type,
      synopsis: item.synopsis || item.affinity_reason,
      cover_image: item.cover_image,
      api_id: item.api_id,
      api_source: item.api_source,
      progress: 0,
      total_progress: item.episodes_count || 0,
      is_goal: isGoal,
      goal_note: goalNote,
      status: item.status,
    });

    return newItem;
  },

  /**
   * Expands an existing recommendation cluster with 6 to 8 fresh, high-caliber recommendations.
   * Prompts Gemini targeted strictly on the cluster's theme while excluding already recommended and owned works.
   */
  async expandCluster(
    clusterId: string,
    currentClusters: RecommendationCluster[]
  ): Promise<RecommendationCluster[]> {
    const targetClusterIndex = currentClusters.findIndex(c => c.id === clusterId);
    if (targetClusterIndex === -1) {
      throw new Error(`Coleção com id "${clusterId}" não encontrada.`);
    }

    const targetCluster = currentClusters[targetClusterIndex];
    const items = await CultureService.getItems();
    const disliked = await CultureFeedbackStorage.getDislikedItems();
    const ignored = await CultureFeedbackStorage.getIgnoredItems();
    const settings = getSettings();
    const excludedTypes = new Set(settings.cultureExcludedTypes || []);

    const existingTitlesInCluster = targetCluster.items.map(i => i.title);
    const allExistingRecommendedTitles = currentClusters.flatMap(c => c.items.map(i => i.title));
    const libraryTitles = items.map(i => i.title);
    const dislikedTitles = [
      ...disliked.map(d => d.title),
      ...ignored.map(ig => ig.title),
      ...allExistingRecommendedTitles,
    ];

    const volume = settings.cultureRecommendationsVolume || 'quadruple';
    const targetCount = volume === 'quadruple' ? 24 : volume === 'expanded' ? 22 : 18;

    const prompt = buildExpandClusterPrompt(
      { title: targetCluster.title, description: targetCluster.description },
      existingTitlesInCluster,
      libraryTitles,
      dislikedTitles,
      targetCount
    );

    const result = await promptGemini(
      prompt,
      undefined,
      [],
      undefined,
      CULTURE_RECOMMENDATIONS_SYSTEM_PROMPT,
      60000
    );

    const rawNewItems = extractRecommendationsListFromResponse(result.text)
      .filter(item => !excludedTypes.has(item.type));

    if (rawNewItems.length === 0) {
      throw new Error('Nenhuma nova recomendação pôde ser gerada para esta coleção no momento.');
    }

    // Hydrate the fresh recommendations
    const seenTracker = new Set<string>(
      allExistingRecommendedTitles.map(t => normalizeTitle(t))
    );
    const hydratedNewItems = await hydrateRecommendations(rawNewItems, items, seenTracker);

    if (hydratedNewItems.length === 0) {
      throw new Error('As recomendações geradas já constam na sua biblioteca ou não puderam ser validadas.');
    }

    // Append new items to cluster avoiding duplicate IDs
    const existingIds = new Set(targetCluster.items.map(i => i.id));
    const freshItemsToAppend = hydratedNewItems.filter(i => !existingIds.has(i.id));

    if (freshItemsToAppend.length === 0) {
      return currentClusters;
    }

    const updatedClusters = currentClusters.map((cluster, idx) => {
      if (idx !== targetClusterIndex) return cluster;
      return {
        ...cluster,
        items: [...cluster.items, ...freshItemsToAppend],
      };
    });

    // Update cache and history
    const cached = await CultureFeedbackStorage.getCachedRecommendations();
    if (cached) {
      await CultureFeedbackStorage.saveCachedRecommendations(
        updatedClusters,
        cached.library_hash,
        6,
        cached.ai_dna
      );
    }
    await CultureFeedbackStorage.addRecentRecommendedTitles(freshItemsToAppend.map(i => i.title));

    return updatedClusters;
  },

  /**
   * Clears recommendation cache.
   */
  async clearCache(): Promise<void> {
    await CultureFeedbackStorage.clearCachedRecommendations();
  },
};
