import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import FinanceView from './FinanceView';
import type { Tab } from '../../types';
import { I18nProvider } from '../../i18n';

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider initialLanguage="pt-BR">{ui}</I18nProvider>);

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
    (window as unknown as { api: unknown }).api = {
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
    renderWithI18n(<FinanceView tab={makeTab('dashboard')} />);

    await waitFor(() => {
      expect(screen.getByText('Finanças Pessoais')).toBeInTheDocument();
      expect(screen.getByText('Nova Transação')).toBeInTheDocument();
    });
  });

  it('renders loans section when tab pageId is loans', async () => {
    renderWithI18n(<FinanceView tab={makeTab('loans')} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'A Receber' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'A Pagar (Dívidas)' })).toBeInTheDocument();
    });
  });

  it('renders transactions section when tab pageId is transactions', async () => {
    renderWithI18n(<FinanceView tab={makeTab('transactions')} />);

    await waitFor(() => {
      expect(screen.getByText('Salário')).toBeInTheDocument();
    });
  });

  it('renders wishlist section when tab pageId is wishlist', async () => {
    renderWithI18n(<FinanceView tab={makeTab('wishlist')} />);

    await waitFor(() => {
      expect(screen.getByText('Adicionar Desejo')).toBeInTheDocument();
    });
  });

  it('defaults to dashboard when pageId is null', async () => {
    renderWithI18n(<FinanceView tab={makeTab(null)} />);

    await waitFor(() => {
      expect(screen.getByText('Finanças Pessoais')).toBeInTheDocument();
      expect(screen.getByText('Nova Transação')).toBeInTheDocument();
    });
  });

  it('opens custom in-app confirmation modal when deleting wishlist item', async () => {
    const mockDelete = vi.fn().mockResolvedValue(true);
    (window as unknown as { api: { finance: { getWishlist: unknown; deleteWishlist: unknown } } }).api.finance.getWishlist = vi.fn().mockResolvedValue([
      {
        id: 'wish-1',
        title: 'Monitor 4K',
        price: 1500,
        priority: 'high',
        category: 'Trabalho',
        created_at: new Date().toISOString(),
      },
    ]);
    (window as unknown as { api: { finance: { deleteWishlist: unknown } } }).api.finance.deleteWishlist = mockDelete;

    renderWithI18n(<FinanceView tab={makeTab('wishlist')} />);

    // Expand category
    await waitFor(() => {
      expect(screen.getByText('Trabalho')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Trabalho'));

    await waitFor(() => {
      expect(screen.getByText('Monitor 4K')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle('Excluir Desejo');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText('Excluir Item dos Desejos')).toBeInTheDocument();
      expect(screen.getByText(/Tem certeza que deseja apagar este desejo\?/i)).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: /^Excluir$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('wish-1');
    });
  });
});

