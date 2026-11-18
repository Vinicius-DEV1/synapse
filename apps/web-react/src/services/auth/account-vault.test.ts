import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACCOUNT_MODULES } from '../../components/auth/auth-keys-builder';
import { deriveMasterKey } from '../crypto';
import {
  clearFailedAttempts,
  ensureCloudAccountCrypto,
  pullAccountModuleKeys,
  rewrapCloudAccountCrypto,
  verifyAccountEncryptionKey,
} from '../sync/sync-auth';
import {
  migrateLegacyVaultToAccountPassword,
  PreviousVaultCredentialInvalid,
  unlockWithAccountPassword,
} from './account-vault';

const mocks = vi.hoisted(() => ({
  deriveMasterKey: vi.fn(),
  clearFailedAttempts: vi.fn(),
  ensureCloudAccountCrypto: vi.fn(),
  pullAccountModuleKeys: vi.fn(),
  rewrapCloudAccountCrypto: vi.fn(),
  verifyAccountEncryptionKey: vi.fn(),
}));

vi.mock('../crypto', async (importOriginal) => ({
  ...await importOriginal<typeof import('../crypto')>(),
  deriveMasterKey: mocks.deriveMasterKey,
}));
vi.mock('../sync/sync-auth', () => ({
  clearFailedAttempts: mocks.clearFailedAttempts,
  ensureCloudAccountCrypto: mocks.ensureCloudAccountCrypto,
  pullAccountModuleKeys: mocks.pullAccountModuleKeys,
  rewrapCloudAccountCrypto: mocks.rewrapCloudAccountCrypto,
  verifyAccountEncryptionKey: mocks.verifyAccountEncryptionKey,
}));

const ACCOUNT_KEYS: Record<string, string> = Object.fromEntries(
  ACCOUNT_MODULES.map((module, index) => [module, index.toString(16).padStart(2, '0').repeat(32)]),
);

const successfulLogin = { success: true, keys: ACCOUNT_KEYS };

describe('account vault key lifecycle', () => {
  let accountKey: CryptoKey;
  let authApi: {
    status: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    setup: ReturnType<typeof vi.fn>;
    forceUpdateKeychain: ReturnType<typeof vi.fn>;
    rewrapKeychain: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    accountKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(32),
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt'],
    );
    vi.mocked(deriveMasterKey).mockResolvedValue(accountKey);
    vi.mocked(clearFailedAttempts).mockResolvedValue(undefined);
    vi.mocked(ensureCloudAccountCrypto).mockImplementation(async (_key, keys) => keys);
    vi.mocked(pullAccountModuleKeys).mockResolvedValue(null);
    vi.mocked(rewrapCloudAccountCrypto).mockImplementation(async (_previous, _account, keys) => keys);
    vi.mocked(verifyAccountEncryptionKey).mockResolvedValue({ isValid: true, isNew: true });

    authApi = {
      status: vi.fn().mockResolvedValue({ status: 'new' }),
      login: vi.fn().mockResolvedValue(successfulLogin),
      setup: vi.fn().mockResolvedValue({ success: true }),
      forceUpdateKeychain: vi.fn().mockResolvedValue({ success: true }),
      rewrapKeychain: vi.fn().mockResolvedValue({ success: true }),
    };
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { auth: authApi },
    });
  });

  it('initializes cloud and device envelopes from one account credential', async () => {
    const session = await unlockWithAccountPassword('account-password');

    expect(session.accountKey).toBe(accountKey);
    expect(session.rawModuleKeys).toHaveProperty('notes');
    expect(pullAccountModuleKeys).toHaveBeenCalledOnce();
    expect(ensureCloudAccountCrypto).toHaveBeenCalledOnce();
    expect(authApi.setup).toHaveBeenCalledOnce();
    expect(authApi.login).toHaveBeenCalledOnce();
  });

  it('refuses conflicting local and cloud keys without rewriting either keychain', async () => {
    const localKeys = { ...ACCOUNT_KEYS };
    localKeys.notes = 'a'.repeat(64);
    authApi.status.mockResolvedValue({ status: 'encrypted' });
    authApi.login.mockResolvedValue({ success: true, keys: localKeys });
    vi.mocked(verifyAccountEncryptionKey).mockResolvedValue({ isValid: true, isNew: false });
    vi.mocked(pullAccountModuleKeys).mockResolvedValue(ACCOUNT_KEYS);

    await expect(unlockWithAccountPassword('account-password')).rejects.toThrow(/disagree for notes/i);
    expect(authApi.forceUpdateKeychain).not.toHaveBeenCalled();
    expect(authApi.setup).not.toHaveBeenCalled();
    expect(ensureCloudAccountCrypto).not.toHaveBeenCalled();
  });

  it('rewraps verified cloud and device keys when migrating a previous credential', async () => {
    authApi.status.mockResolvedValue({ status: 'encrypted' });
    authApi.login.mockResolvedValueOnce(successfulLogin).mockResolvedValueOnce(successfulLogin);
    vi.mocked(verifyAccountEncryptionKey).mockResolvedValue({ isValid: true, isNew: false });
    vi.mocked(pullAccountModuleKeys).mockResolvedValue(ACCOUNT_KEYS);

    const session = await migrateLegacyVaultToAccountPassword('account-password', 'previous-password');

    expect(session.rawModuleKeys).toEqual(ACCOUNT_KEYS);
    expect(rewrapCloudAccountCrypto).toHaveBeenCalledOnce();
    expect(authApi.rewrapKeychain).toHaveBeenCalledWith('previous-password', 'account-password', ACCOUNT_KEYS);
    expect(authApi.login).toHaveBeenLastCalledWith('account-password');
  });

  it('rejects an unverified previous credential without writing cloud or device keys', async () => {
    authApi.status.mockResolvedValue({ status: 'encrypted' });
    authApi.login.mockResolvedValue({ success: false });
    vi.mocked(verifyAccountEncryptionKey).mockResolvedValue({
      isValid: false,
      isNew: false,
      error: 'invalid',
    });

    await expect(migrateLegacyVaultToAccountPassword('account-password', 'wrong-previous-password'))
      .rejects.toBeInstanceOf(PreviousVaultCredentialInvalid);
    expect(rewrapCloudAccountCrypto).not.toHaveBeenCalled();
    expect(authApi.rewrapKeychain).not.toHaveBeenCalled();
  });
});
