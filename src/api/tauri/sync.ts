import { invoke } from '@tauri-apps/api/core';
import type { SyncApi } from '../types';

export const tauriSyncApi: SyncApi = {
  getTable: async <T = Record<string, unknown>>(tableName: string): Promise<T[]> =>
    await invoke<T[]>('sync_get_table', { tableName }),
  deleteRow: async (tableName: string, id: string): Promise<{ success: boolean }> =>
    await invoke<{ success: boolean }>('sync_delete_row', { tableName, id }),
  upsertRow: async <T extends object = Record<string, unknown>>(tableName: string, row: T): Promise<{ success: boolean }> =>
    await invoke<{ success: boolean }>('sync_upsert_row', { tableName, row }),
  getRow: async <T = Record<string, unknown>>(tableName: string, id: string): Promise<T | null> =>
    await invoke<T | null>('sync_get_row', { tableName, id }),
  // Fetches only rows with specific IDs to prevent loading entire tables into memory
  getRowsByIds: async <T = Record<string, unknown>>(tableName: string, ids: string[]): Promise<T[]> =>
    await invoke<T[]>('sync_get_rows_by_ids', { tableName, ids }),
  // Fetches only rows modified or created since epoch ms to prevent full table scans on autosave/push
  getModifiedRows: async <T = Record<string, unknown>>(tableName: string, sinceEpochMs: number): Promise<T[]> =>
    await invoke<T[]>('sync_get_modified_rows', { tableName, sinceEpochMs }),
};
