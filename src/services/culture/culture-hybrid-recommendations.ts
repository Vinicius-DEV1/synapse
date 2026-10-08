import type { 
  RecommendationCluster, 
  SerendipityMode, 
  RecommendationProgressUpdate,
  RawAIRecommendation
} from '../../types/culture-recommendations';
import type { CultureType } from '../../types/culture';
import { CultureService } from '../culture';
import { CultureEdgeAI } from './culture-edge-ai';
import { CultureAlgorithmicScorer } from './culture-algorithmic-scorer';
import { CultureLocalDatabase } from './culture-local-database';
import { hydrateRecommendations } from './culture-recommendation-hydrator';
import { CultureRecommendationsService } from './culture-recommendations';

class CultureHybridRecommendationsImpl {
  
  /**
   * Generates recommendations progressively using the Edge AI and Local Vector Database.
   * Signature strictly mirrors the legacy CultureRecommendationsService.
   */
  async getRecommendationsProgressive(
    forceRefresh = false,
    serendipityMode: SerendipityMode = 'safe',
    onProgress?: (update: RecommendationProgressUpdate) => void
  ): Promise<RecommendationCluster[]> {
    
    // Broadcast initialization
    if (forceRefresh) {
      console.log('[CultureHybridRecommendations] Forcing refresh of DB/Models...');
    }
    
    onProgress?.({
      phase: 'dna',
      currentBatch: 0,
      totalBatches: 1,
      clusters: [],
      message: 'Inicializando motor local (WebGPU) e sincronizando base...',
      progressPercent: 10,
      isPartial: true,
      totalItemsCount: 0,
    });

    let unsubscribeProgress: (() => void) | null = null;
    try {
      // 1. Ensure DB is synced/seeded
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

      // Warm up model (downloads ~22MB quantized model if not cached yet)
      await CultureEdgeAI.initModel();
      if (unsubscribeProgress) {
        unsubscribeProgress();
        unsubscribeProgress = null;
      }

      // 3. Extract library profile robustly
      const items = await CultureService.getItems();
      
      // Prioritiza itens que o usuário demonstrou interesse (progress > 0 ou marcado como meta)
      const interestedItems = items.filter(i => i.progress > 0 || i.is_goal);
      
      // Fallback para os mais recentes se não houver itens com progresso
      const baseItems = interestedItems.length > 0 ? interestedItems : items.slice(0, 20);
      const recentTitles = baseItems.slice(0, 15).map(i => i.title);

      // Define eixos temáticos estáticos (já que a biblioteca não possui tags explícitas no schema)
      const thematicAxes = [
        { id: 'c1', title: 'Explorando seus Interesses', genres: ['Drama', 'Thriller'] },
        { id: 'c2', title: 'Imersão em Mundos Alternativos', genres: ['Sci-Fi', 'Cyberpunk', 'Fantasy'] },
        { id: 'c3', title: 'Mistérios e Ação', genres: ['Mystery', 'Action'] }
      ];

      onProgress?.({
        phase: 'batch_generating',
        currentBatch: 1,
        totalBatches: 1,
        clusters: [],
        message: 'Gerando Múltiplas Matrizes Vetoriais (Coleções Temáticas)...',
        progressPercent: 40,
        isPartial: true,
        totalItemsCount: 0,
      });

      const finalClusters: RecommendationCluster[] = [];
      const seenTracker = new Set<string>();

      // Generate distinct target vectors and collections for each thematic axis
      for (const axis of thematicAxes) {
        const targetVector = await CultureEdgeAI.generateTargetVector(recentTitles, axis.genres);
        const topCandidates = await CultureAlgorithmicScorer.findBestMatches(targetVector, 10, serendipityMode);
        
        const rawItems: RawAIRecommendation[] = topCandidates.map(candidate => ({
          title: candidate.item.title,
          type: candidate.item.type,
          year: candidate.item.year,
          tier: 'trending',
          genres: candidate.item.genres,
          cluster: axis.id,
          affinity_reason: `Afinidade matemática: ${candidate.finalScore.toFixed(1)}/100 (Hamming: ${candidate.hammingDistance})`,
          confidence_score: Math.min(candidate.finalScore, 100)
        }));

        const hydratedItems = await hydrateRecommendations(rawItems, items, seenTracker);

        if (hydratedItems.length > 0) {
          finalClusters.push({
            id: axis.id,
            title: axis.title,
            description: `Gerado offline por correlação matemática aos gêneros ${axis.genres.join(' e ')}.`,
            items: hydratedItems.slice(0, 6) // Keep top 6 validated ones
          });
        }
      }

      onProgress?.({
        phase: 'complete',
        currentBatch: 1,
        totalBatches: 1,
        clusters: finalClusters,
        message: 'Recomendações prontas.',
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
          type: item.type as CultureType,
          year: item.year || new Date().getFullYear(),
          popularity: item.rating ? item.rating * 10 : 50,
          genres: item.genres || [],
          embedding: binaryEmbedding
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
