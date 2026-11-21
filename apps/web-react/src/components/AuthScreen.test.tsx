import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuthScreen from './AuthScreen';
import {
  LegacyVaultMigrationRequired,
  migrateLegacyVaultToAccountPassword,
  unlockWithAccountPassword,
  type AccountVaultSession,
} from '../services/auth/account-vault';
import { registerWithFirebase, signInWithFirebase } from '../services/auth/firebase-auth';
import { clearFailedAttempts } from '../services/sync';

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  signInWithFirebase: vi.fn(),
  registerWithFirebase: vi.fn(),
  resetFirebasePassword: vi.fn(),
  unlockWithAccountPassword: vi.fn(),
  migrateLegacyVaultToAccountPassword: vi.fn(),
  clearFailedAttempts: vi.fn(),
  recordFailedAttempt: vi.fn(),
  getCurrentAuthUser: vi.fn(),
  setWebVaultKey: vi.fn(),
  setDriveMasterKey: vi.fn(),
  getVaultKeyHash: vi.fn(),
  setMasterKey: vi.fn(),
}));

vi.mock('../store/useStore', () => ({
  useStore: () => ({ dispatch: mocks.dispatch }),
  useStoreDispatch: () => mocks.dispatch,
}));
vi.mock('./auth/useAuthLockout', () => ({
  useAuthLockout: () => ({ lockoutTime: 0, intimidatingPhrase: '', triggerImmediateLockout: vi.fn() }),
}));
vi.mock('../i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('../services/auth/firebase-auth', () => ({
  getCurrentAuthUser: mocks.getCurrentAuthUser,
  registerWithFirebase: mocks.registerWithFirebase,
  resetFirebasePassword: mocks.resetFirebasePassword,
  signInWithFirebase: mocks.signInWithFirebase,
}));
vi.mock('../services/auth/account-vault', () => ({
  LegacyVaultMigrationRequired: class extends Error {
    reason: 'device' | 'cloud' | 'both';
    constructor(reason: 'device' | 'cloud' | 'both') {
      super('Migration required');
      this.reason = reason;
    }
  },
  PreviousVaultCredentialInvalid: class extends Error {},
  migrateLegacyVaultToAccountPassword: mocks.migrateLegacyVaultToAccountPassword,
  unlockWithAccountPassword: mocks.unlockWithAccountPassword,
}));
vi.mock('../services/sync', () => ({
  clearFailedAttempts: mocks.clearFailedAttempts,
  getSecurityLock: vi.fn().mockResolvedValue({ failedAttempts: 0, lastFailedAt: 0 }),
  recordFailedAttempt: mocks.recordFailedAttempt,
}));
vi.mock('../services/vault-crypto', () => ({ getVaultKeyHash: mocks.getVaultKeyHash }));
vi.mock('../api/web/vault', () => ({ setWebVaultKey: mocks.setWebVaultKey }));
vi.mock('../services/drive', () => ({ setDriveMasterKey: mocks.setDriveMasterKey }));

describe('cloud account unlock screen', () => {
  let accountKey: CryptoKey;
  let session: AccountVaultSession;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    accountKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(32),
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt'],
    );
    session = {
      accountKey,
      moduleKeys: {},
      rawModuleKeys: { vault: 'a'.repeat(64) },
    };
    vi.mocked(mocks.unlockWithAccountPassword).mockResolvedValue(session);
    vi.mocked(mocks.migrateLegacyVaultToAccountPassword).mockResolvedValue(session);
    vi.mocked(mocks.signInWithFirebase).mockResolvedValue({ uid: 'user-1', email: 'alice@example.com' });
    vi.mocked(mocks.registerWithFirebase).mockResolvedValue({ uid: 'user-2', email: 'new@example.com' });
    vi.mocked(mocks.getCurrentAuthUser).mockReturnValue(null);
    vi.mocked(mocks.getVaultKeyHash).mockResolvedValue('vault-hash');
    vi.mocked(mocks.clearFailedAttempts).mockResolvedValue(undefined);
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { _setMasterKey: mocks.setMasterKey },
    });
  });

  it('uses the Firebase account password as the only primary unlock credential', async () => {
    const onSuccess = vi.fn();
    render(<AuthScreen status="new" onSuccess={onSuccess} />);

    expect(screen.queryByText(/Senha Mestre|Master Password/i)).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('auth.emailPlaceholder'), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('auth.accountPasswordPlaceholder'), {
      target: { value: 'account-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.signInToAccount' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(signInWithFirebase).toHaveBeenCalledWith('alice@example.com', 'account-password');
    expect(unlockWithAccountPassword).toHaveBeenCalledWith('account-password');
    expect(clearFailedAttempts).toHaveBeenCalledOnce();
  });

  it('shows the previous credential step only when verified keys need migration', async () => {
    vi.mocked(unlockWithAccountPassword).mockRejectedValueOnce(new LegacyVaultMigrationRequired('device'));
    const onSuccess = vi.fn();
    render(<AuthScreen status="encrypted" onSuccess={onSuccess} />);

    fireEvent.change(screen.getByPlaceholderText('auth.emailPlaceholder'), {
      target: { value: 'alice@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('auth.accountPasswordPlaceholder'), {
      target: { value: 'account-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.signInToAccount' }));

    const previousCredential = await screen.findByPlaceholderText('auth.previousCredentialPlaceholder');
    fireEvent.change(previousCredential, { target: { value: 'previous-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.migrateAndUnlock' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(migrateLegacyVaultToAccountPassword).toHaveBeenCalledWith('account-password', 'previous-password');
  });

  it('remembers email on opt-in, renders only masked start/end on reopen, and submits real email', async () => {
    const onSuccess = vi.fn();
    const { unmount } = render(<AuthScreen status="encrypted" onSuccess={onSuccess} />);

    fireEvent.change(screen.getByPlaceholderText('auth.emailPlaceholder'), {
      target: { value: 'abcdef@example.com' },
    });
    fireEvent.click(screen.getByLabelText('auth.rememberEmail'));
    fireEvent.change(screen.getByPlaceholderText('auth.accountPasswordPlaceholder'), {
      target: { value: 'account-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.signInToAccount' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(localStorage.getItem('synapse_remembered_email')).toBe('abcdef@example.com');
    unmount();

    // Reopen unlock screen: full email must NOT appear, only masked format abc*****.com
    const onReopenSuccess = vi.fn();
    render(<AuthScreen status="encrypted" onSuccess={onReopenSuccess} />);

    const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
    expect(emailInput.value).toBe('abc*****.com');
    expect(screen.queryByDisplayValue('abcdef@example.com')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('auth.accountPasswordPlaceholder'), {
      target: { value: 'account-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.signInToAccount' }));

    await waitFor(() => expect(onReopenSuccess).toHaveBeenCalledOnce());
    expect(signInWithFirebase).toHaveBeenLastCalledWith('abcdef@example.com', 'account-password');
  });

  it('allows switching away from masked email without revealing full address and clears when unchecked', () => {
    localStorage.setItem('synapse_remembered_email', 'abcdef@example.com');
    render(<AuthScreen status="encrypted" onSuccess={vi.fn()} />);

    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('abc*****.com');
    fireEvent.click(screen.getByRole('button', { name: 'auth.changeEmail' }));

    const editableEmail = screen.getByPlaceholderText('auth.emailPlaceholder') as HTMLInputElement;
    expect(editableEmail.value).toBe('');

    fireEvent.click(screen.getByLabelText('auth.rememberEmail'));
    expect(localStorage.getItem('synapse_remembered_email')).toBeNull();
  });
});
