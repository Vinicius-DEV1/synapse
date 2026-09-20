import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web';
import { encryptVaultField, decryptVaultField } from '../../services/vault-crypto';
import type {
  VaultGroup,
  VaultItem,
  VaultPasswordHistoryEntry,
} from '../../types/vault';
import type { IVaultApi } from '../tauri/vault';
import { generatePassword, checkBreach, checkStrength } from './vault-security';

let activeVaultKey: string | undefined = undefined;

export function setWebVaultKey(key?: string): void {
  activeVaultKey = key;
}

export function clearWebVaultKey(): void {
  activeVaultKey = undefined;
}

const getVaultKey = (): string | undefined => activeVaultKey;

async function decryptItemFields(item: VaultItem, key?: string): Promise<VaultItem> {
  if (!key) return { ...item };
  return {
    ...item,
    label: item.label ? await decryptVaultField(item.label, key) : item.label,
    username: item.username ? await decryptVaultField(item.username, key) : item.username,
    email: item.email ? await decryptVaultField(item.email, key) : item.email,
    password: item.password ? await decryptVaultField(item.password, key) : item.password,
    url: item.url ? await decryptVaultField(item.url, key) : item.url,
    notes: item.notes ? await decryptVaultField(item.notes, key) : item.notes,
    custom_fields: item.custom_fields ? await decryptVaultField(item.custom_fields, key) : item.custom_fields,
  };
}

export const webVaultApi = (db: IDBPDatabase<CadernoDBSchema>, generateId: () => string): IVaultApi => {
  const api: IVaultApi = {
    getGroups: async (): Promise<VaultGroup[]> => {
      const all = (await db.getAll('vault_groups')) || [];
      return all
        .filter((g): g is VaultGroup => !g.deleted_at)
        .sort((a, b) => a.position - b.position);
    },

    upsertGroup: async (group: VaultGroup): Promise<void> => {
      const now = new Date().toISOString();
      const id = group.id || generateId();
      const newGroup: VaultGroup = {
        ...group,
        id,
        created_at: group.created_at || now,
        updated_at: now,
        deleted_at: null,
      };
      await db.put('vault_groups', newGroup);
    },

    deleteGroup: async (id: string): Promise<void> => {
      const existing = await db.get('vault_groups', id);
      if (existing) {
        const updated: VaultGroup = {
          ...existing,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await db.put('vault_groups', updated);
      }
    },

    reorderGroups: async (updates: { id: string; position: number }[]): Promise<void> => {
      for (const update of updates) {
        const existing = await db.get('vault_groups', update.id);
        if (existing) {
          const updated: VaultGroup = {
            ...existing,
            position: update.position,
            updated_at: new Date().toISOString(),
          };
          await db.put('vault_groups', updated);
        }
      }
    },

    getItems: async (groupId?: string): Promise<VaultItem[]> => {
      let all: VaultItem[] = [];
      if (groupId) {
        all = await db.getAllFromIndex('vault_items', 'group_id', groupId);
      } else {
        all = await db.getAll('vault_items');
      }
      const activeItems = all
        .filter((i): i is VaultItem => !i.deleted_at)
        .sort((a, b) => {
          if (b.is_favorite !== a.is_favorite) {
            return (b.is_favorite || 0) - (a.is_favorite || 0);
          }
          const posDiff = (a.position ?? 0) - (b.position ?? 0);
          if (posDiff !== 0) return posDiff;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

      const key = getVaultKey();
      const decryptedList: VaultItem[] = [];
      for (const item of activeItems) {
        decryptedList.push(await decryptItemFields(item, key));
      }
      return decryptedList;
    },

    getItem: async (id: string): Promise<VaultItem | null> => {
      const item = await db.get('vault_items', id);
      if (item && !item.deleted_at) {
        const key = getVaultKey();
        return await decryptItemFields(item, key);
      }
      return null;
    },

    upsertItem: async (item: VaultItem): Promise<void> => {
      const id = item.id || generateId();
      const now = new Date().toISOString();
      const key = getVaultKey();

      // Check if password changed compared to existing item in DB
      const existing = await db.get('vault_items', id).catch(() => undefined);
      let passwordChanged = false;

      if (existing && existing.password && item.password) {
        // Decrypt stored ciphertext before comparing against incoming plaintext password
        const existingPlaintext = key
          ? await decryptVaultField(existing.password, key)
          : existing.password;
        passwordChanged = existingPlaintext !== item.password;
      }

      // If password changed, save the previous password to history
      if (passwordChanged && existing?.password) {
        const historyEntry: VaultPasswordHistoryEntry = {
          id: generateId(),
          item_id: id,
          password: existing.password, // already encrypted in DB
          changed_at: now,
          deleted_at: null,
        };
        await db.put('vault_password_history', historyEntry);
      }

      const newItem: VaultItem = {
        ...item,
        id,
        created_at: item.created_at || now,
        updated_at: now,
        deleted_at: null,
        password_changed_at: passwordChanged ? now : (item.password_changed_at || now),
      };

      // Encrypt fields before persisting to IndexedDB
      if (key) {
        if (newItem.label) newItem.label = await encryptVaultField(newItem.label, key);
        if (newItem.username) newItem.username = await encryptVaultField(newItem.username, key);
        if (newItem.email) newItem.email = await encryptVaultField(newItem.email, key);
        if (newItem.password) newItem.password = await encryptVaultField(newItem.password, key);
        if (newItem.url) newItem.url = await encryptVaultField(newItem.url, key);
        if (newItem.notes) newItem.notes = await encryptVaultField(newItem.notes, key);
        if (newItem.custom_fields) newItem.custom_fields = await encryptVaultField(newItem.custom_fields, key);
      }

      await db.put('vault_items', newItem);
    },

    deleteItem: async (id: string): Promise<void> => {
      const existing = await db.get('vault_items', id);
      if (existing) {
        const updated: VaultItem = {
          ...existing,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await db.put('vault_items', updated);
      }
    },

    reorderItems: async (updates: { id: string; position: number }[]): Promise<void> => {
      for (const update of updates) {
        const existing = await db.get('vault_items', update.id);
        if (existing) {
          const updated: VaultItem = {
            ...existing,
            position: update.position,
            updated_at: new Date().toISOString(),
          };
          await db.put('vault_items', updated);
        }
      }
    },

    searchItems: async (query: string): Promise<VaultItem[]> => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      const all = await api.getItems();
      return all.filter((i) =>
        (i.label && i.label.toLowerCase().includes(q)) ||
        (i.username && i.username.toLowerCase().includes(q)) ||
        (i.url && i.url.toLowerCase().includes(q))
      );
    },

    getPasswordHistory: async (itemId: string): Promise<VaultPasswordHistoryEntry[]> => {
      const all = (await db.getAllFromIndex('vault_password_history', 'item_id', itemId)) || [];
      const filtered = all
        .filter((h): h is VaultPasswordHistoryEntry => !h.deleted_at)
        .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());

      const key = getVaultKey();
      const result: VaultPasswordHistoryEntry[] = [];
      for (const entry of filtered) {
        const decryptedPassword = key && entry.password
          ? await decryptVaultField(entry.password, key)
          : entry.password;
        result.push({
          ...entry,
          password: decryptedPassword,
        });
      }

      return result;
    },

    generatePassword,
    checkBreach,
    checkStrength,
  };

  return api;
};
