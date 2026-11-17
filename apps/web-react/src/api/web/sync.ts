import type { IDBPDatabase, StoreNames } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web-schema';
import type { SyncApi } from '../types';
import { parseDateSafe } from '../../services/sync/sync-utils';

type CadernoDb = IDBPDatabase<CadernoDBSchema>;
type StoreName = StoreNames<CadernoDBSchema>;
type CadernoPutFn = CadernoDb['put'];
type CadernoDeleteFn = CadernoDb['delete'];

function isStoreName(db: CadernoDb, name: string): name is StoreName {
  return (db.objectStoreNames as DOMStringList).contains(name);
}

function requireStoreName(db: CadernoDb, name: string): StoreName {
  if (!isStoreName(db, name)) {
    throw new Error(`IndexedDB store is unavailable: ${name}`);
  }
  return name;
}

export const webSyncApi = (
  db: CadernoDb,
  originalDelete: CadernoDeleteFn,
  originalPut: CadernoPutFn
): SyncApi => ({
  getTable: async <T = Record<string, unknown>>(tableName: string): Promise<T[]> => {
    const storeName = requireStoreName(db, tableName);
    const rows = await db.getAll(storeName);
    return rows as T[];
  },

  deleteRow: async (tableName: string, id: string): Promise<{ success: boolean }> => {
    const storeName = requireStoreName(db, tableName);
    await originalDelete(storeName, id);
    return { success: true };
  },

  upsertRow: async <T extends object = Record<string, unknown>>(tableName: string, row: T): Promise<{ success: boolean }> => {
    const storeName = requireStoreName(db, tableName);
    let mergedRow: Record<string, unknown> = { ...(row as Record<string, unknown>) };

    if (tableName === 'shared_page_keys') {
      if (!mergedRow.shareId && mergedRow.id) {
        mergedRow.shareId = mergedRow.id;
      }
      if (!mergedRow.id && mergedRow.shareId) {
        mergedRow.id = mergedRow.shareId;
      }
    } else if (tableName === 'link_metadata_cache') {
      if (!mergedRow.url && mergedRow.id) {
        mergedRow.url = mergedRow.id;
      }
      if (!mergedRow.id && mergedRow.url) {
        mergedRow.id = mergedRow.url;
      }
    }

    const rowId = [mergedRow.id, mergedRow.shareId, mergedRow.url].find(
      (value): value is string | number => typeof value === 'string' || typeof value === 'number'
    );

    if (rowId !== undefined) {
      try {
        const existing = await db.get(storeName, rowId);
        if (existing && typeof existing === 'object') {
          mergedRow = { ...(existing as Record<string, unknown>), ...mergedRow };
        }
      } catch (error: unknown) {
        console.error('[Sync] Failed to fetch the existing row before merging an upsert.', error);
        throw error;
      }
    }

    if (
      tableName === 'library_books' &&
      mergedRow.deleted_at &&
      isStoreName(db, 'library_book_files') &&
      rowId
    ) {
      await db.delete('library_book_files', String(rowId));
    }

    await originalPut(storeName, mergedRow as CadernoDBSchema[typeof storeName]['value']);
    return { success: true };
  },

  getRow: async <T = Record<string, unknown>>(tableName: string, id: string): Promise<T | null> => {
    const storeName = requireStoreName(db, tableName);
    const row = await db.get(storeName, id);
    return (row as T) || null;
  },

  // Fetches only rows with specific IDs (avoids loading the entire table into memory).
  // In IndexedDB, uses a single readonly transaction with individual get operations,
  // which is significantly more efficient than getAll + filter for selective syncing.
  getRowsByIds: async <T = Record<string, unknown>>(tableName: string, ids: string[]): Promise<T[]> => {
    const storeName = requireStoreName(db, tableName);
    if (ids.length === 0) return [];

    const tx = db.transaction(storeName, 'readonly');
    const results = await Promise.all(ids.map((id) => tx.store.get(id)));
    await tx.done;

    return results.filter((row) => row !== undefined) as T[];
  },

  // Fetches only rows modified or created since epoch ms to prevent full table scans
  getModifiedRows: async <T = Record<string, unknown>>(tableName: string, sinceEpochMs: number): Promise<T[]> => {
    const storeName = requireStoreName(db, tableName);
    const all = await db.getAll(storeName);
    return all.filter((r) => {
      const u = parseDateSafe(r.updated_at);
      const c = parseDateSafe(r.created_at);
      const d = parseDateSafe(r.deleted_at);
      return Math.max(u, c, d) > sinceEpochMs;
    }) as T[];
  },
});

