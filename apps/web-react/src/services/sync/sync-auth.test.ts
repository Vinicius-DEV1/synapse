import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  verifyCloudMasterPassword,
  getSecurityLock,
  recordFailedAttempt,
  clearFailedAttempts,
  initializeCloudValidator,
  pushModularKeysToCloud,
  pullModularKeysFromCloud,
} from './sync-auth';
import { deriveMasterKey, encryptText } from '../crypto';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, table, id) => ({ path: `${table}/${id}`, table, id })),
  getDoc: vi.fn(),
  setDoc: vi.fn().mockResolvedValue(undefined),
  serverTimestamp: vi.fn(() => 'MOCK_SERVER_TIMESTAMP'),
}));

vi.mock('../firebase', () => ({
  db: { type: 'mock-firestore-db' },
}));

describe('sync-auth service', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns offline error when navigator is offline in verifyCloudMasterPassword', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const result = await verifyCloudMasterPassword('some-password');
    expect(result).toEqual({ isValid: false, isNew: false, error: 'offline' });
  });

  it('returns isNew: true when auth_validator document does not exist', async () => {
    (firestore.getDoc as any).mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    });

    const result = await verifyCloudMasterPassword('new-master-password');
    expect(result).toEqual({ isValid: true, isNew: true });
  });

  it('returns isValid: true when master password correctly decrypts the cloud validator', async () => {
    const password = 'CorrectPassword!123';
    const masterKey = await deriveMasterKey(password);
    const encryptedData = await encryptText(JSON.stringify({ validator: 'CADERNO_VALIDO' }), masterKey);

    (firestore.getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({ encryptedData }),
    });

    const result = await verifyCloudMasterPassword(password);
    expect(result).toEqual({ isValid: true, isNew: false });
  });

  it('returns invalid error when password cannot decrypt cloud validator', async () => {
    const masterKey = await deriveMasterKey('RealPassword');
    const encryptedData = await encryptText(JSON.stringify({ validator: 'CADERNO_VALIDO' }), masterKey);

    (firestore.getDoc as any).mockResolvedValue({
      exists: () => true,
      data: () => ({ encryptedData }),
    });

    const result = await verifyCloudMasterPassword('WrongPassword');
    expect(result).toEqual({ isValid: false, isNew: false, error: 'invalid' });
  });

  it('records and clears failed login attempts', async () => {
    (firestore.getDoc as any).mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    });

    const lock1 = await recordFailedAttempt();
    expect(lock1.failedAttempts).toBe(1);
    expect(lock1.lastFailedAt).toBeGreaterThan(0);

    const lock2 = await recordFailedAttempt();
    expect(lock2.failedAttempts).toBe(2);

    await clearFailedAttempts();
    const lockCleared = await getSecurityLock();
    expect(lockCleared.failedAttempts).toBe(0);
  });

  it('pushes and pulls modular keys with encryption', async () => {
    const masterKey = await deriveMasterKey('SecureKeyMaster');
    const modularKeys = { notes: 'key-123', finance: 'key-456' };

    // Push: doc doesn't exist yet
    (firestore.getDoc as any).mockResolvedValueOnce({
      exists: () => false,
      data: () => ({}),
    });

    await pushModularKeysToCloud(modularKeys, masterKey);
    expect(firestore.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'config/module_keys' }),
      expect.objectContaining({
        encryptedData: expect.any(String),
      }),
      { merge: true }
    );

    // Pull: simulate cloud returning the encrypted payload
    const encryptedData = await encryptText(JSON.stringify(modularKeys), masterKey);
    (firestore.getDoc as any).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ encryptedData }),
    });

    const pulled = await pullModularKeysFromCloud(masterKey);
    expect(pulled).toEqual(modularKeys);
  });
});
