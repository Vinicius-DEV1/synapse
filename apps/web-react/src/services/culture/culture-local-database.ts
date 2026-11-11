import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { CultureType } from '../../types/culture';
import type { RecommendationTier } from '../../types/culture-recommendations';
import { CultureEdgeAI } from './culture-edge-ai';
import { CURATED_MEDIA_CATALOG } from './culture-local-catalog';

/**
 * Interface representing a local media item with a 1-bit quantized embedding.
 * In a 384-dimensional space, each vector is compressed to 48 bytes (384 bits).
 */
export interface LocalMediaItem {
  id: string;
  title: string;
  original_title?: string;
  type: CultureType;
  year: number;
  popularity: number;
  genres: string[];
  creator?: string;
  synopsis?: string;
  tier?: RecommendationTier;
  origin_country?: string;
  duration?: string;
  platform?: string;
  cover_image?: string;
  rating?: number;
  embedding: Uint8Array;
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
    value: unknown;
  };
}

const CURRENT_CATALOG_VERSION = 2;

class CultureLocalDatabaseImpl {
  private dbPromise: Promise<IDBPDatabase<CultureEdgeDBSchema>> | null = null;
  public isInitialized = false;

  public initDB(): Promise<IDBPDatabase<CultureEdgeDBSchema>> {
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
   * If offline or API unavailable, falls back to existing local data and seeds/upgrades
   * the curated local catalog of 90+ multi-format works.
   */
  async syncDatabase(): Promise<void> {
    const db = await this.initDB();

    try {
      // 1. Check last sync cursor
      const lastSync = ((await db.get('metadata', 'last_sync_timestamp')) as number) || 0;

      // 2. Fetch delta update only if remote endpoint is explicitly configured
      const syncUrl = import.meta.env.VITE_CULTURE_SYNC_URL as string | undefined;
      if (syncUrl) {
        console.log(`[CultureLocalDB] Checking new media updates since ${new Date(lastSync).toISOString()}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${syncUrl}?since=${lastSync}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type') ?? '';
          if (contentType.includes('application/json')) {
            const deltaItems: LocalMediaItem[] = await response.json();

            if (deltaItems.length > 0) {
              console.log(`[CultureLocalDB] Downloaded ${deltaItems.length} new items. Injecting into local database...`);
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
      console.warn('[CultureLocalDB] Sync API unreachable at this time. Using local offline database.', err);
    }

    // --- Local Fallback & Catalog Version Upgrade Check ---
    const storedVersion = (await db.get('metadata', 'catalog_version')) as number | undefined;
    const count = await db.count('media');

    // If empty or holding previous small mock dataset (< 50 items) or version outdated:
    if (count < 50 || storedVersion !== CURRENT_CATALOG_VERSION) {
      console.log(
        `[CultureLocalDB] Seeding/Upgrading local catalog to version ${CURRENT_CATALOG_VERSION} (${CURATED_MEDIA_CATALOG.length} items)...`
      );

      const tx = db.transaction('media', 'readwrite');
      for (const item of CURATED_MEDIA_CATALOG) {
        const textVibe = `${item.title} ${item.original_title || ''} ${item.type} ${item.genres.join(' ')} ${item.creator} ${item.synopsis}`;
        const embedding = CultureEdgeAI.generateFallbackVector(textVibe, 48);

        await tx.store.put({
          ...item,
          embedding,
        });
      }
      await tx.done;

      await db.put('metadata', CURRENT_CATALOG_VERSION, 'catalog_version');
      await db.put('metadata', Date.now(), 'last_sync_timestamp');
    }

    this.isInitialized = true;
  }

  async getAllItems(): Promise<LocalMediaItem[]> {
    const db = await this.initDB();
    return db.getAll('media');
  }

  async getItem(id: string): Promise<LocalMediaItem | undefined> {
    const db = await this.initDB();
    return db.get('media', id);
  }

  async addOrUpdateItems(items: LocalMediaItem[]): Promise<void> {
    const db = await this.initDB();
    const tx = db.transaction('media', 'readwrite');
    for (const item of items) {
      await tx.store.put(item);
    }
    await tx.done;
  }
}

export const CultureLocalDatabase = new CultureLocalDatabaseImpl();
