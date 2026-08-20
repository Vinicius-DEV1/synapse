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
            is_paid: true,
          },
        ]),
        getWishlist: vi.fn().mockResolvedValue([]),
        createTransaction: vi.fn(),
        updateTransaction: vi.fn(),
        deleteTransaction: vi.fn(),
      },
    };
  });

  it('renders finance dashboard with metrics and tab switcher', async () => {
    render(<FinanceView />);

    await waitFor(() => {
      expect(screen.getByText('Visão Geral')).toBeInTheDocument();
      expect(screen.getByText('Transações & Empréstimos')).toBeInTheDocument();
      expect(screen.getByText('Desejos & Futuro')).toBeInTheDocument();
      expect(screen.getByText('Nova Transação')).toBeInTheDocument();
    });
  });

  it('switches tabs to transactions and wishlist', async () => {
    render(<FinanceView />);

    await waitFor(() => {
      expect(screen.getByText('Desejos & Futuro')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Desejos & Futuro'));
    await waitFor(() => {
      expect(screen.getByText('Adicionar Desejo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Transações & Empréstimos'));
    await waitFor(() => {
      expect(screen.getByText('Nova Transação')).toBeInTheDocument();
    });
  });
});
