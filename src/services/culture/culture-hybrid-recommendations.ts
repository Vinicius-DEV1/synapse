import type {
  RecommendationCluster,
  SerendipityMode,
  RecommendationProgressUpdate,
  RawAIRecommendation,
  RecommendationTier,
} from '../../types/culture-recommendations';
import type { CultureType } from '../../types/culture';
import { CultureService } from '../culture';
import { CultureEdgeAI } from './culture-edge-ai';
import { CultureAlgorithmicScorer } from './culture-algorithmic-scorer';
import { CultureLocalDatabase } from './culture-local-database';
import { hydrateRecommendations } from './culture-recommendation-hydrator';
import { CultureRecommendationsService } from './culture-recommendations';
import { normalizeTitle } from './culture-title-utils';

interface ThematicAxisDefinition {
  id: string;
  title: string;
  description: string;
  genres: string[];
}

class CultureHybridRecommendationsImpl {
  /**
   * Generates recommendations progressively using the Edge AI and Local Vector Database.
   * Signature strictly mirrors the CultureRecommendationsService for multiplatform parity.
   */
  async getRecommendationsProgressive(
    forceRefresh = false,
    serendipityMode: SerendipityMode = 'safe',
    onProgress?: (update: RecommendationProgressUpdate) => void
  ): Promise<RecommendationCluster[]> {
    if (forceRefresh) {
      console.log('[CultureHybridRecommendations] Forcing refresh of DB/Models...');
    }

    onProgress?.({
      phase: 'dna',
      currentBatch: 0,
      totalBatches: 1,
      clusters: [],
      message: 'Inicializando motor local (WebGPU) e sincronizando base de vetores...',
      progressPercent: 10,
      isPartial: true,
      totalItemsCount: 0,
    });

    let unsubscribeProgress: (() => void) | null = null;
    try {
      // 1. Ensure DB is synced/seeded with the rich curated catalog
      await CultureLocalDatabase.syncDatabase();

      // 2. Subscribe to Edge AI model download progress and warm up model
      unsubscribeProgress = CultureEdgeAI.onProgress((progress) => {
        if (progress.status === 'progress' && typeof progress.progress === 'number') {
          const pct = Math.round(progress.progress);
          const fileName = progress.file ? ` (${progress.file.split('/').pop()})` : '';
          onProgress?.({
            phase: 'dna',
            currentBatch: 0,
            totalBatches: 1,
            clusters: [],
            message: `Baixando modelo de IA Edge: ${pct}%${fileName}...`,
            progressPercent: Math.min(10 + Math.round(pct * 0.25), 35),
            isPartial: true,
            totalItemsCount: 0,
          });
        }
      });

      // Warm up model (downloads ~22MB quantized model if not cached yet; falls back to hash-based if offline/unsupported)
      try {
        await CultureEdgeAI.initModel();
      } catch (modelErr) {
        console.warn('[CultureHybridRecommendations] Modelo transformer indisponível; prosseguindo com embeddings semânticos determinísticos offline:', modelErr);
      } finally {
        if (unsubscribeProgress) {
          unsubscribeProgress();
          unsubscribeProgress = null;
        }
      }

      // 3. Extract library profile robustly
      const items = await CultureService.getItems();

      // Prioritize items that the user demonstrated interest in (progress > 0 or marked as goal)
      const interestedItems = items.filter(i => i.progress > 0 || i.is_goal);
      const baseItems = interestedItems.length > 0 ? interestedItems : items.slice(0, 20);
      const recentTitles = baseItems.slice(0, 15).map(i => i.title);

      // Collect user genres to tailor the direct affinity axis
      const userGenres = Array.from(
        new Set(items.flatMap(i => i.genres || []).filter(g => typeof g === 'string' && g.trim().length > 0))
      );

      // 4. Define dynamic thematic axes covering multiple cultural dimensions
      const thematicAxes: ThematicAxisDefinition[] = [
        {
          id: 'edge_c1_affinity',
          title: 'Explorando suas Afinidades',
          description: 'Obras com maior afinidade matemática aos títulos e temas mais presentes na sua biblioteca.',
          genres: userGenres.length > 0 ? userGenres.slice(0, 5) : ['Drama', 'Sci-Fi', 'Suspense', 'Ação'],
        },
        {
          id: 'edge_c2_scifi',
          title: 'Ficção Científica & Universos Distópicos',
          description: 'Exploração espacial, tecnologias revolucionárias, inteligência artificial e futuros alternativos.',
          genres: ['Sci-Fi', 'Ficção Científica', 'Cyberpunk', 'Espaço', 'Distopia'],
        },
        {
          id: 'edge_c3_thriller',
          title: 'Suspense Psicológico & Tramas Obscuras',
          description: 'Narrativas com tensão constante, jogos mentais complexos e reviravoltas marcantes.',
          genres: ['Thriller', 'Suspense', 'Mistério', 'Crime', 'Psicológico'],
        },
        {
          id: 'edge_c4_anime_fantasy',
          title: 'Universos de Animes, Mangás & Fantasia',
          description: 'Construções de mundo épicas, magia singular e obras aclamadas da cultura japonesa.',
          genres: ['Anime', 'Mangá', 'Fantasia', 'Ação', 'Sobrenatural', 'Shounen', 'Seinen'],
        },
        {
          id: 'edge_c5_literature',
          title: 'Obras Fundamentais & Grandes Narrativas',
          description: 'Grandes obras literárias e clássicos universais que transformaram a cultura mundial.',
          genres: ['Livro', 'Literatura', 'Clássico', 'Filosofia', 'Histórico', 'Drama'],
        },
      ];

      onProgress?.({
        phase: 'batch_generating',
        currentBatch: 1,
        totalBatches: thematicAxes.length,
        clusters: [],
        message: 'Gerando Múltiplas Matrizes Vetoriais (Coleções Temáticas)...',
        progressPercent: 40,
        isPartial: true,
        totalItemsCount: 0,
      });

      const finalClusters: RecommendationCluster[] = [];
      const seenTracker = new Set<string>();

      // Pre-populate seen titles from user's existing library
      for (const libItem of items) {
        if (libItem.title) seenTracker.add(normalizeTitle(libItem.title));
      }

      // Generate distinct target vectors and collections for each thematic axis
      for (let axisIdx = 0; axisIdx < thematicAxes.length; axisIdx++) {
        const axis = thematicAxes[axisIdx];

        const targetVector = await CultureEdgeAI.generateTargetVector(recentTitles, axis.genres);
        const topCandidates = await CultureAlgorithmicScorer.findBestMatches(targetVector, 20, serendipityMode);

        const rawItems: RawAIRecommendation[] = topCandidates
          .filter(candidate => {
            const normTitle = normalizeTitle(candidate.item.title);
            const normOriginal = candidate.item.original_title ? normalizeTitle(candidate.item.original_title) : '';
            return !seenTracker.has(normTitle) && (!normOriginal || !seenTracker.has(normOriginal));
          })
          .map(candidate => {
            // Guarantee valid tier for UI subfilters ('recent' | 'classic' | 'hidden_gem' | 'upcoming')
            let tier: RecommendationTier = candidate.item.tier || 'recent';
            if (!candidate.item.tier) {
              if (candidate.item.year >= 2023) {
                tier = 'recent';
              } else if (candidate.item.year <= 2002) {
                tier = 'classic';
              } else if (candidate.item.popularity < 85) {
                tier = 'hidden_gem';
              } else {
                tier = 'recent';
              }
            }

            return {
              title: candidate.item.title,
              original_title: candidate.item.original_title,
              type: candidate.item.type,
              year: candidate.item.year,
              tier,
              genres: candidate.item.genres,
              creator: candidate.item.creator,
              synopsis: candidate.item.synopsis,
              cluster: axis.id,
              affinity_reason: `Afinidade matemática: ${candidate.finalScore.toFixed(1)}/100 (Hamming: ${candidate.hammingDistance})`,
              confidence_score: Math.min(candidate.finalScore, 100),
              origin_country: candidate.item.origin_country,
              duration: candidate.item.duration,
              platform: candidate.item.platform,
              cover_image: candidate.item.cover_image,
              rating: candidate.item.rating,
            };
          });

        const hydratedItems = await hydrateRecommendations(rawItems, items, seenTracker);

        if (hydratedItems.length > 0) {
          finalClusters.push({
            id: axis.id,
            title: axis.title,
            description: axis.description,
            items: hydratedItems.slice(0, 14), // Keep up to 14 verified items per cluster
          });

          // Progressive broadcast: notify UI immediately so clusters mount progressively!
          onProgress?.({
            phase: 'batch_ready',
            currentBatch: finalClusters.length,
            totalBatches: thematicAxes.length,
            clusters: [...finalClusters],
            message: `Coleção "${axis.title}" pronta (${hydratedItems.length} obras)...`,
            progressPercent: Math.min(40 + Math.round((finalClusters.length / thematicAxes.length) * 55), 95),
            isPartial: true,
            totalItemsCount: finalClusters.reduce((acc, c) => acc + c.items.length, 0),
          });
        }
      }

      onProgress?.({
        phase: 'complete',
        currentBatch: thematicAxes.length,
        totalBatches: thematicAxes.length,
        clusters: finalClusters,
        message: 'Recomendações Edge AI prontas.',
        progressPercent: 100,
        isPartial: false,
        totalItemsCount: finalClusters.reduce((acc, c) => acc + c.items.length, 0),
      });

      return finalClusters;
    } catch (err: unknown) {
      if (unsubscribeProgress) {
        unsubscribeProgress();
      }
      console.error('[CultureHybridRecommendations] Falha crítica:', err);
      onProgress?.({
        phase: 'error',
        currentBatch: 0,
        totalBatches: 1,
        clusters: [],
        message: 'Falha no motor de Edge AI.',
        progressPercent: 0,
        isPartial: false,
        totalItemsCount: 0,
      });
      throw err;
    }
  }

  /**
   * Expands a cluster by asking Gemini for new recommendations, and then injects
   * their embeddings into the local IndexedDB to enrich the edge AI graph.
   */
  async expandCluster(
    clusterId: string,
    currentClusters: RecommendationCluster[]
  ): Promise<RecommendationCluster[]> {
    console.log(`[CultureHybridRecommendations] Expanding cluster ${clusterId} using AI fallback...`);

    // 1. Fetch real new recommendations via Gemini
    const updatedClusters = await CultureRecommendationsService.expandCluster(clusterId, currentClusters);

    // 2. Identify newly added items in the cluster
    const targetClusterIndex = updatedClusters.findIndex(c => c.id === clusterId);
    if (targetClusterIndex === -1) return updatedClusters;

    const newCluster = updatedClusters[targetClusterIndex];

    console.log(`[CultureHybridRecommendations] Vectorizing and saving ${newCluster.items.length} items to Local Database...`);

    // 3. Vectorize and save to local IDB so Edge AI gets smarter
    const db = await CultureLocalDatabase.initDB();
    const tx = db.transaction('media', 'readwrite');

    for (const item of newCluster.items) {
      const tasteProfile = `${item.title} ${item.type} ${item.genres?.join(' ') || ''} ${item.synopsis || ''}`;

      try {
        const floatEmbedding = await CultureEdgeAI.generateEmbedding(tasteProfile);
        const binaryEmbedding = CultureEdgeAI.quantizeToBinary(floatEmbedding);

        await tx.store.put({
          id: item.api_id || item.id,
          title: item.title,
          original_title: item.original_title,
          type: item.type as CultureType,
          year: item.year || new Date().getFullYear(),
          popularity: item.rating ? item.rating * 10 : 50,
          genres: item.genres || [],
          creator: item.creator || item.director,
          synopsis: item.synopsis,
          tier: item.tier,
          cover_image: item.cover_image,
          rating: item.rating,
          embedding: binaryEmbedding,
        });
      } catch (err) {
        console.warn(`[CultureHybridRecommendations] Failed to vectorize item ${item.title}`, err);
      }
    }

    await tx.done;
    console.log('[CultureHybridRecommendations] Expansion complete and local database enriched!');

    return updatedClusters;
  }
}

export const CultureHybridRecommendationsService = new CultureHybridRecommendationsImpl();
