import type { IDBPDatabase, IDBPTransaction } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web-schema';
import type { AuthApi } from '../types';
import { clearWebVaultKey } from './vault';

const KEY_PATTERN = /^[0-9a-f]{64}$/i;
const MODULE_KEYS = new Set([
  'library', 'finance', 'notes', 'core', 'focus', 'vault', 'culture', 'anki', 'files',
  'calendar', 'practice', 'video', 'diagrams', 'quiz', 'habits', 'notifications', 'sharing',
]);

function validateKeys(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('A valid encryption key set is required.');
  }
  const keys: Record<string, string> = {};
  for (const [name, candidate] of Object.entries(value)) {
    if (!MODULE_KEYS.has(name) || typeof candidate !== 'string' || !KEY_PATTERN.test(candidate)) {
      throw new Error('A valid encryption key set is required.');
    }
    keys[name] = candidate.toLowerCase();
  }
  if (Object.keys(keys).length === 0) throw new Error('A valid encryption key set is required.');
  return keys;
}

function assertKeySetsMatch(current: Record<string, string>, replacement: Record<string, string>): void {
  for (const [name, key] of Object.entries(current)) {
    if (replacement[name] !== key) {
      throw new Error(`The local and cloud encryption keys disagree for ${name}.`);
    }
  }
}

async function createEncryptedKeychain(accountPassword: string, keys: Record<string, string>): Promise<string> {
  const { deriveMasterKey, encryptText } = await import('../../services/crypto');
  const normalizedKeys = validateKeys(keys);
  const accountKey = await deriveMasterKey(accountPassword);
  return encryptText(JSON.stringify(normalizedKeys), accountKey);
}

async function readKeychain(password: string, encryptedData: string): Promise<Record<string, string>> {
  const { deriveMasterKey, decryptText } = await import('../../services/crypto');
  const accountKey = await deriveMasterKey(password);
  const plaintext = await decryptText(encryptedData, accountKey);
  const parsed: unknown = JSON.parse(plaintext);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('The local encryption keychain is malformed.');
  }
  return validateKeys(parsed);
}

async function abortExpectedTransaction(
  transaction: IDBPTransaction<CadernoDBSchema, ['config'], 'readwrite'>,
): Promise<void> {
  transaction.abort();
  await transaction.done.catch((error: unknown) => {
    if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
  });
}

export const webAuthApi = (db: IDBPDatabase<CadernoDBSchema>): AuthApi => ({
  status: async (): Promise<{ status: 'new' | 'encrypted' | 'unencrypted' }> => {
    const [keychain, legacyRecord] = await Promise.all([
      db.get('config', 'encryptedKeychain'),
      db.get('config', 'masterHash'),
    ]);
    if (keychain?.value) return { status: 'encrypted' };
    return legacyRecord ? { status: 'unencrypted' } : { status: 'new' };
  },

  login: async (accountPassword: string): Promise<{ success: boolean; error?: string; keys?: Record<string, string> }> => {
    const encryptedKeychain = await db.get('config', 'encryptedKeychain');
    if (encryptedKeychain?.value) {
      try {
        const keys = await readKeychain(accountPassword, encryptedKeychain.value);
        return { success: true, keys };
      } catch (error: unknown) {
        console.warn('[webAuthApi] Account credential did not open the local keychain:', error);
        return { success: false, error: 'The account credential could not unlock this device keychain.' };
      }
    }

    return { success: false, error: 'This device keychain requires migration through the cloud account.' };
  },

  setup: async (accountPassword: string, existingKeys?: Record<string, string>): Promise<{ success: boolean; error?: string; keys?: Record<string, string> }> => {
    if (!existingKeys) return { success: false, error: 'Encryption keys are required to initialize this device.' };
    try {
      const keys = validateKeys(existingKeys);
      const encryptedKeychain = await createEncryptedKeychain(accountPassword, keys);
      const transaction = db.transaction('config', 'readwrite');
      const existingKeychain = await transaction.store.get('encryptedKeychain');
      if (existingKeychain?.value) {
        await abortExpectedTransaction(transaction);
        return { success: false, error: 'This device keychain is already initialized.' };
      }
      await transaction.store.put({ id: 'encryptedKeychain', value: encryptedKeychain });
      await transaction.store.delete('masterHash');
      await transaction.done;
      return { success: true, keys };
    } catch (error: unknown) {
      console.error('[webAuthApi] Failed to initialize account keychain:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to initialize device encryption.' };
    }
  },

  forceUpdateKeychain: async (accountPassword: string, rawKeys: Record<string, string>): Promise<{ success: boolean; error?: string }> => {
    try {
      const keys = validateKeys(rawKeys);
      const currentKeychain = await db.get('config', 'encryptedKeychain');
      if (!currentKeychain?.value) {
        return { success: false, error: 'No verified device keychain is available to update.' };
      }
      const currentKeys = await readKeychain(accountPassword, currentKeychain.value);
      assertKeySetsMatch(currentKeys, keys);
      const encryptedKeychain = await createEncryptedKeychain(accountPassword, keys);
      const transaction = db.transaction('config', 'readwrite');
      const latestKeychain = await transaction.store.get('encryptedKeychain');
      if (latestKeychain?.value !== currentKeychain.value) {
        await abortExpectedTransaction(transaction);
        return { success: false, error: 'The device keychain changed during update. Sign in again and retry.' };
      }
      await transaction.store.put({ id: 'encryptedKeychain', value: encryptedKeychain });
      await transaction.store.delete('masterHash');
      await transaction.done;
      return { success: true };
    } catch (error: unknown) {
      console.error('[webAuthApi] Failed to update account keychain:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update device encryption.' };
    }
  },

  rewrapKeychain: async (
    previousPassword: string,
    accountPassword: string,
    rawKeys: Record<string, string>,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const keys = validateKeys(rawKeys);
      const currentKeychain = await db.get('config', 'encryptedKeychain');
      const legacyRecord = await db.get('config', 'masterHash');
      if (currentKeychain?.value) {
        const currentKeys = await readKeychain(previousPassword, currentKeychain.value);
        assertKeySetsMatch(currentKeys, keys);
      } else if (!legacyRecord) {
        return { success: false, error: 'No previous device keychain is available to migrate.' };
      }

      const encryptedKeychain = await createEncryptedKeychain(accountPassword, keys);
      const transaction = db.transaction('config', 'readwrite');
      const latestKeychain = await transaction.store.get('encryptedKeychain');
      const latestLegacyRecord = await transaction.store.get('masterHash');
      if (latestKeychain?.value !== currentKeychain?.value ||
          latestLegacyRecord?.value !== legacyRecord?.value) {
        await abortExpectedTransaction(transaction);
        return { success: false, error: 'The device keychain changed during migration. Sign in again and retry.' };
      }
      await transaction.store.put({ id: 'encryptedKeychain', value: encryptedKeychain });
      await transaction.store.delete('masterHash');
      await transaction.done;
      return { success: true };
    } catch (error: unknown) {
      console.error('[webAuthApi] Account key migration failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to migrate device encryption.' };
    }
  },

  wipeLocalData: async () => {
    indexedDB.deleteDatabase('caderno-web-db');
    window.location.reload();
  },
  getVisitors: async () => [],
  createVisitor: async () => ({ success: false, error: 'Not implemented in Web yet' }),
  deleteVisitor: async () => ({ success: false, error: 'Not implemented in Web yet' }),
  onLock: () => () => {},
  lock: async () => {
    clearWebVaultKey();
  },
  setPreferences: async () => {},
});
