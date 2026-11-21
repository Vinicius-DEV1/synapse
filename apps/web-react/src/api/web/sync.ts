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

function prepareMergedRow(tableName: string, row: object): {
  mergedRow: Record<string, unknown>;
  rowId: string | number | undefined;
} {
  const mergedRow: Record<string, unknown> = { ...(row as Record<string, unknown>) };

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

  return { mergedRow, rowId };
}

function isRowModifiedSince(row: Record<string, unknown>, sinceEpochMs: number): boolean {
  const u = parseDateSafe(row.updated_at);
  const c = parseDateSafe(row.created_at);
  const d = parseDateSafe(row.deleted_at);
  return Math.max(u, c, d) > sinceEpochMs;
}

export const webSyncApi = (
  db: CadernoDb,
  originalDelete: CadernoDeleteFn,
  originalPut: CadernoPutFn
): SyncApi => {
  const upsertRow = async <T extends object = Record<string, unknown>>(
    tableName: string,
    row: T
  ): Promise<{ success: boolean }> => {
    const storeName = requireStoreName(db, tableName);
    const prepared = prepareMergedRow(tableName, row);
    const { rowId } = prepared;
    let { mergedRow } = prepared;

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
  };

  return {
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

    upsertRow,

    upsertRowsBatch: async <T extends object = Record<string, unknown>>(
      tableName: string,
      rows: T[]
    ): Promise<{ success: boolean }> => {
      const storeName = requireStoreName(db, tableName);
      if (rows.length === 0) return { success: true };

      const needsBookFilesCleanup =
        tableName === 'library_books' &&
        isStoreName(db, 'library_book_files') &&
        rows.some((r) => Boolean((r as Record<string, unknown>).deleted_at));

      const txStores: StoreName[] = needsBookFilesCleanup
        ? [storeName, 'library_book_files']
        : [storeName];

      // Attempt atomic single-transaction batch write (bypasses db.put sync-echo hook just like originalPut)
      const tx = typeof db.transaction === 'function'
        ? db.transaction(txStores, 'readwrite')
        : null;

      if (!tx || typeof tx.objectStore !== 'function') {
        for (const row of rows) {
          await upsertRow(tableName, row);
        }
        return { success: true };
      }

      const mainStore = tx.objectStore(storeName);
      const bookFilesStore = needsBookFilesCleanup ? tx.objectStore('library_book_files') : null;

      const prepared = rows.map((row) => prepareMergedRow(tableName, row));
      const existingRows = await Promise.all(
        prepared.map(({ rowId }) => (rowId !== undefined ? mainStore.get(rowId) : Promise.resolve(undefined)))
      );

      // Track rows written earlier in the same batch so duplicate IDs merge sequentially without clobbering
      const inBatchMerged = new Map<string | number, Record<string, unknown>>();
      const writeOps: Array<Promise<unknown>> = [];

      for (let i = 0; i < prepared.length; i++) {
        const { rowId } = prepared[i];
        let { mergedRow } = prepared[i];
        const prior = rowId !== undefined ? (inBatchMerged.get(rowId) ?? existingRows[i]) : existingRows[i];
        if (prior && typeof prior === 'object') {
          mergedRow = { ...(prior as Record<string, unknown>), ...mergedRow };
        }
        if (rowId !== undefined) {
          inBatchMerged.set(rowId, mergedRow);
        }
        if (bookFilesStore && mergedRow.deleted_at && rowId !== undefined) {
          writeOps.push(bookFilesStore.delete(String(rowId)));
        }
        writeOps.push(mainStore.put(mergedRow as CadernoDBSchema[typeof storeName]['value']));
      }

      await Promise.all([...writeOps, tx.done]);
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

    // Fetches only rows modified, created, or deleted since epoch ms using the v29
    // updated_at / created_at / deleted_at IndexedDB indexes when available.
    getModifiedRows: async <T = Record<string, unknown>>(tableName: string, sinceEpochMs: number): Promise<T[]> => {
      const storeName = requireStoreName(db, tableName);

      if (sinceEpochMs > 0 && typeof db.transaction === 'function') {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx?.store as unknown as {
          indexNames?: DOMStringList;
          count?: () => Promise<number>;
          getAll?: () => Promise<Array<Record<string, unknown>>>;
          index?: (name: string) => {
            count: () => Promise<number>;
            getAll: (query?: IDBKeyRange) => Promise<Array<Record<string, unknown>>>;
          };
        } | undefined;

        const hasUpdatedIdx = Boolean(store?.indexNames?.contains('updated_at'));
        const hasCreatedIdx = Boolean(store?.indexNames?.contains('created_at'));
        const hasDeletedIdx = Boolean(store?.indexNames?.contains('deleted_at'));

        if (
          store &&
          hasUpdatedIdx &&
          typeof store.index === 'function' &&
          typeof IDBKeyRange !== 'undefined'
        ) {
          // When all three timestamp indexes exist (v29+), any row matching Math.max(u, c, d) > sinceEpochMs > 0
          // is guaranteed to be indexed in at least one of updated_at / created_at / deleted_at (even on append-only stores
          // or rows with empty updated_at). If created_at is absent (older mock/schema), verify updated_at covers all rows.
          let canUseIndexedPath = hasCreatedIdx && hasDeletedIdx;
          if (!canUseIndexedPath && typeof store.count === 'function') {
            const updatedIndex = store.index('updated_at');
            const [totalCount, indexedCount] = await Promise.all([
              store.count(),
              updatedIndex.count(),
            ]);
            if (totalCount === 0) {
              await tx.done;
              return [];
            }
            canUseIndexedPath = indexedCount === totalCount;
          }

          if (canUseIndexedPath) {
            // 24h floor covers space vs ISO 'T' separators and timezone offsets safely
            const isoFloor = new Date(Math.max(0, sinceEpochMs - 86_400_000))
              .toISOString()
              .slice(0, 10);
            const strRange = IDBKeyRange.lowerBound(isoFloor);
            const numRange = IDBKeyRange.bound(sinceEpochMs, Number.MAX_SAFE_INTEGER, true, false);

            const queries: Array<Promise<Array<Record<string, unknown>>>> = [
              store.index('updated_at').getAll(strRange),
              store.index('updated_at').getAll(numRange),
            ];

            if (hasCreatedIdx) {
              const createdIndex = store.index('created_at');
              queries.push(createdIndex.getAll(strRange), createdIndex.getAll(numRange));
            }

            if (hasDeletedIdx) {
              const deletedIndex = store.index('deleted_at');
              queries.push(deletedIndex.getAll(strRange), deletedIndex.getAll(numRange));
            }

            const chunks = await Promise.all(queries);
            await tx.done;

            const seen = new Map<string | number, Record<string, unknown>>();
            const unkeyed: Array<Record<string, unknown>> = [];

            for (const chunk of chunks) {
              for (const row of chunk) {
                if (!isRowModifiedSince(row, sinceEpochMs)) continue;
                const key = [row.id, row.shareId, row.url].find(
                  (v): v is string | number => typeof v === 'string' || typeof v === 'number'
                );
                if (key !== undefined) {
                  seen.set(key, row);
                } else {
                  unkeyed.push(row);
                }
              }
            }

            return [...seen.values(), ...unkeyed] as T[];
          }

          // Fallback within the same readonly tx
          if (typeof store.getAll === 'function') {
            const all = await store.getAll();
            await tx.done;
            return all.filter((r) => isRowModifiedSince(r, sinceEpochMs)) as T[];
          }
        }

        // Fallback when store lacks timestamp indexes — reuse open tx instead of leaking it
        if (store && typeof store.getAll === 'function') {
          const all = await store.getAll();
          await tx.done;
          return all.filter((r) => isRowModifiedSince(r, sinceEpochMs)) as T[];
        }
      }

      const all = await db.getAll(storeName);
      return (all as unknown as Array<Record<string, unknown>>).filter((r) =>
        isRowModifiedSince(r, sinceEpochMs)
      ) as T[];
    },
  };
};

