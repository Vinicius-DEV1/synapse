import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web-schema';
import type { AuthApi } from '../types';
import { clearWebVaultKey } from './vault';

async function hashLocalPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "caderno-local-auth-salt");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const webAuthApi = (db: IDBPDatabase<CadernoDBSchema>): AuthApi & { forceUpdateKeychain: (password: string, keys?: Record<string, string>) => Promise<{ success: boolean }> } => ({
  status: async (): Promise<{ status: 'new' | 'encrypted' | 'unencrypted' }> => {
    const config = await db.get('config', 'masterHash');
    if (!config) return { status: 'new' };
    return { status: 'encrypted' };
  },
  login: async (password: string): Promise<{ success: boolean; error?: string; keys?: Record<string, string> }> => {
    const stored = await db.get('config', 'masterHash');
    if (!stored) return { success: false, error: 'Banco não configurado' };
    
    const currentHash = await hashLocalPassword(password);
    
    // Legacy web migration for users without previously saved local hash
    if (stored.value === 'setup-done') {
      await db.put('config', { id: 'masterHash', value: currentHash });
      return { success: true };
    }
    
    if (stored.value === currentHash) {
      let keys: Record<string, string> | undefined;
      try {
        const encKeychainRecord = await db.get('config', 'encryptedKeychain');
        if (encKeychainRecord && encKeychainRecord.value) {
          const { deriveMasterKey, decryptText } = await import('../../services/crypto');
          const masterKey = await deriveMasterKey(password);
          const decryptedJson = await decryptText(encKeychainRecord.value, masterKey);
          keys = JSON.parse(decryptedJson) as Record<string, string>;
        }
      } catch (e) {
        console.warn('[webAuthApi] Failed to decrypt local keychain:', e);
      }
      return { success: true, keys };
    }
    
    return { success: false, error: 'Senha incorreta' };
  },
  setup: async (password: string, existingKeys?: { library?: string; finance?: string; notes?: string }): Promise<{ success: boolean; error?: string; keys?: Record<string, string> }> => {
    const hash = await hashLocalPassword(password);
    await db.put('config', { id: 'masterHash', value: hash });
    if (existingKeys && Object.keys(existingKeys).length > 0) {
      try {
        const { deriveMasterKey, encryptText } = await import('../../services/crypto');
        const masterKey = await deriveMasterKey(password);
        const encryptedStr = await encryptText(JSON.stringify(existingKeys), masterKey);
        await db.put('config', { id: 'encryptedKeychain', value: encryptedStr });
      } catch (e) {
        console.warn('[webAuthApi] Failed to cache initial encrypted keychain:', e);
      }
    }
    return { success: true, keys: existingKeys as Record<string, string> | undefined };
  },
  forceUpdateKeychain: async (password: string, keys?: Record<string, string>): Promise<{ success: boolean }> => {
    if (!keys || Object.keys(keys).length === 0) return { success: true };
    try {
      const { deriveMasterKey, encryptText } = await import('../../services/crypto');
      const masterKey = await deriveMasterKey(password);
      const encryptedStr = await encryptText(JSON.stringify(keys), masterKey);
      await db.put('config', { id: 'encryptedKeychain', value: encryptedStr });
      return { success: true };
    } catch (e) {
      console.error('[webAuthApi] Failed to save encrypted keychain locally:', e);
      return { success: false };
    }
  },
  changePassword: async () => ({ success: false, error: "Alteração de senha requer o app Desktop" }),
  wipeLocalData: async () => {
    indexedDB.deleteDatabase('caderno-web-db');
    window.location.reload();
  },
  getVisitors: async () => [],
  createVisitor: async () => ({ success: false, error: "Not implemented in Web yet" }),
  deleteVisitor: async () => ({ success: false, error: "Not implemented in Web yet" }),
  onLock: () => () => {},
  lock: async () => {
    clearWebVaultKey();
  },
  setPreferences: async () => {}
});
