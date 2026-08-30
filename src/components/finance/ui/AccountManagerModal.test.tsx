import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AccountManagerModal } from './AccountManagerModal';
import type { Account } from '../../../types';

describe('AccountManagerModal Component', () => {
  const mockAccounts: Account[] = [
    {
      id: 'acc_1',
      name: 'Nubank',
      color: '#8a05be',
      initial_balance: 1000,
      created_at: '2026-08-01',
    },
  ];

  it('renders accounts list and allows creating a new account', async () => {
    const onClose = vi.fn();
    const onCreateAccount = vi.fn().mockResolvedValue(undefined);
    const onUpdateAccount = vi.fn().mockResolvedValue(undefined);
    const onDeleteAccount = vi.fn().mockResolvedValue(undefined);

    render(
      <AccountManagerModal
        accounts={mockAccounts}
        onClose={onClose}
        onCreateAccount={onCreateAccount}
        onUpdateAccount={onUpdateAccount}
        onDeleteAccount={onDeleteAccount}
      />
    );

    expect(screen.getByText('Nubank')).toBeInTheDocument();

    // Click "Nova Conta"
    fireEvent.click(screen.getByRole('button', { name: /Nova Conta/i }));

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Ex: Nubank, Itaú, Carteira.../i), {
      target: { value: 'Inter' },
    });
    fireEvent.change(screen.getByPlaceholderText('0.00'), {
      target: { value: '250.50' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Criar Conta' }));

    await waitFor(() => {
      expect(onCreateAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Inter',
          initial_balance: 250.5,
        })
      );
    });
  });
});
