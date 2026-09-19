import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FinanceView from './FinanceView';
import type { Tab } from '../../types';

/** Helper to build a minimal finance tab with a given pageId. */
function makeTab(pageId: string | null = null): Tab {
  return {
    id: 'tab-finance',
    module: 'finance',
    pageId,
    unsavedContent: null,
    scrollY: 0,
  };
}

describe('FinanceView component', () => {
  beforeEach(() => {
    (window as any).api = {
      finance: {
        getTransactions: vi.fn().mockResolvedValue([
          {
            id: 'tx-1',
            description: 'Salário',
            amount: 5000,
            type: 'income',
            category: 'Trabalho',
            date: new Date().toISOString(),
            account_id: 'acc-1',
            is_paid: true,
          },
        ]),
        getWishlist: vi.fn().mockResolvedValue([]),
        getAccounts: vi.fn().mockResolvedValue([
          {
            id: 'acc-1',
            name: 'Carteira Principal',
            color: '#10b981',
            icon: 'wallet',
            initial_balance: 0,
            created_at: '2026-08-01',
          }
        ]),
        createTransaction: vi.fn(),
        updateTransaction: vi.fn(),
        deleteTransaction: vi.fn(),
        createAccount: vi.fn(),
        updateAccount: vi.fn(),
        deleteAccount: vi.fn(),
      },
    };
  });

  it('renders finance dashboard with header and action buttons', async () => {
    render(<FinanceView tab={makeTab('dashboard')} />);

    await waitFor(() => {
      expect(screen.getByText('Finanças Pessoais')).toBeInTheDocument();
      expect(screen.getByText('Nova Transação')).toBeInTheDocument();
    });
  });

  it('renders loans section when tab pageId is loans', async () => {
    render(<FinanceView tab={makeTab('loans')} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'A Receber' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'A Pagar (Dívidas)' })).toBeInTheDocument();
    });
  });

  it('renders transactions section when tab pageId is transactions', async () => {
    render(<FinanceView tab={makeTab('transactions')} />);

    await waitFor(() => {
      expect(screen.getByText('Salário')).toBeInTheDocument();
    });
  });

  it('renders wishlist section when tab pageId is wishlist', async () => {
    render(<FinanceView tab={makeTab('wishlist')} />);

    await waitFor(() => {
      expect(screen.getByText('Adicionar Desejo')).toBeInTheDocument();
    });
  });

  it('defaults to dashboard when pageId is null', async () => {
    render(<FinanceView tab={makeTab(null)} />);

    await waitFor(() => {
      expect(screen.getByText('Finanças Pessoais')).toBeInTheDocument();
      expect(screen.getByText('Nova Transação')).toBeInTheDocument();
    });
  });
});

