import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web';
import { encryptVaultField, decryptVaultField } from '../../services/vault-crypto';
import type {
  VaultGroup,
  VaultItem,
  VaultPasswordHistoryEntry,
  PasswordGenOptions,
  BreachCheckResult,
} from '../../types/vault';
import type { IVaultApi } from '../tauri/vault';

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

    generatePassword: async (opts: PasswordGenOptions): Promise<string> => {
      const length = opts?.length || 16;
      const useUppercase = opts?.uppercase !== false;
      const useLowercase = opts?.lowercase !== false;
      const useNumbers = opts?.numbers !== false;
      const useSymbols = opts?.symbols !== false;

      let charset = '';
      const requiredChars: string[] = [];

      const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const LOWER = 'abcdefghijklmnopqrstuvwxyz';
      const NUMBERS = '0123456789';
      const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      if (useUppercase) { charset += UPPER; requiredChars.push(UPPER); }
      if (useLowercase) { charset += LOWER; requiredChars.push(LOWER); }
      if (useNumbers) { charset += NUMBERS; requiredChars.push(NUMBERS); }
      if (useSymbols) { charset += SYMBOLS; requiredChars.push(SYMBOLS); }

      if (!charset) charset = LOWER + UPPER + NUMBERS;

      // Cryptographically secure, unbiased integer generation via rejection sampling
      const getSecureRandom = (max: number): number => {
        if (max <= 0) return 0;
        const limit = Math.floor(0x100000000 / max) * max;
        const array = new Uint32Array(1);
        let val: number;
        do {
          crypto.getRandomValues(array);
          val = array[0];
        } while (val >= limit);
        return val % max;
      };

      // Generate the password
      const chars: string[] = [];

      // Ensure at least one character from each required set
      for (const reqSet of requiredChars) {
        chars.push(reqSet[getSecureRandom(reqSet.length)]);
      }

      // Fill remaining length
      while (chars.length < length) {
        chars.push(charset[getSecureRandom(charset.length)]);
      }

      // Shuffle using Fisher-Yates with secure random
      for (let i = chars.length - 1; i > 0; i--) {
        const j = getSecureRandom(i + 1);
        const temp = chars[i];
        chars[i] = chars[j];
        chars[j] = temp;
      }

      return chars.join('');
    },

    checkBreach: async (password: string): Promise<BreachCheckResult> => {
      try {
        // Use Have I Been Pwned k-Anonymity API (only sends first 5 chars of SHA-1 hash)
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        const prefix = hashHex.substring(0, 5);
        const suffix = hashHex.substring(5);

        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
          headers: { 'Add-Padding': 'true' }
        });

        if (!response.ok) {
          return { breached: false, count: 0 };
        }

        const text = await response.text();
        const lines = text.split('\n');

        for (const line of lines) {
          const [hashSuffix, countStr] = line.trim().split(':');
          if (hashSuffix === suffix) {
            const count = parseInt(countStr, 10);
            return { breached: count > 0, count };
          }
        }

        return { breached: false, count: 0 };
      } catch (e) {
        console.error('[Vault] Error checking HIBP breach:', e);
        // Return safe default on network error — don't falsely alarm the user
        return { breached: false, count: 0 };
      }
    },

    checkStrength: async (password: string): Promise<number> => {
      if (!password) return 0;

      let score = 0;
      if (password.length >= 8) score++;
      if (password.length >= 12) score++;
      if (password.length >= 16) score++;
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
      if (/\d/.test(password)) score++;
      if (/[^a-zA-Z0-9]/.test(password)) score++;

      // Common patterns penalty
      const commonPatterns = [
        /^[a-z]+$/i, // only letters
        /^[0-9]+$/, // only numbers
      ];
      let penalties = 0;
      for (const pattern of commonPatterns) {
        if (pattern.test(password)) penalties++;
      }
      score = Math.max(0, score - penalties);

      // Map to 0-4 scale
      if (score <= 1) return 0; // Very Weak
      if (score <= 2) return 1; // Weak
      if (score <= 3) return 2; // Fair
      if (score <= 4) return 3; // Strong
      return 4; // Very Strong
    }
  };

  return api;
};
