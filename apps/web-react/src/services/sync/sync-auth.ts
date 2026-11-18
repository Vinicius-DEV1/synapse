import { db } from '../firebase';
import { encryptText, decryptText, deriveMasterKey } from '../crypto';
import { getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { logFirebaseOp } from './sync-monitor';
import { getUserConfigRef } from './user-config';
import { getErrorMessage } from '../../utils/error';

export { clearFailedAttempts, getSecurityLock, recordFailedAttempt } from './sync-security';
export type { SecurityLock } from './sync-security';

const MODULE_KEY_PATTERN = /^[0-9a-f]{64}$/i;
const MODULE_KEY_NAMES = new Set([
  'library', 'finance', 'notes', 'core', 'focus', 'vault', 'culture', 'anki', 'files',
  'calendar', 'practice', 'video', 'diagrams', 'quiz', 'habits', 'notifications', 'sharing',
]);

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('FIREBASE_TIMEOUT')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function parseModuleKeys(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Cloud encryption key data is malformed.');
  }

  const keys: Record<string, string> = {};
  for (const [name, key] of Object.entries(value)) {
    if (!MODULE_KEY_NAMES.has(name)) {
      throw new Error(`Cloud encryption data contains an unknown module key: ${name}.`);
    }
    if (key === undefined || key === null) continue;
    if (typeof key !== 'string' || !MODULE_KEY_PATTERN.test(key)) {
      throw new Error('Cloud encryption key data is malformed.');
    }
    keys[name] = key.toLowerCase();
  }
  if (Object.keys(keys).length === 0) throw new Error('No usable cloud encryption keys were found.');
  return keys;
}

function mergeModuleKeys(...keySets: Array<Record<string, string> | null | undefined>): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const keySet of keySets) {
    if (!keySet) continue;
    for (const [name, key] of Object.entries(parseModuleKeys(keySet))) {
      const current = merged[name];
      if (current && current !== key) {
        throw new Error(`The local and cloud encryption keys disagree for ${name}; no keys were changed.`);
      }
      merged[name] = key;
    }
  }
  return merged;
}

async function readEncryptedModuleKeys(encryptedData: string, key: CryptoKey): Promise<Record<string, string>> {
  const plaintext = await decryptText(encryptedData, key);
  return parseModuleKeys(JSON.parse(plaintext) as unknown);
}

export async function verifyAccountEncryptionKey(password: string): Promise<{ isValid: boolean; isNew: boolean; error?: 'offline' | 'timeout' | 'invalid' | 'unavailable' }> {
  if (!navigator.onLine) return { isValid: false, isNew: false, error: 'offline' };
  try {
    const accountKey = await deriveMasterKey(password);
    const docRef = getUserConfigRef('auth_validator');
    if (!docRef) return { isValid: true, isNew: true };

    const docSnap = await withTimeout(getDoc(docRef), 5000);

    logFirebaseOp('read', 1);

    if (!docSnap.exists()) {
      return { isValid: true, isNew: true };
    }

    const encryptedData = docSnap.data().encryptedData;
    if (typeof encryptedData !== 'string' || !encryptedData) {
      return { isValid: false, isNew: false, error: 'invalid' };
    }

    try {
      const decryptedJson = await decryptText(encryptedData, accountKey);
      const parsed: unknown = JSON.parse(decryptedJson);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return { isValid: false, isNew: false, error: 'invalid' };
      }
      if ('validator' in parsed && parsed.validator === 'CADERNO_VALIDO') {
        return { isValid: true, isNew: false };
      }
    } catch (decryptError: unknown) {
      console.debug('[SyncAuth] Account encryption verifier could not be decrypted:', getErrorMessage(decryptError));
      return { isValid: false, isNew: false, error: 'invalid' };
    }

    return { isValid: false, isNew: false, error: 'invalid' };
  } catch (netErr) {
    const message = getErrorMessage(netErr);
    console.warn('[SyncAuth] Account encryption verification failed:', message);
    return { isValid: false, isNew: false, error: message === 'FIREBASE_TIMEOUT' ? 'timeout' : 'unavailable' };
  }
}


export async function pullAccountModuleKeys(accountKey: CryptoKey): Promise<Record<string, string> | null> {
  const keysRef = getUserConfigRef('module_keys');
  if (!navigator.onLine || !keysRef) return null;

  const docSnap = await withTimeout(getDoc(keysRef), 5000);
  logFirebaseOp('read', 1);
  if (!docSnap.exists()) return null;

  const encryptedData = docSnap.data().encryptedData;
  if (typeof encryptedData !== 'string' || !encryptedData) {
    throw new Error('The account encryption key record is incomplete.');
  }
  try {
    return await readEncryptedModuleKeys(encryptedData, accountKey);
  } catch (error: unknown) {
    console.error('[SyncAuth] Cloud module keys could not be validated:', getErrorMessage(error));
    throw new Error('The cloud encryption keys do not match this account credential.', { cause: error });
  }
}

export async function ensureCloudAccountCrypto(
  accountKey: CryptoKey,
  expectedKeys: Record<string, string>,
): Promise<Record<string, string>> {
  if (!navigator.onLine) throw new Error('Connect to the internet to initialize cloud encryption.');
  const validatorRef = getUserConfigRef('auth_validator');
  const keysRef = getUserConfigRef('module_keys');
  if (!validatorRef || !keysRef) throw new Error('Sign in to a permanent cloud account first.');

  const requestedKeys = parseModuleKeys(expectedKeys);
  const writes = await runTransaction(db, async (transaction) => {
    const [validatorSnapshot, keysSnapshot] = await Promise.all([
      transaction.get(validatorRef),
      transaction.get(keysRef),
    ]);
    let writeCount = 0;

    if (validatorSnapshot.exists()) {
      const encryptedData = validatorSnapshot.data().encryptedData;
      if (typeof encryptedData !== 'string' || !encryptedData) {
        throw new Error('The cloud encryption verifier is incomplete; it was left unchanged.');
      }
      const decrypted = JSON.parse(await decryptText(encryptedData, accountKey)) as unknown;
      if (typeof decrypted !== 'object' || decrypted === null || Array.isArray(decrypted) ||
          !('validator' in decrypted) || decrypted.validator !== 'CADERNO_VALIDO') {
        throw new Error('The cloud encryption verifier is invalid; it was left unchanged.');
      }
    } else {
      transaction.set(validatorRef, {
        encryptedData: await encryptText(JSON.stringify({ validator: 'CADERNO_VALIDO' }), accountKey),
        updatedAt: serverTimestamp(),
      });
      writeCount += 1;
    }

    let mergedKeys = requestedKeys;
    if (keysSnapshot.exists()) {
      const encryptedData = keysSnapshot.data().encryptedData;
      if (typeof encryptedData !== 'string' || !encryptedData) {
        throw new Error('The cloud module key record is incomplete; it was left unchanged.');
      }
      const existingKeys = await readEncryptedModuleKeys(encryptedData, accountKey);
      mergedKeys = mergeModuleKeys(existingKeys, requestedKeys);
      if (Object.keys(mergedKeys).length !== Object.keys(existingKeys).length) {
        transaction.set(keysRef, {
          encryptedData: await encryptText(JSON.stringify(mergedKeys), accountKey),
          updatedAt: serverTimestamp(),
        });
        writeCount += 1;
      }
    } else {
      transaction.set(keysRef, {
        encryptedData: await encryptText(JSON.stringify(requestedKeys), accountKey),
        updatedAt: serverTimestamp(),
      });
      writeCount += 1;
    }

    return { writeCount, mergedKeys };
  });

  logFirebaseOp('read', 2);
  if (writes.writeCount > 0) logFirebaseOp('write', writes.writeCount);
  return writes.mergedKeys;
}

export async function rewrapCloudAccountCrypto(
  previousKey: CryptoKey,
  accountKey: CryptoKey,
  expectedKeys: Record<string, string>,
): Promise<Record<string, string>> {
  if (!navigator.onLine) throw new Error('Connect to the internet to migrate cloud encryption.');
  const validatorRef = getUserConfigRef('auth_validator');
  const keysRef = getUserConfigRef('module_keys');
  if (!validatorRef || !keysRef) throw new Error('Sign in to a permanent cloud account first.');

  const requestedKeys = parseModuleKeys(expectedKeys);
  const result = await runTransaction(db, async (transaction) => {
    const [validatorSnapshot, keysSnapshot] = await Promise.all([
      transaction.get(validatorRef),
      transaction.get(keysRef),
    ]);

    let hasValidator = false;
    if (validatorSnapshot.exists()) {
      const encryptedData = validatorSnapshot.data().encryptedData;
      if (typeof encryptedData !== 'string' || !encryptedData) {
        throw new Error('The existing cloud encryption verifier is incomplete.');
      }
      const plaintext = await decryptWithEitherKey(encryptedData, previousKey, accountKey);
      const parsed: unknown = JSON.parse(plaintext);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed) ||
          !('validator' in parsed) || parsed.validator !== 'CADERNO_VALIDO') {
        throw new Error('The existing cloud encryption verifier could not be validated.');
      }
      hasValidator = true;
    }

    let mergedKeys = requestedKeys;
    if (keysSnapshot.exists()) {
      const encryptedData = keysSnapshot.data().encryptedData;
      if (typeof encryptedData !== 'string' || !encryptedData) {
        throw new Error('The existing cloud module key record is incomplete.');
      }
      const plaintext = await decryptWithEitherKey(encryptedData, previousKey, accountKey);
      mergedKeys = mergeModuleKeys(parseModuleKeys(JSON.parse(plaintext) as unknown), requestedKeys);
    }
    if (!hasValidator && !keysSnapshot.exists() && Object.keys(mergedKeys).length === 0) {
      throw new Error('No existing encryption keys were verified; cloud data was left unchanged.');
    }

    transaction.set(validatorRef, {
      encryptedData: await encryptText(JSON.stringify({ validator: 'CADERNO_VALIDO' }), accountKey),
      updatedAt: serverTimestamp(),
    });
    transaction.set(keysRef, {
      encryptedData: await encryptText(JSON.stringify(mergedKeys), accountKey),
      updatedAt: serverTimestamp(),
    });
    return mergedKeys;
  });

  logFirebaseOp('read', 2);
  logFirebaseOp('write', 2);
  return result;
}

async function decryptWithEitherKey(
  encryptedData: string,
  previousKey: CryptoKey,
  accountKey: CryptoKey,
): Promise<string> {
  try {
    return await decryptText(encryptedData, previousKey);
  } catch {
    return await decryptText(encryptedData, accountKey);
  }
}
