import { invoke } from '@tauri-apps/api/core';

export const tauriTrashApi = {
  getAll: async () => await invoke('trash_get_all'),
  restore: async (id: string, itemType: string) => await invoke('trash_restore', { id, itemType }),
  empty: async () => await invoke('trash_empty'),
  deletePermanently: async (id: string, itemType: string) => await invoke('trash_delete_permanently', { id, itemType })
};
