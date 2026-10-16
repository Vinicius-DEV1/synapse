import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CURATED_MEDIA_CATALOG } from './culture-local-catalog';
import { CultureLocalDatabase } from './culture-local-database';
import { CultureEdgeAI } from './culture-edge-ai';
import { CultureAlgorithmicScorer } from './culture-algorithmic-scorer';
import { CultureHybridRecommendationsService } from './culture-hybrid-recommendations';
import * as cultureHydrator from './culture-recommendation-hydrator';
import { CultureService } from '../culture';

describe('Culture Local Catalog & Edge AI Engine', () => {
  it('contains over 80 curated entries spanning all 5 culture types with valid tiers', () => {
    expect(CURATED_MEDIA_CATALOG.length).toBeGreaterThanOrEqual(80);

    const types = new Set(CURATED_MEDIA_CATALOG.map(item => item.type));
    expect(types.has('filme')).toBe(true);
    expect(types.has('série')).toBe(true);
    expect(types.has('anime')).toBe(true);
    expect(types.has('manga')).toBe(true);
    expect(types.has('livro')).toBe(true);

    const tiers = new Set(CURATED_MEDIA_CATALOG.map(item => item.tier));
    expect(tiers.has('recent')).toBe(true);
    expect(tiers.has('classic')).toBe(true);
    expect(tiers.has('hidden_gem')).toBe(true);
    expect(tiers.has('upcoming')).toBe(true);

    // Verify all items have title, synopsis, creator, and genres
    for (const item of CURATED_MEDIA_CATALOG) {
      expect(item.id).toBeTruthy();
      expect(item.title).toBeTruthy();
      expect(item.genres.length).toBeGreaterThan(0);
      expect(item.creator).toBeTruthy();
      expect(item.synopsis).toBeTruthy();
      expect(item.year).toBeGreaterThan(1800);
      expect(item.popularity).toBeGreaterThan(50);
    }
  });

  it('generates deterministic semantic embeddings where similar themes have closer Hamming distance', () => {
    const scifiVector1 = CultureEdgeAI.generateFallbackVector('Duna ficção científica espaço deserto');
    const scifiVector2 = CultureEdgeAI.generateFallbackVector('Interestelar ficção científica espaço buraco negro');
    const romanceVector = CultureEdgeAI.generateFallbackVector('Orgulho e Preconceito romance época amor drama');

    // Calculate bitwise Hamming distance
    const dist = (v1: Uint8Array, v2: Uint8Array): number => {
      let d = 0;
      for (let i = 0; i < v1.length; i++) {
        let x = v1[i] ^ v2[i];
        while (x > 0) {
          d += x & 1;
          x >>= 1;
        }
      }
      return d;
    };

    const scifiToScifiDist = dist(scifiVector1, scifiVector2);
    const scifiToRomanceDist = dist(scifiVector1, romanceVector);

    // Two Sci-Fi space stories must be closer in vector space than Sci-Fi to historical romance
    expect(scifiToScifiDist).toBeLessThan(scifiToRomanceDist);
  });

  it('CultureLocalDatabase auto-upgrades and populates database with curated catalog', async () => {
    await CultureLocalDatabase.syncDatabase();
    const items = await CultureLocalDatabase.getAllItems();
    expect(items.length).toBeGreaterThanOrEqual(80);

    const firstItem = items[0];
    expect(ArrayBuffer.isView(firstItem.embedding)).toBe(true);
    expect(firstItem.embedding.byteLength).toBe(48); // 384 dimensions / 8 = 48 bytes
  });

  it('CultureHybridRecommendationsService emits progressive updates and clusters with valid tiers', async () => {
    vi.spyOn(CultureService, 'getItems').mockResolvedValue([
      {
        id: 'user-item-1',
        title: 'Interestelar',
        type: 'filme',
        progress: 1,
        total_progress: 1,
        is_goal: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        genres: ['Sci-Fi', 'Espaço'],
      },
    ]);

    // Mock hydrator to return hydrated recommendation without external network dependency
    vi.spyOn(cultureHydrator, 'hydrateRecommendations').mockImplementation(async (rawItems) => {
      return rawItems.map(item => ({
        ...item,
        id: `hydrated_${item.title}`,
        synopsis: item.synopsis || 'Test synopsis',
        cover_image: 'https://example.com/cover.jpg',
        rating: 9.0,
      }));
    });

    const progressPhases: string[] = [];
    const clusters = await CultureHybridRecommendationsService.getRecommendationsProgressive(
      false,
      'safe',
      (update) => {
        progressPhases.push(update.phase);
      }
    );

    expect(progressPhases).toContain('dna');
    expect(progressPhases).toContain('batch_generating');
    expect(progressPhases).toContain('batch_ready');
    expect(progressPhases).toContain('complete');

    expect(clusters.length).toBeGreaterThanOrEqual(3);
    for (const cluster of clusters) {
      expect(cluster.items.length).toBeGreaterThan(0);
      for (const item of cluster.items) {
        expect(['recent', 'classic', 'hidden_gem', 'upcoming']).toContain(item.tier);
      }
    }
  });
});
