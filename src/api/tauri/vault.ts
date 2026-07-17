import { invoke } from '@tauri-apps/api/core';

export const tauriVaultApi = {
  getGroups: async () => await invoke('vault_get_groups'),
  upsertGroup: async (group: any) => await invoke('vault_upsert_group', { group }),
  deleteGroup: async (id: string) => await invoke('vault_delete_group', { id }),
  reorderGroups: async (updates: any) => await invoke('vault_reorder_groups', { updates }),
  getItems: async (groupId?: string) => await invoke('vault_get_items', { groupId }),
  getItem: async (id: string) => await invoke('vault_get_item', { id }),
  upsertItem: async (item: any) => await invoke('vault_upsert_item', { item }),
  deleteItem: async (id: string) => await invoke('vault_delete_item', { id }),
  searchItems: async (query: string) => await invoke('vault_search_items', { query }),
  getPasswordHistory: async (itemId: string) => await invoke('vault_get_password_history', { itemId }),
  generatePassword: async (opts: any) => await invoke('vault_generate_password', { options: opts }),
  checkBreach: async (password: string) => await invoke('vault_check_breach', { password }),
  checkStrength: async (password: string) => await invoke('vault_check_strength', { password }),
};
