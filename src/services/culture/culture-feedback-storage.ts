import { getWebDb } from '../db-web';
import type {
  DislikedCultureItem,
  IgnoredCultureItem,
  CachedRecommendations,
  AiCulturalDnaProfile,
} from '../../types/culture-recommendations';

const CACHE_KEY = 'current_culture_recommendations';

export const CultureFeedbackStorage = {
  /**
   * Fetches all items disliked by the user.
   */
  async getDislikedItems(): Promise<DislikedCultureItem[]> {
    try {
      const db = await getWebDb();
      return await db.getAll('culture_disliked_items');
    } catch (err) {
      console.warn('[CultureFeedbackStorage] Erro ao buscar itens descurtidos:', err);
      return [];
    }
  },

  /**
   * Records a user's dislike signal for a recommendation.
   */
  async addDislikedItem(item: Omit<DislikedCultureItem, 'disliked_at'>): Promise<void> {
    try {
      const db = await getWebDb();
      const entry: DislikedCultureItem = {
        ...item,
        disliked_at: new Date().toISOString(),
      };
      await db.put('culture_disliked_items', entry);
    } catch (err) {
      console.warn('[CultureFeedbackStorage] Erro ao registrar item descurtido:', err);
    }
  },

  /**
   * Removes a dislike signal if undone.
   */
  async removeDislikedItem(id: string): Promise<void> {
    try {
      const db = await getWebDb();
      await db.delete('culture_disliked_items', id);
    } catch (err) {
      console.warn('[CultureFeedbackStorage] Erro ao remover item descurtido:', err);
    }
  },

  /**
   * Fetches all items marked as ignored or already watched/read.
   */
  async getIgnoredItems(): Promise<IgnoredCultureItem[]> {
    try {
      const db = await getWebDb();
      return await db.getAll('culture_ignored_items');
    } catch (err) {
      console.warn('[CultureFeedbackStorage] Erro ao buscar itens ignorados:', err);
      return [];
    }
  },

  /**
   * Records an item marked as "Já assisti/já li" or ignored.
   */
  async addIgnoredItem(item: Omit<IgnoredCultureItem, 'ignored_at'>): Promise<void> {
    try {
      const db = await getWebDb();
      const entry: IgnoredCultureItem = {
        ...item,
        ignored_at: new Date().toISOString(),
      };
      await db.put('culture_ignored_items', entry);
    } catch (err) {
      console.warn('[CultureFeedbackStorage] Erro ao registrar item ignorado:', err);
    }
  },

  /**
   * Removes an ignored item if undone.
   */
  async removeIgnoredItem(id: string): Promise<void> {
    try {
      const db = await getWebDb();
      await db.delete('culture_ignored_items', id);
    } catch (err) {
      console.warn('[CultureFeedbackStorage] Erro ao remover item ignorado:', err);
    }
  },

  /**
   * Retrieves cached recommendations if still valid and unexpired.
   */
  async getCachedRecommendations(): Promise<CachedRecommendations | null> {
    try {
      const db = await getWebDb();
      const entry = await db.get('culture_recommendations_cache', CACHE_KEY);
      if (!entry || !('clusters' in entry)) return null;


      const now = new Date().getTime();
      const expiresAt = new Date(entry.expires_at).getTime();
      if (now > expiresAt) {
        // Cache expired
        return null;
      }
      return entry;
    } catch (err) {
      console.warn('[CultureFeedbackStorage] Erro ao buscar recomendações em cache:', err);
      return null;
    }
  },

  /**
   * Persists generated and hydrated recommendations to cache.
   */
  async saveCachedRecommendations(
    clusters: CachedRecommendations['clusters'],
    libraryHash: string,
    ttlHours = 6,
    aiDna?: AiCulturalDnaProfile
  ): Promise<void> {
    try {
      const db = await getWebDb();
      const now = new Date();
      const expires = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
      const entry: CachedRecommendations = {
        id: CACHE_KEY,
        clusters,
        generated_at: now.toISOString(),
        expires_at: expires.toISOString(),
        library_hash: libraryHash,
        ai_dna: aiDna,
      };
      await db.put('culture_recommendations_cache', entry);
    } catch (err) {
      console.warn('[CultureFeedbackStorage] Erro ao salvar recomendações em cache:', err);
    }
  },

  /**
   * Clears recommendation cache to force fresh generation.
   */
  async clearCachedRecommendations(): Promise<void> {
    try {
      const db = await getWebDb();
      await db.delete('culture_recommendations_cache', CACHE_KEY);
    } catch (err) {
      console.warn('[CultureFeedbackStorage] Erro ao limpar cache de recomendações:', err);
    }
  },

  /**
   * Fetches recent recommendation titles across sessions to avoid repetitive suggestions.
   */
  async getRecentRecommendedTitles(): Promise<string[]> {
    try {
      const db = await getWebDb();
      const entry = await db.get('culture_recommendations_cache', 'recent_recommended_titles');
      if (entry && 'titles' in entry && Array.isArray(entry.titles)) {
        return entry.titles;
      }
      return [];
    } catch (err) {
      console.warn('[CultureFeedbackStorage] Erro ao buscar histórico de recomendações recentes:', err);
      return [];
    }
  },


  /**
   * Appends newly recommended titles to the recent history ring buffer (up to 300 items).
   */
  async addRecentRecommendedTitles(newTitles: string[]): Promise<void> {
    if (!newTitles || newTitles.length === 0) return;
    try {
      const db = await getWebDb();
      const current = await this.getRecentRecommendedTitles();
      const combined = Array.from(new Set([...newTitles, ...current])).slice(0, 300);
      await db.put('culture_recommendations_cache', {
        id: 'recent_recommended_titles',
        titles: combined,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[CultureFeedbackStorage] Erro ao atualizar histórico de recomendações recentes:', err);
    }
  },

  /**
   * Retrieves AI-extracted cultural DNA if matching the current library hash.
   */
  async getCachedAiDna(libraryHash: string): Promise<AiCulturalDnaProfile | null> {
    try {
      const db = await getWebDb();
      const entry = await db.get('culture_recommendations_cache', 'ai_cultural_dna');
      if (entry && 'thematic_axes' in entry && entry.library_hash === libraryHash) {
        return entry as AiCulturalDnaProfile;
      }
      return null;
    } catch (err) {
      console.warn('[CultureFeedbackStorage] Erro ao buscar DNA de IA em cache:', err);
      return null;
    }
  },

  /**
   * Persists AI-extracted cultural DNA to cache.
   */
  async saveCachedAiDna(dna: AiCulturalDnaProfile): Promise<void> {
    try {
      const db = await getWebDb();
      await db.put('culture_recommendations_cache', {
        ...dna,
        id: 'ai_cultural_dna',
      });
    } catch (err) {
      console.warn('[CultureFeedbackStorage] Erro ao salvar DNA de IA em cache:', err);
    }
  },
};

