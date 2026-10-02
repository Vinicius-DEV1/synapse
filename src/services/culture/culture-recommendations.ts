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
import { promptGemini } from '../gemini/client';

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
    const effectiveHash = `${dna.libraryHash}_${serendipityMode}`;

    // 1. Check cache if not forcing refresh
    if (!forceRefresh) {
      const cached = await CultureFeedbackStorage.getCachedRecommendations();
      if (cached && (cached.library_hash === effectiveHash || cached.library_hash === dna.libraryHash)) {
        // Filter out any newly disliked, ignored, or added items from cached clusters
        const dislikedIds = new Set(disliked.map(d => d.id));
        const dislikedTitles = new Set(disliked.map(d => d.title.toLowerCase().trim()));
        const ignoredTitles = new Set(ignored.map(ig => ig.title.toLowerCase().trim()));
        const currentItemTitles = new Set(items.map(i => i.title.toLowerCase().trim()));

        const cleanedClusters: RecommendationCluster[] = cached.clusters
          .map(cluster => ({
            ...cluster,
            items: cluster.items.filter(item => {
              const titleLower = item.title.toLowerCase().trim();
              return (
                !dislikedIds.has(item.id) &&
                !dislikedTitles.has(titleLower) &&
                !ignoredTitles.has(titleLower) &&
                !currentItemTitles.has(titleLower)
              );
            }),
          }))
          .filter(cluster => cluster.items.length > 0);

        const totalRemainingItems = cleanedClusters.reduce((acc, c) => acc + c.items.length, 0);

        // If the library hash matches OR if we still have plenty of clean recommendations, use cache
        if (cached.library_hash === effectiveHash || totalRemainingItems >= 4) {
          if (cleanedClusters.length > 0) {
            return cleanedClusters;
          }
        }
      }
    }

    // 2. Fetch fresh broadcast/season anchors for up-to-the-minute release grounding
    const freshAnchors = await fetchCurrentFreshReleases();

    // 3. Build prompt for Gemini
    const prompt = buildCultureRecommendationsPrompt(dna, freshAnchors, serendipityMode);

    // 4. Request Gemini with Google Search Grounding tool (with graceful fallback if tool is not supported)
    let aiResponseText = '';
    try {
      const result = await promptGemini(
        prompt,
        undefined,
        [],
        undefined,
        CULTURE_RECOMMENDATIONS_SYSTEM_PROMPT,
        60000,
        [{ googleSearch: {} }]
      );
      aiResponseText = result.text;
    } catch (groundingError) {
      console.warn('[CultureRecommendations] Falha com Google Search Grounding. Tentando sem ferramentas:', groundingError);
      const fallbackResult = await promptGemini(
        prompt,
        undefined,
        [],
        undefined,
        CULTURE_RECOMMENDATIONS_SYSTEM_PROMPT,
        60000
      );
      aiResponseText = fallbackResult.text;
    }

    // 5. Parse JSON
    const parsed = extractJsonFromResponse(aiResponseText);
    if (!parsed || !parsed.clusters || !Array.isArray(parsed.clusters)) {
      throw new Error('Não foi possível gerar recomendações no formato esperado. Tente novamente em instantes.');
    }

    // 6. Hydrate items across clusters using real media APIs
    const hydratedClusters: RecommendationCluster[] = [];

    for (let cIdx = 0; cIdx < parsed.clusters.length; cIdx++) {
      const rawCluster = parsed.clusters[cIdx];
      const validItems = Array.isArray(rawCluster.items) ? rawCluster.items : [];
      if (validItems.length === 0) continue;

      const hydratedItems = await hydrateRecommendations(validItems, items);
      if (hydratedItems.length > 0) {
        hydratedClusters.push({
          id: rawCluster.id || `cluster_${cIdx + 1}`,
          title: rawCluster.title || `Coleção ${cIdx + 1}`,
          description: rawCluster.description || '',
          items: hydratedItems,
        });
      }
    }

    // 7. Persist to cache
    if (hydratedClusters.length > 0) {
      await CultureFeedbackStorage.saveCachedRecommendations(
        hydratedClusters,
        effectiveHash,
        6
      );
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
