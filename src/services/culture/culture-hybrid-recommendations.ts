import type { 
  RecommendationCluster, 
  SerendipityMode, 
  RecommendationProgressUpdate,
  HydratedRecommendation
} from '../../types/culture-recommendations';
import { CultureService } from '../culture';
import { CultureEdgeAI } from './culture-edge-ai';
import { CultureAlgorithmicScorer } from './culture-algorithmic-scorer';
import { CultureLocalDatabase } from './culture-local-database';

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
        { id: 'c1', title: 'Explorando seus Interesses (Drama/Thriller)', genres: ['Drama', 'Thriller'] },
        { id: 'c2', title: 'Imersão em Mundos Alternativos (Sci-Fi)', genres: ['Sci-Fi', 'Cyberpunk'] },
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

      // Generate distinct target vectors and collections for each thematic axis
      for (const axis of thematicAxes) {
        const targetVector = await CultureEdgeAI.generateTargetVector(recentTitles, axis.genres);
        const topCandidates = await CultureAlgorithmicScorer.findBestMatches(targetVector, 6, serendipityMode);
        
        const hydratedItems: HydratedRecommendation[] = topCandidates.map(candidate => ({
          id: candidate.item.id,
          title: candidate.item.title,
          type: candidate.item.type,
          year: candidate.item.year,
          tier: 'trending',
          rationale: `Afinidade algorítmica. Hamming Penalty: ${candidate.breakdown.hammingPenalty}`,
          posterPath: null,
          voteAverage: candidate.item.popularity / 10,
          overview: 'Descrição otimizada em edge.',
          genres: candidate.item.genres,
          similarTo: recentTitles.slice(0, 1),
          isPlaceholder: false,
          cluster: axis.id,
          affinity_reason: `Distância de Hamming: ${candidate.hammingDistance}`,
          confidence_score: Math.min(candidate.finalScore, 100)
        }));

        finalClusters.push({
          id: axis.id,
          title: axis.title,
          description: `Gerado offline por correlação aos gêneros ${axis.genres.join(' e ')}.`,
          items: hydratedItems
        });
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
}

export const CultureHybridRecommendationsService = new CultureHybridRecommendationsImpl();
