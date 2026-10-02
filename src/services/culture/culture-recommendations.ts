import type { CultureItem } from '../../types';
import type {
  RecommendationCluster,
  HydratedRecommendation,
  RawAIRecommendation,
  DislikedCultureItem,
  SerendipityMode,
} from '../../types/culture-recommendations';
import { CultureService } from '../culture';
import { CultureFeedbackStorage } from './culture-feedback-storage';
import { extractCulturalDNA } from './culture-dna-extractor';
import { fetchCurrentFreshReleases } from './culture-fresh-releases';
import {
  CULTURE_RECOMMENDATIONS_SYSTEM_PROMPT,
  buildCultureRecommendationsPrompt,
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

export const CultureRecommendationsService = {
  /**
   * Generates or fetches cached personalized recommendations for the user.
   */
  async getRecommendations(
    forceRefresh = false,
    serendipityMode: SerendipityMode = 'safe'
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
    const effectiveHash = `${dna.libraryHash}_${serendipityMode}_${volume}_exT:${excludedTypesKey}_exTh:${excludedThemesKey}_dense_v5_doubled`;

    // 1. Check cache if not forcing refresh
    const cached = await CultureFeedbackStorage.getCachedRecommendations();
    if (!forceRefresh && cached) {
      if (cached.library_hash === effectiveHash) {
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
        const minItemsThreshold = volume === 'quadruple' ? 65 : volume === 'expanded' ? 45 : 25;

        // If the library hash matches AND we have a sufficiently rich recommendation set, use cache
        if (totalRemainingItems >= minItemsThreshold && cleanedClusters.length > 0) {
          return cleanedClusters;
        }
      }
    }

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
    const aiDna = await extractAiCulturalDna(items, dna.libraryHash);

    // 4. Build prompt for Gemini with full exclusion list, volume directive, pre-extracted AI DNA, and format/theme exclusions
    const prompt = buildCultureRecommendationsPrompt(
      dna,
      freshAnchors,
      serendipityMode,
      previousTitles,
      volume,
      aiDna,
      excludedTypes,
      excludedThemes
    );

    // 5. Request Gemini with generous timeout for large recommendation sets
    const result = await promptGemini(
      prompt,
      undefined,
      [],
      undefined,
      CULTURE_RECOMMENDATIONS_SYSTEM_PROMPT,
      120000
    );
    const aiResponseText = result.text;


    // 6. Parse JSON
    const parsed = extractJsonFromResponse(aiResponseText);
    if (!parsed || !parsed.clusters || !Array.isArray(parsed.clusters)) {
      throw new Error('Não foi possível gerar recomendações no formato esperado. Tente novamente em instantes.');
    }

    // 7. Hydrate items across clusters using real media APIs with shared seenTracker
    const seenTracker = new Set<string>();
    const hydratedClusters: RecommendationCluster[] = [];

    for (let cIdx = 0; cIdx < parsed.clusters.length; cIdx++) {
      const rawCluster = parsed.clusters[cIdx];
      const validItems = (Array.isArray(rawCluster.items) ? rawCluster.items : [])
        .filter(item => !excludedTypeSet.has(item.type));
      if (validItems.length === 0) continue;

      const hydratedItems = await hydrateRecommendations(validItems, items, seenTracker);
      if (hydratedItems.length > 0) {
        hydratedClusters.push({
          id: rawCluster.id || `cluster_${cIdx + 1}`,
          title: rawCluster.title || `Coleção ${cIdx + 1}`,
          description: rawCluster.description || '',
          items: hydratedItems,
        });
      }
    }

    // 8. Persist to cache and update history ring buffer
    if (hydratedClusters.length > 0) {
      await CultureFeedbackStorage.saveCachedRecommendations(
        hydratedClusters,
        effectiveHash,
        6,
        aiDna
      );

      const newlyRecommendedTitles = hydratedClusters.flatMap(c => c.items.map(i => i.title));
      await CultureFeedbackStorage.addRecentRecommendedTitles(newlyRecommendedTitles);
    }

    return hydratedClusters;
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
   * Clears recommendation cache.
   */
  async clearCache(): Promise<void> {
    await CultureFeedbackStorage.clearCachedRecommendations();
  },
};
