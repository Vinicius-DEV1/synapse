import type { LocalMediaItem } from './culture-local-database';
import { CultureLocalDatabase } from './culture-local-database';

export interface ScoredCandidate {
  item: LocalMediaItem;
  hammingDistance: number;
  finalScore: number;
  breakdown: {
    hammingPenalty: number;
    yearBonus: number;
    popularityBonus: number;
  };
}

class CultureAlgorithmicScorerImpl {
  
  // Tabela de pré-computação para contar bits (LUT de 256 posições).
  // Torna a Distância de Hamming instantânea (O(1) por byte) sem loops de bit-shift!
  private bitCountTable = new Uint8Array(256).map((_, i) => {
    let count = 0, n = i;
    while (n > 0) { count += n & 1; n >>= 1; }
    return count;
  });

  /**
   * Fast XOR bitwise calculation for Hamming Distance between two 1-bit vectors.
   * Uses 8-bit LUT for extreme performance in JS/TS.
   */
  private calculateHammingDistance(v1: Uint8Array, v2: Uint8Array): number {
    let distance = 0;
    const len = Math.min(v1.length, v2.length);
    for (let i = 0; i < len; i++) {
      distance += this.bitCountTable[v1[i] ^ v2[i]];
    }
    if (v1.length !== v2.length) {
      distance += Math.abs(v1.length - v2.length) * 8;
    }
    return distance;
  }

  /**
   * Evaluates the entire local database against a Target Vector.
   * This is O(N) but insanely fast because it uses bitwise operators on TypedArrays.
   */
  async findBestMatches(
    targetVector: Uint8Array,
    limit: number = 20,
    serendipityMode: 'safe' | 'explore' = 'safe'
  ): Promise<ScoredCandidate[]> {
    console.time('[AlgorithmicScorer] Search Time');
    
    // 1. Fetch entire database into memory (In real scenarios, use WebWorker & pagination)
    const allItems = await CultureLocalDatabase.getAllItems();
    
    const candidates: ScoredCandidate[] = [];

    // 2. Score every item
    for (const item of allItems) {
      // Hamming Distance (0 = identical, higher = more different)
      const dist = this.calculateHammingDistance(targetVector, item.embedding);
      
      // Calculate a "Score" where higher is better.
      // E.g., for 384 dims, max dist is 384. We can invert it.
      const dimensions = item.embedding.length * 8; // e.g. 96 bytes * 8 = 768 dims
      const maxScore = dimensions;
      let finalScore = maxScore - dist;
      
      let yearBonus = 0;
      let popularityBonus = 0;

      // Apply Serendipity Logic
      if (serendipityMode === 'safe') {
        // Safe: Prefer very popular movies
        popularityBonus = (item.popularity / 100) * (dimensions * 0.1); 
        finalScore += popularityBonus;
      } else {
        // Explore: Add a slight random noise and don't care about popularity
        const noise = Math.random() * (dimensions * 0.05);
        finalScore += noise;
        
        // Slight bonus to older hidden gems
        if (item.year < 2010 && item.popularity < 80) {
           yearBonus = (dimensions * 0.05);
           finalScore += yearBonus;
        }
      }

      candidates.push({
        item,
        hammingDistance: dist,
        finalScore,
        breakdown: {
          hammingPenalty: dist,
          yearBonus,
          popularityBonus,
        }
      });
    }

    // 3. Sort by descending score
    candidates.sort((a, b) => b.finalScore - a.finalScore);
    
    console.timeEnd('[AlgorithmicScorer] Search Time');

    // Print Telemetry/Debug for top 3
    console.log('[AlgorithmicScorer] Top Match Debug:', candidates.slice(0, 3));

    return candidates.slice(0, limit);
  }
}

export const CultureAlgorithmicScorer = new CultureAlgorithmicScorerImpl();
