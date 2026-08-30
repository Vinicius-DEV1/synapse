import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccountCards, calculateAccountBalance } from './AccountCards';
import type { Account, Transaction } from '../../../types';

describe('AccountCards Component and balance calculations', () => {
  const mockAccounts: Account[] = [
    {
      id: 'acc_nubank',
      name: 'Nubank',
      color: '#8a05be',
      initial_balance: 1000,
      created_at: '2026-08-01',
    },
    {
      id: 'acc_bradesco',
      name: 'Bradesco',
      color: '#dc2626',
      initial_balance: 500,
      created_at: '2026-08-01',
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 't1',
      description: 'Salário',
      amount: 3000,
      type: 'income',
      category: 'Salário',
      date: '2026-08-05',
      account_id: 'acc_nubank',
      status: 'completed',
      created_at: '2026-08-05',
    },
    {
      id: 't2',
      description: 'Supermercado',
      amount: 400,
      type: 'expense',
      category: 'Mercado',
      date: '2026-08-10',
      account_id: 'acc_nubank',
      status: 'completed',
      created_at: '2026-08-10',
    },
    {
      id: 't3',
      description: 'Transferência para Bradesco',
      amount: 1000,
      type: 'transfer',
      category: 'Transferência',
      date: '2026-08-12',
      account_id: 'acc_nubank',
      destination_account_id: 'acc_bradesco',
      status: 'completed',
      created_at: '2026-08-12',
    },
  ];

  it('calculates individual account balances including transfers correctly', () => {
    // Nubank: initial 1000 + 3000 (income) - 400 (expense) - 1000 (transfer out) = 2600
    const nubankBal = calculateAccountBalance(mockAccounts[0], mockTransactions);
    expect(nubankBal).toBe(2600);

    // Bradesco: initial 500 + 1000 (transfer in) = 1500
    const bradescoBal = calculateAccountBalance(mockAccounts[1], mockTransactions);
    expect(bradescoBal).toBe(1500);
  });

  it('renders account cards with correct amounts and allows selection', () => {
    const onSelectAccount = vi.fn();
    const onOpenAccountManager = vi.fn();

    render(
      <AccountCards
        accounts={mockAccounts}
        transactions={mockTransactions}
        selectedAccountId="all"
        onSelectAccount={onSelectAccount}
        onOpenAccountManager={onOpenAccountManager}
      />
    );

    // Total consolidated: 2600 + 1500 = 4100
    expect(screen.getByText('R$ 4100.00')).toBeInTheDocument();
    expect(screen.getByText('R$ 2600.00')).toBeInTheDocument();
    expect(screen.getByText('R$ 1500.00')).toBeInTheDocument();

    // Click Nubank card
    fireEvent.click(screen.getByText('Nubank'));
    expect(onSelectAccount).toHaveBeenCalledWith('acc_nubank');

    // Click manage button
    fireEvent.click(screen.getByRole('button', { name: /Gerenciar Bancos/i }));
    expect(onOpenAccountManager).toHaveBeenCalled();
  });
});
