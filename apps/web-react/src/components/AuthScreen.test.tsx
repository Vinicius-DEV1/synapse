import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import AuthScreen from './AuthScreen';

vi.mock('../store/useStore', () => ({
  useStore: vi.fn(() => ({
    dispatch: vi.fn(),
  })),
}));

vi.mock('../services/sync', () => ({
  initializeCloudValidator: vi.fn(),
  verifyCloudMasterPassword: vi.fn().mockResolvedValue(true),
  pushModularKeysToCloud: vi.fn(),
  pullModularKeysFromCloud: vi.fn().mockResolvedValue(null),
  getSecurityLock: vi.fn().mockResolvedValue({ failedAttempts: 0, lastFailedAt: 0 }),
  recordFailedAttempt: vi.fn(),
  clearFailedAttempts: vi.fn(),
}));

vi.mock('../services/crypto', () => ({
  deriveMasterKey: vi.fn().mockResolvedValue({} as CryptoKey),
  exportKeyToHex: vi.fn().mockResolvedValue('deadbeef'),
  importHexKey: vi.fn().mockResolvedValue({} as CryptoKey),
}));

vi.mock('../services/vault-crypto', () => ({
  getVaultKeyHash: vi.fn().mockResolvedValue('hash123'),
}));

vi.mock('../services/drive', () => ({
  setDriveMasterKey: vi.fn(),
}));

const mockSignIn = vi.fn().mockResolvedValue({ uid: 'user_123', email: 'test@example.com' });
const mockRegister = vi.fn().mockResolvedValue({ uid: 'user_456', email: 'new@example.com' });

vi.mock('../services/auth/firebase-auth', () => ({
  signInWithFirebase: (...args: unknown[]) => mockSignIn(...args),
  registerWithFirebase: (...args: unknown[]) => mockRegister(...args),
  resetFirebasePassword: vi.fn().mockResolvedValue(undefined),
}));

describe('AuthScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      auth: {
        login: vi.fn().mockResolvedValue({ success: true, keys: {} }),
        forceUpdateKeychain: vi.fn().mockResolvedValue({ success: true }),
      },
    };
  });

  it('renders setup form for new vault in English by default', () => {
    const onSuccess = vi.fn();
    const { getByPlaceholderText, getByText } = render(
      <AuthScreen status="new" onSuccess={onSuccess} />
    );

    expect(getByPlaceholderText(/Enter master password.../i)).toBeDefined();
    expect(getByText(/Set Password/i)).toBeDefined();
  });

  it('renders unlock form for encrypted vault and submits', async () => {
    const onSuccess = vi.fn();
    const { getByPlaceholderText, getByRole } = render(
      <AuthScreen status="encrypted" onSuccess={onSuccess} />
    );

    const input = getByPlaceholderText(/Enter master password.../i);
    fireEvent.change(input, { target: { value: 'minha-senha-segura-123' } });

    const submitBtn = getByRole('button', { name: /Unlock/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('switches to Conta Nuvem and submits login', async () => {
    const onSuccess = vi.fn();
    const { getByText, getByPlaceholderText, getByRole } = render(
      <AuthScreen status="encrypted" onSuccess={onSuccess} />
    );

    const cloudTab = getByText(/Conta Nuvem/i);
    fireEvent.click(cloudTab);

    const emailInput = getByPlaceholderText(/seu.email@exemplo.com/i);
    const passwordInput = getByPlaceholderText(/Mínimo 6 caracteres/i);

    fireEvent.change(emailInput, { target: { value: 'alice@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'senhaForte123' } });

    const loginBtn = getByRole('button', { name: /Entrar na Conta/i });
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('alice@example.com', 'senhaForte123');
    });
  });
});
