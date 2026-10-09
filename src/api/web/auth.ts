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

export const webAuthApi = (db: IDBPDatabase<CadernoDBSchema>): AuthApi & { forceUpdateKeychain: (_password: string, _keys?: Record<string, string>) => Promise<{ success: boolean }> } => ({
  status: async (): Promise<{ status: 'new' | 'encrypted' | 'unencrypted' }> => {
    const config = await db.get('config', 'masterHash');
    if (!config) return { status: 'new' };
    return { status: 'encrypted' };
  },
  login: async (password: string): Promise<{ success: boolean; error?: string }> => {
    const stored = await db.get('config', 'masterHash');
    if (!stored) return { success: false, error: 'Banco não configurado' };
    
    const currentHash = await hashLocalPassword(password);
    
    // Legacy web migration for users without previously saved local hash
    if (stored.value === 'setup-done') {
      await db.put('config', { id: 'masterHash', value: currentHash });
      return { success: true };
    }
    
    if (stored.value === currentHash) {
      return { success: true };
    }
    
    return { success: false, error: 'Senha incorreta' };
  },
  setup: async (password: string, _existingKeys?: { library?: string; finance?: string; notes?: string }): Promise<{ success: boolean; error?: string }> => {
    const hash = await hashLocalPassword(password);
    await db.put('config', { id: 'masterHash', value: hash });
    return { success: true };
  },
  forceUpdateKeychain: async (_password: string, _keys?: Record<string, string>): Promise<{ success: boolean }> => {
    // In Web mode, keys are not saved to a local keychain table, only kept in memory and saved to Firebase.
    return { success: true };
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
