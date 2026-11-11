import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PageUnlockForm } from './PageUnlockForm';
import { I18nProvider } from '../../i18n';
import type { Page } from '../../types';
import * as cryptoService from '../../services/crypto';
import * as toastModule from '../ui/ToastContext';

vi.mock('../ui/ToastContext', () => ({
  triggerToast: vi.fn(),
}));

describe('PageUnlockForm', () => {
  const mockPage: Page = {
    id: 'page_locked',
    title: 'Página Protegida',
    icon: '🔒',
    parent_id: null,
    sort_order: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    is_locked: 1,
    password_salt: 'test-salt',
  };

  const onUnlockSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders locked page indicator and password input in Portuguese', () => {
    render(
      <I18nProvider initialLanguage="pt-BR">
        <PageUnlockForm
          page={mockPage}
          encryptedContent="encrypted_base64_data"
          onUnlockSuccess={onUnlockSuccess}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Página Trancada')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Senha da página')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Desbloquear/i })).toBeInTheDocument();
  });

  it('renders locked page indicator and password input in English', () => {
    render(
      <I18nProvider initialLanguage="en">
        <PageUnlockForm
          page={mockPage}
          encryptedContent="encrypted_base64_data"
          onUnlockSuccess={onUnlockSuccess}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Locked Page')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Page password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unlock/i })).toBeInTheDocument();
  });

  it('shows error toast if submitted with empty password', async () => {
    render(
      <I18nProvider initialLanguage="pt-BR">
        <PageUnlockForm
          page={mockPage}
          encryptedContent="encrypted_base64_data"
          onUnlockSuccess={onUnlockSuccess}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Desbloquear/i }));

    expect(toastModule.triggerToast).toHaveBeenCalledWith('Digite a senha da página.', 'error');
    expect(onUnlockSuccess).not.toHaveBeenCalled();
  });

  it('successfully decrypts and calls onUnlockSuccess with decrypted text', async () => {
    const mockKey = {} as CryptoKey;
    vi.spyOn(cryptoService, 'deriveMasterKey').mockResolvedValue(mockKey);
    vi.spyOn(cryptoService, 'decryptText').mockResolvedValue('<p>Conteúdo Secreto</p>');

    render(
      <I18nProvider initialLanguage="pt-BR">
        <PageUnlockForm
          page={mockPage}
          encryptedContent="valid_encrypted_base64"
          onUnlockSuccess={onUnlockSuccess}
        />
      </I18nProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('Senha da página'), {
      target: { value: 'minhasenha123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Desbloquear/i }));

    await waitFor(() => {
      expect(cryptoService.deriveMasterKey).toHaveBeenCalledWith('minhasenha123', 'test-salt');
      expect(cryptoService.decryptText).toHaveBeenCalledWith('valid_encrypted_base64', mockKey);
      expect(toastModule.triggerToast).toHaveBeenCalledWith('Página desbloqueada!', 'success');
      expect(onUnlockSuccess).toHaveBeenCalledWith('<p>Conteúdo Secreto</p>');
    });
  });

  it('shows error toast when password decryption fails', async () => {
    const mockKey = {} as CryptoKey;
    vi.spyOn(cryptoService, 'deriveMasterKey').mockResolvedValue(mockKey);
    vi.spyOn(cryptoService, 'decryptText').mockRejectedValue(new Error('Ciphertext integrity check failed'));

    render(
      <I18nProvider initialLanguage="pt-BR">
        <PageUnlockForm
          page={mockPage}
          encryptedContent="valid_encrypted_base64"
          onUnlockSuccess={onUnlockSuccess}
        />
      </I18nProvider>
    );

    fireEvent.change(screen.getByPlaceholderText('Senha da página'), {
      target: { value: 'senhaerrada' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Desbloquear/i }));

    await waitFor(() => {
      expect(toastModule.triggerToast).toHaveBeenCalledWith('Senha incorreta!', 'error');
      expect(onUnlockSuccess).not.toHaveBeenCalled();
    });
  });
});
