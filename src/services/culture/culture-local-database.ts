import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { CultureType } from '../../types/culture';

/**
 * Interface representing a 1-bit quantized embedding.
 * In a real scenario, this would be a Uint8Array where each bit represents a dimension.
 * For example, a 768-dim vector becomes a 96-byte array.
 */
export interface LocalMediaItem {
  id: string;             // TMDB ID
  title: string;
  type: CultureType;
  year: number;
  popularity: number;
  genres: string[];       // Fast literal fallback
  embedding: Uint8Array;  // 1-bit quantized vector (e.g., 48 or 96 bytes)
}

interface CultureEdgeDBSchema extends DBSchema {
  media: {
    key: string;
    value: LocalMediaItem;
    indexes: {
      'by-year': number;
      'by-popularity': number;
      'by-type': string;
    };
  };
  metadata: {
    key: string;
    value: any;
  };
}

class CultureLocalDatabaseImpl {
  private dbPromise: Promise<IDBPDatabase<CultureEdgeDBSchema>> | null = null;
  public isInitialized = false;

  private initDB() {
    if (!this.dbPromise) {
      this.dbPromise = openDB<CultureEdgeDBSchema>('culture-edge-db', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('media')) {
            const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
            mediaStore.createIndex('by-year', 'year');
            mediaStore.createIndex('by-popularity', 'popularity');
            mediaStore.createIndex('by-type', 'type');
          }
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata');
          }
        },
      });
    }
    return this.dbPromise;
  }

  /**
   * Syncs the remote compressed binary database to local IndexedDB via Delta Updates.
   * If offline or API unavailable, falls back to existing local data (and inserts mock data if completely empty).
   */
  async syncDatabase(): Promise<void> {
    const db = await this.initDB();
    
    try {
      // 1. Check last sync cursor
      const lastSync = await db.get('metadata', 'last_sync_timestamp') as number || 0;
      
      // 2. Fetch delta update only if remote endpoint is explicitly configured
      const syncUrl = (import.meta as any).env?.VITE_CULTURE_SYNC_URL;
      if (syncUrl) {
        console.log(`[CultureLocalDB] Verificando novos filmes desde ${new Date(lastSync).toISOString()}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout for background sync
        
        const response = await fetch(`${syncUrl}?since=${lastSync}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type') ?? '';
          if (contentType.includes('application/json')) {
            const deltaItems: LocalMediaItem[] = await response.json();

            if (deltaItems.length > 0) {
              console.log(`[CultureLocalDB] Baixado ${deltaItems.length} novos itens. Injetando...`);
              const tx = db.transaction('media', 'readwrite');
              for (const item of deltaItems) {
                await tx.store.put(item);
              }
              await tx.done;
            }

            await db.put('metadata', Date.now(), 'last_sync_timestamp');
          }
        }
      }
    } catch (err) {
      console.warn('[CultureLocalDB] API de sync inacessível no momento. Usando base local offline.', err);
    }

    // --- Local Fallback: If DB is completely empty (first boot), inject initial catalog ---
    const count = await db.count('media');
    if (count === 0) {
      console.log('[CultureLocalDB] Base local completamente vazia. Semeando catálogo inicial de 48 bytes (384 dimensões)...');
      const seedData: LocalMediaItem[] = [
        {
          id: 'seed-1',
          title: 'Blade Runner 2049',
          type: 'filme',
          year: 2017,
          popularity: 95.5,
          genres: ['Sci-Fi', 'Thriller'],
          embedding: this.generateRandomVector(48),
        },
        {
          id: 'seed-2',
          title: 'Interstellar',
          type: 'filme',
          year: 2014,
          popularity: 98.2,
          genres: ['Sci-Fi', 'Drama'],
          embedding: this.generateRandomVector(48),
        },
        {
          id: 'seed-3',
          title: 'The Godfather',
          type: 'filme',
          year: 1972,
          popularity: 88.0,
          genres: ['Crime', 'Drama'],
          embedding: this.generateRandomVector(48),
        },
        {
          id: 'seed-4',
          title: 'Cyberpunk Edgerunners',
          type: 'série',
          year: 2022,
          popularity: 92.0,
          genres: ['Sci-Fi', 'Action', 'Anime'],
          embedding: this.generateRandomVector(48),
        },
        {
          id: 'seed-5',
          title: 'Dune: Part Two',
          type: 'filme',
          year: 2024,
          popularity: 96.0,
          genres: ['Sci-Fi', 'Adventure'],
          embedding: this.generateRandomVector(48),
        },
        {
          id: 'seed-6',
          title: 'Severance',
          type: 'série',
          year: 2022,
          popularity: 94.0,
          genres: ['Sci-Fi', 'Thriller', 'Mystery'],
          embedding: this.generateRandomVector(48),
        },
        {
          id: 'seed-7',
          title: 'Oppenheimer',
          type: 'filme',
          year: 2023,
          popularity: 97.0,
          genres: ['Drama', 'History'],
          embedding: this.generateRandomVector(48),
        },
        {
          id: 'seed-8',
          title: 'Succession',
          type: 'série',
          year: 2018,
          popularity: 93.0,
          genres: ['Drama'],
          embedding: this.generateRandomVector(48),
        },
        {
          id: 'seed-9',
          title: 'Breaking Bad',
          type: 'série',
          year: 2008,
          popularity: 99.0,
          genres: ['Crime', 'Drama', 'Thriller'],
          embedding: this.generateRandomVector(48),
        },
        {
          id: 'seed-10',
          title: 'Arrival',
          type: 'filme',
          year: 2016,
          popularity: 91.0,
          genres: ['Sci-Fi', 'Mystery', 'Drama'],
          embedding: this.generateRandomVector(48),
        }
      ];

      const tx = db.transaction('media', 'readwrite');
      for (const item of seedData) {
        await tx.store.put(item);
      }
      await tx.done;
      await db.put('metadata', Date.now(), 'last_sync_timestamp');
    }
    
    this.isInitialized = true;
  }

  async getAllItems(): Promise<LocalMediaItem[]> {
    const db = await this.initDB();
    return db.getAll('media');
  }

  private generateRandomVector(bytes: number): Uint8Array {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return arr;
  }
}

export const CultureLocalDatabase = new CultureLocalDatabaseImpl();
