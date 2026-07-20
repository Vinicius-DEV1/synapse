import { invoke } from '@tauri-apps/api/core';

export const tauriSyncApi = {
  getTable: async (tableName: string) => await invoke('sync_get_table', { tableName }),
  deleteRow: async (tableName: string, id: string) => await invoke('sync_delete_row', { tableName, id }),
  upsertRow: async (tableName: string, row: any) => await invoke('sync_upsert_row', { tableName, row }),
  // #3: Busca apenas rows com IDs específicos (evita carregar tabela inteira na memória)
  getRowsByIds: async (tableName: string, ids: string[]) => await invoke('sync_get_rows_by_ids', { tableName, ids })
};
