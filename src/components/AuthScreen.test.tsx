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

describe('AuthScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      auth: {
        forceUpdateKeychain: vi.fn().mockResolvedValue({ success: true }),
      },
    };
  });

  it('renders setup form for new vault', () => {
    const onSuccess = vi.fn();
    const { getByPlaceholderText, getByText } = render(
      <AuthScreen status="new" onSuccess={onSuccess} />
    );

    expect(getByPlaceholderText(/Digite sua senha mestre/i)).toBeDefined();
    expect(getByText(/Criar Senha Mestre/i)).toBeDefined();
  });

  it('renders unlock form for encrypted vault and submits', async () => {
    const onSuccess = vi.fn();
    const { getByPlaceholderText, getByRole } = render(
      <AuthScreen status="encrypted" onSuccess={onSuccess} />
    );

    const input = getByPlaceholderText(/Digite sua senha mestre/i);
    fireEvent.change(input, { target: { value: 'minha-senha-segura-123' } });

    const submitBtn = getByRole('button', { name: /Desbloquear/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
