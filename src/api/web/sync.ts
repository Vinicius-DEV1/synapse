import type { IDBPDatabase, StoreNames } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web-schema';
import type { SyncApi } from '../types';

type CadernoDb = IDBPDatabase<CadernoDBSchema>;
type StoreName = StoreNames<CadernoDBSchema>;
type CadernoPutFn = CadernoDb['put'];
type CadernoDeleteFn = CadernoDb['delete'];

function isStoreName(db: CadernoDb, name: string): name is StoreName {
  return (db.objectStoreNames as DOMStringList).contains(name);
}

export const webSyncApi = (
  db: CadernoDb,
  originalDelete: CadernoDeleteFn,
  originalPut: CadernoPutFn
): SyncApi => ({
  getTable: async <T = Record<string, unknown>>(tableName: string): Promise<T[]> => {
    if (!isStoreName(db, tableName)) return [];
    const rows = await db.getAll(tableName);
    return rows as unknown as T[];
  },

  deleteRow: async (tableName: string, id: string): Promise<{ success: boolean }> => {
    if (isStoreName(db, tableName)) {
      await originalDelete(tableName, id);
    }
    return { success: true };
  },

  upsertRow: async <T extends object = Record<string, unknown>>(tableName: string, row: T): Promise<{ success: boolean }> => {
    if (isStoreName(db, tableName)) {
      let mergedRow: object = row;
      const rowWithId = row as { id?: unknown; deleted_at?: unknown };
      const rowId = typeof rowWithId.id === 'string' ? rowWithId.id : undefined;
      if (rowId) {
        try {
          const existing = await db.get(tableName, rowId);
          if (existing && typeof existing === 'object') {
            mergedRow = { ...(existing as Record<string, unknown>), ...row };
          }
        } catch (e) {
          console.warn(`Failed to fetch existing row for merge in sync upsert:`, e);
        }
      }

      if (
        tableName === 'library_books' &&
        rowWithId.deleted_at &&
        isStoreName(db, 'library_book_files') &&
        rowId
      ) {
        await db.delete('library_book_files', rowId).catch(console.warn);
      }

      await originalPut(tableName, mergedRow as unknown as CadernoDBSchema[typeof tableName]['value']);
    }
    return { success: true };
  },

  getRow: async <T = Record<string, unknown>>(tableName: string, id: string): Promise<T | null> => {
    if (!isStoreName(db, tableName)) return null;
    try {
      const row = await db.get(tableName, id);
      return (row as unknown as T) || null;
    } catch {
      return null;
    }
  },

  // Fetches only rows with specific IDs (avoids loading the entire table into memory).
  // In IndexedDB, uses a single readonly transaction with individual get operations,
  // which is significantly more efficient than getAll + filter for selective syncing.
  getRowsByIds: async <T = Record<string, unknown>>(tableName: string, ids: string[]): Promise<T[]> => {
    if (!isStoreName(db, tableName) || ids.length === 0) return [];

    const tx = db.transaction(tableName, 'readonly');
    const results: T[] = [];

    // Fetch each ID individually within the same transaction (efficient in IndexedDB)
    const promises = ids.map(async (id: string) => {
      try {
        const row = await tx.store.get(id);
        if (row && typeof row === 'object') {
          results.push(row as unknown as T);
        }
      } catch {
        // ID not found — expected during normal sync flow
      }
    });

    await Promise.all(promises);
    await tx.done;

    return results;
  },
});

