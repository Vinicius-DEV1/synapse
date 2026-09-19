import { invoke } from '@tauri-apps/api/core';

export const tauriSyncApi = {
  getTable: async (tableName: string) => await invoke('sync_get_table', { tableName }),
  deleteRow: async (tableName: string, id: string) => await invoke('sync_delete_row', { tableName, id }),
  upsertRow: async (tableName: string, row: any) => await invoke('sync_upsert_row', { tableName, row }),
  getRow: async (tableName: string, id: string) => await invoke('sync_get_row', { tableName, id }),
  // Fetches only rows with specific IDs to prevent loading entire tables into memory
  getRowsByIds: async (tableName: string, ids: string[]) => await invoke('sync_get_rows_by_ids', { tableName, ids })
};
