import { invoke } from '@tauri-apps/api/core';
import type {
  VaultGroup,
  VaultItem,
  VaultPasswordHistoryEntry,
  PasswordGenOptions,
  BreachCheckResult,
} from '../../types/vault';

export interface IVaultApi {
  getGroups: () => Promise<VaultGroup[]>;
  upsertGroup: (group: VaultGroup) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  reorderGroups: (updates: { id: string; position: number }[]) => Promise<void>;
  getItems: (groupId?: string) => Promise<VaultItem[]>;
  getItem: (id: string) => Promise<VaultItem | null>;
  upsertItem: (item: VaultItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  searchItems: (query: string) => Promise<VaultItem[]>;
  getPasswordHistory: (itemId: string) => Promise<VaultPasswordHistoryEntry[]>;
  generatePassword: (opts: PasswordGenOptions) => Promise<string>;
  checkBreach: (password: string) => Promise<BreachCheckResult>;
  checkStrength: (password: string) => Promise<number>;
}

export const tauriVaultApi: IVaultApi = {
  getGroups: async (): Promise<VaultGroup[]> => await invoke<VaultGroup[]>('vault_get_groups'),
  upsertGroup: async (group: VaultGroup): Promise<void> => await invoke<void>('vault_upsert_group', { group }),
  deleteGroup: async (id: string): Promise<void> => await invoke<void>('vault_delete_group', { id }),
  reorderGroups: async (updates: { id: string; position: number }[]): Promise<void> =>
    await invoke<void>('vault_reorder_groups', { updates }),
  getItems: async (groupId?: string): Promise<VaultItem[]> =>
    await invoke<VaultItem[]>('vault_get_items', { groupId }),
  getItem: async (id: string): Promise<VaultItem | null> => await invoke<VaultItem | null>('vault_get_item', { id }),
  upsertItem: async (item: VaultItem): Promise<void> => await invoke<void>('vault_upsert_item', { item }),
  deleteItem: async (id: string): Promise<void> => await invoke<void>('vault_delete_item', { id }),
  searchItems: async (query: string): Promise<VaultItem[]> =>
    await invoke<VaultItem[]>('vault_search_items', { query }),
  getPasswordHistory: async (itemId: string): Promise<VaultPasswordHistoryEntry[]> =>
    await invoke<VaultPasswordHistoryEntry[]>('vault_get_password_history', { itemId }),
  generatePassword: async (opts: PasswordGenOptions): Promise<string> =>
    await invoke<string>('vault_generate_password', { options: opts }),
  checkBreach: async (password: string): Promise<BreachCheckResult> =>
    await invoke<BreachCheckResult>('vault_check_breach', { password }),
  checkStrength: async (password: string): Promise<number> =>
    await invoke<number>('vault_check_strength', { password }),
};

