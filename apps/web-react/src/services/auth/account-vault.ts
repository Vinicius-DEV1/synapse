import { buildModuleKeys, ACCOUNT_MODULES } from '../../components/auth/auth-keys-builder';
import { deriveMasterKey } from '../crypto';
import {
  clearFailedAttempts,
  ensureCloudAccountCrypto,
  pullAccountModuleKeys,
  rewrapCloudAccountCrypto,
  verifyAccountEncryptionKey,
} from '../sync/sync-auth';

const MODULE_KEY_PATTERN = /^[0-9a-f]{64}$/i;
const ACCOUNT_MODULE_SET = new Set<string>(ACCOUNT_MODULES);
const KEYCHAIN_MODULES = [
  'library', 'finance', 'notes', 'culture', 'anki', 'focus', 'files', 'vault', 'calendar', 'practice', 'core',
] as const;

export interface AccountVaultSession {
  accountKey: CryptoKey;
  moduleKeys: Record<string, CryptoKey>;
  rawModuleKeys: Record<string, string>;
}

export class LegacyVaultMigrationRequired extends Error {
  readonly reason: 'device' | 'cloud' | 'both';

  constructor(reason: 'device' | 'cloud' | 'both') {
    super('This device or its cloud key envelope still uses a previous encryption credential.');
    this.name = 'LegacyVaultMigrationRequired';
    this.reason = reason;
  }
}

export class PreviousVaultCredentialInvalid extends Error {
  constructor() {
    super('The previous device or cloud encryption credential could not be verified. No keys were changed.');
    this.name = 'PreviousVaultCredentialInvalid';
  }
}

function parseModuleKeys(value: unknown): Record<string, string> | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The encryption key set is malformed.');
  }

  const keys: Record<string, string> = {};
  for (const [module, candidate] of Object.entries(value)) {
    if (!ACCOUNT_MODULE_SET.has(module)) {
      throw new Error(`The encryption key set contains an unknown module: ${module}.`);
    }
    if (candidate === null || candidate === undefined) continue;
    if (typeof candidate !== 'string' || !MODULE_KEY_PATTERN.test(candidate)) {
      throw new Error('The encryption key set contains an invalid key.');
    }
    keys[module] = candidate.toLowerCase();
  }
  return Object.keys(keys).length > 0 ? keys : null;
}

function mergeModuleKeys(...keySets: Array<Record<string, string> | null>): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const keySet of keySets) {
    if (!keySet) continue;
    const parsed = parseModuleKeys(keySet);
    if (!parsed) continue;
    for (const [module, key] of Object.entries(parsed)) {
      if (merged[module] && merged[module] !== key) {
        throw new Error(`Local and cloud encryption keys disagree for ${module}. No key was changed.`);
      }
      merged[module] = key;
    }
  }
  return merged;
}

function createIndependentModuleKeys(): Record<string, string> {
  return Object.fromEntries(ACCOUNT_MODULES.map((module) => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const key = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    bytes.fill(0);
    return [module, key];
  }));
}

async function createSession(accountKey: CryptoKey, rawModuleKeys: Record<string, string>): Promise<AccountVaultSession> {
  return {
    accountKey,
    rawModuleKeys,
    moduleKeys: await buildModuleKeys(rawModuleKeys, accountKey),
  };
}

async function pullKeysIfAvailable(accountKey: CryptoKey): Promise<Record<string, string> | null> {
  try {
    return await pullAccountModuleKeys(accountKey);
  } catch {
    throw new LegacyVaultMigrationRequired('cloud');
  }
}

async function prepareLocalKeychain(
  accountPassword: string,
  status: 'new' | 'encrypted' | 'unencrypted',
  localKeys: Record<string, string> | null,
  moduleKeys: Record<string, string>,
): Promise<void> {
  if (status === 'new' || status === 'unencrypted') {
    const result = await window.api.auth.setup(accountPassword, moduleKeys);
    if (!result.success) throw new Error(result.error || 'Could not initialize device encryption.');
    return;
  }

  if (!localKeys) throw new Error('The device keychain did not return verifiable module keys.');
  const needsUpdate = KEYCHAIN_MODULES.some((module) => localKeys[module] !== moduleKeys[module]);
  if (!needsUpdate) return;

  const result = await window.api.auth.forceUpdateKeychain(accountPassword, moduleKeys);
  if (!result.success) throw new Error(result.error || 'Could not synchronize the device encryption keys.');
}

export async function unlockWithAccountPassword(accountPassword: string): Promise<AccountVaultSession> {
  const accountKey = await deriveMasterKey(accountPassword);
  const [cloudStatus, localStatus] = await Promise.all([
    verifyAccountEncryptionKey(accountPassword),
    window.api.auth.status(),
  ]);

  let localKeys: Record<string, string> | null = null;
  if (localStatus.status === 'encrypted') {
    const localLogin = await window.api.auth.login(accountPassword);
    if (!localLogin.success) throw new LegacyVaultMigrationRequired('device');
    localKeys = parseModuleKeys(localLogin.keys);
  }

  if (cloudStatus.error === 'invalid') {
    throw new LegacyVaultMigrationRequired(localKeys ? 'cloud' : 'both');
  }

  if (cloudStatus.error === 'offline' || cloudStatus.error === 'timeout') {
    if (localStatus.status !== 'encrypted' || !localKeys) {
      throw new Error('Connect to the internet to unlock this account on this device.');
    }
    await clearFailedAttempts();
    return createSession(accountKey, localKeys);
  }
  if (cloudStatus.error === 'unavailable') {
    throw new Error('The cloud encryption verifier could not be reached. The device keychain was left unchanged.');
  }

  const cloudKeys = await pullKeysIfAvailable(accountKey);
  let rawModuleKeys = mergeModuleKeys(localKeys, cloudKeys);

  if (Object.keys(rawModuleKeys).length === 0) {
    if (cloudStatus.isNew && localStatus.status !== 'encrypted') {
      rawModuleKeys = createIndependentModuleKeys();
    } else if (localStatus.status === 'encrypted') {
      throw new Error('No verified encryption keys are available. The local keychain was left unchanged.');
    } else {
      throw new Error('The cloud account has no recoverable module keys. The device was left unchanged.');
    }
  }

  const cloudHasMissingLocalKeys = localKeys !== null && Object.entries(localKeys)
    .some(([module]) => cloudKeys?.[module] === undefined);
  if (cloudStatus.isNew || cloudKeys === null || cloudHasMissingLocalKeys) {
    rawModuleKeys = await ensureCloudAccountCrypto(accountKey, rawModuleKeys);
  }

  await prepareLocalKeychain(accountPassword, localStatus.status, localKeys, rawModuleKeys);
  const verifiedLocalLogin = await window.api.auth.login(accountPassword);
  if (!verifiedLocalLogin.success) {
    throw new Error('The account encryption key could not reopen the saved device keychain.');
  }
  return createSession(accountKey, rawModuleKeys);
}

export async function migrateLegacyVaultToAccountPassword(
  accountPassword: string,
  previousPassword: string,
): Promise<AccountVaultSession> {
  const accountKey = await deriveMasterKey(accountPassword);
  const previousKey = await deriveMasterKey(previousPassword);
  const localStatus = await window.api.auth.status();

  const previousCloudStatus = await verifyAccountEncryptionKey(previousPassword);
  if (previousCloudStatus.error === 'offline' || previousCloudStatus.error === 'timeout' || previousCloudStatus.error === 'unavailable') {
    throw new Error('Connect to the internet to migrate the existing cloud encryption.');
  }

  let accountCloudStatus = previousCloudStatus;
  let cloudKeys: Record<string, string> | null = null;
  if (previousCloudStatus.isValid && !previousCloudStatus.isNew) {
    cloudKeys = await pullAccountModuleKeys(previousKey);
  } else {
    accountCloudStatus = await verifyAccountEncryptionKey(accountPassword);
    if (accountCloudStatus.error === 'offline' || accountCloudStatus.error === 'timeout' || accountCloudStatus.error === 'unavailable') {
      throw new Error('Connect to the internet to migrate the existing cloud encryption.');
    }
    if (!previousCloudStatus.isNew && !accountCloudStatus.isValid) {
      if (accountCloudStatus.error === 'invalid') throw new PreviousVaultCredentialInvalid();
      throw new Error('The previous encryption credential did not verify against the cloud account. No keys were changed.');
    }
    if (accountCloudStatus.isValid && !accountCloudStatus.isNew) {
      cloudKeys = await pullAccountModuleKeys(accountKey);
    } else {
      try {
        cloudKeys = await pullAccountModuleKeys(previousKey);
      } catch (previousCloudError: unknown) {
        console.warn('[AccountVault] Previous cloud key envelope could not be opened; checking the account credential:', previousCloudError instanceof Error ? previousCloudError.message : 'Unknown key-envelope error.');
        try {
          cloudKeys = await pullAccountModuleKeys(accountKey);
        } catch (accountCloudError: unknown) {
          const mismatchMessage = 'do not match this account credential';
          if (previousCloudError instanceof Error && accountCloudError instanceof Error &&
              previousCloudError.message.includes(mismatchMessage) && accountCloudError.message.includes(mismatchMessage)) {
            throw new PreviousVaultCredentialInvalid();
          }
          throw accountCloudError;
        }
      }
    }
  }

  let localKeys: Record<string, string> | null = null;
  let localUsedPreviousCredential = false;
  if (localStatus.status === 'encrypted') {
    const previousLogin = await window.api.auth.login(previousPassword);
    if (previousLogin.success) {
      localKeys = parseModuleKeys(previousLogin.keys);
      localUsedPreviousCredential = true;
    } else if (previousPassword !== accountPassword) {
      const accountLogin = await window.api.auth.login(accountPassword);
      if (accountLogin.success) localKeys = parseModuleKeys(accountLogin.keys);
    }
    if (!localKeys) throw new PreviousVaultCredentialInvalid();
  }

  const rawModuleKeys = mergeModuleKeys(localKeys, cloudKeys);
  if (Object.keys(rawModuleKeys).length === 0) {
    throw new Error('No existing encryption keys could be verified. No data or keys were changed.');
  }

  await rewrapCloudAccountCrypto(previousKey, accountKey, rawModuleKeys);

  if (localStatus.status === 'encrypted' && localUsedPreviousCredential && previousPassword !== accountPassword) {
    const result = await window.api.auth.rewrapKeychain(previousPassword, accountPassword, rawModuleKeys);
    if (!result.success) throw new Error(result.error || 'The device keychain migration failed; the previous keychain remains available.');
  } else if (localStatus.status !== 'encrypted') {
    const result = await window.api.auth.setup(accountPassword, rawModuleKeys);
    if (!result.success) throw new Error(result.error || 'Could not initialize the migrated device keychain.');
  }

  const verifiedLocalLogin = await window.api.auth.login(accountPassword);
  if (!verifiedLocalLogin.success) {
    throw new Error('The migrated account credential could not reopen the device keychain.');
  }
  return createSession(accountKey, rawModuleKeys);
}
