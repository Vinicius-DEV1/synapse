import { describe, it, expect, beforeEach } from 'vitest';
import { openDB, type IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web-schema';
import { webAuthApi } from './auth';

describe('webAuthApi - Offline and Secure Keychain Storage', () => {
  let db: IDBPDatabase<CadernoDBSchema>;

  beforeEach(async () => {
    // Open in-memory or fresh indexeddb database for testing
    db = await openDB<CadernoDBSchema>(`test-auth-db-${Date.now()}-${Math.random()}`, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('config')) {
          database.createObjectStore('config', { keyPath: 'id' });
        }
      },
    });
  });

  it('detects new vault status when unconfigured and encrypted when configured', async () => {
    const api = webAuthApi(db);
    const initialStatus = await api.status();
    expect(initialStatus.status).toBe('new');

    await api.setup('my-secret-password-123');
    const configuredStatus = await api.status();
    expect(configuredStatus.status).toBe('encrypted');
  });

  it('fails login with wrong password and succeeds with correct password', async () => {
    const api = webAuthApi(db);
    await api.setup('correct-password-456');

    const wrongResult = await api.login('wrong-password');
    expect(wrongResult.success).toBe(false);
    expect(wrongResult.error).toBe('Senha incorreta');

    const correctResult = await api.login('correct-password-456');
    expect(correctResult.success).toBe(true);
  });

  it('persists and retrieves encrypted keychain offline via forceUpdateKeychain', async () => {
    const api = webAuthApi(db);
    const password = 'vault-offline-password-789';
    await api.setup(password);

    const mockKeys = {
      library: 'deadbeef01',
      notes: 'deadbeef02',
      finance: 'deadbeef03',
      vault: 'deadbeef04',
    };

    const updateRes = await api.forceUpdateKeychain(password, mockKeys);
    expect(updateRes.success).toBe(true);

    // Verify stored data in IndexedDB is encrypted (not plaintext)
    const storedRecord = await db.get('config', 'encryptedKeychain');
    expect(storedRecord).toBeDefined();
    expect(typeof storedRecord?.value).toBe('string');
    expect(storedRecord?.value).not.toContain('deadbeef01'); // Ciphertext, not plaintext!

    // Login should decrypt the keychain and return raw keys
    const loginRes = await api.login(password);
    expect(loginRes.success).toBe(true);
    expect(loginRes.keys).toEqual(mockKeys);
  });
});
