import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FinanceView from './FinanceView';

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

  it('renders finance dashboard with metrics and tab switcher', async () => {
    render(<FinanceView />);

    await waitFor(() => {
      expect(screen.getByText('Visão Geral')).toBeInTheDocument();
      expect(screen.getByText(/Transações/i)).toBeInTheDocument();
      expect(screen.getByText(/Empréstimos & Dívidas/i)).toBeInTheDocument();
      expect(screen.getByText(/Desejos & Futuro/i)).toBeInTheDocument();
      expect(screen.getByText('Nova Transação')).toBeInTheDocument();
    });
  });

  it('switches tabs to loans, transactions and wishlist', async () => {
    render(<FinanceView />);

    await waitFor(() => {
      expect(screen.getByText(/Desejos & Futuro/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Desejos & Futuro/i));
    await waitFor(() => {
      expect(screen.getByText('Adicionar Desejo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Empréstimos & Dívidas/i));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'A Receber' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'A Pagar (Dívidas)' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Transações/i));
    await waitFor(() => {
      expect(screen.getByText('Salário')).toBeInTheDocument();
    });
  });
});

