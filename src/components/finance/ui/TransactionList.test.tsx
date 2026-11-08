import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionList } from './TransactionList';
import type { Transaction, Account } from '../../../types';
import { I18nProvider } from '../../../i18n';

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider initialLanguage="pt-BR">{ui}</I18nProvider>);

const mockAccounts: Account[] = [
  { id: 'acc_1', name: 'Carteira Principal', color: '#10b981', initial_balance: 100, created_at: '2026-01-01' },
  { id: 'acc_2', name: 'Bradesco', color: '#dc2626', initial_balance: 500, created_at: '2026-01-01' },
];

const mockTransactions: Transaction[] = [
  {
    id: 'tx_1',
    description: 'Salário Empresa',
    amount: 5000,
    type: 'income',
    category: 'Trabalho',
    date: '2026-10-15',
    account_id: 'acc_1',
    status: 'completed',
    created_at: '2026-10-15T10:00:00Z',
  },
  {
    id: 'tx_2',
    description: 'Supermercado Central',
    amount: 350.5,
    type: 'expense',
    category: 'Alimentação',
    date: '2026-10-18',
    account_id: 'acc_1',
    status: 'completed',
    created_at: '2026-10-18T15:00:00Z',
  },
  {
    id: 'tx_3',
    description: 'Transferência Reserva',
    amount: 1000,
    type: 'transfer',
    category: 'Transferência',
    date: '2026-10-20',
    account_id: 'acc_1',
    destination_account_id: 'acc_2',
    status: 'completed',
    created_at: '2026-10-20T12:00:00Z',
  },
  {
    id: 'tx_4',
    description: 'Empréstimo Amigo',
    amount: 600,
    type: 'loan_made',
    category: 'Empréstimo',
    date: '2026-10-22',
    account_id: 'acc_2',
    is_paid: 0,
    paid_amount: 100,
    status: 'in_progress',
    created_at: '2026-10-22T09:00:00Z',
  },
];

describe('TransactionList Component', () => {
  it('renders transactions list grouped by month and formatted amounts', () => {
    const onDelete = vi.fn();
    const onPayLoan = vi.fn();

    renderWithI18n(
      <TransactionList
        transactions={mockTransactions}
        accounts={mockAccounts}
        onDelete={onDelete}
        onPayLoan={onPayLoan}
      />
    );

    expect(screen.getByText('Salário Empresa')).toBeInTheDocument();
    expect(screen.getByText('Supermercado Central')).toBeInTheDocument();
    expect(screen.getByText('Transferência Reserva')).toBeInTheDocument();
    expect(screen.getByText('Empréstimo Amigo')).toBeInTheDocument();

    // Check formatted values
    expect(screen.getByText('+ R$ 5000.00')).toBeInTheDocument();
    expect(screen.getByText('- R$ 350.50')).toBeInTheDocument();
    expect(screen.getByText('⇄ R$ 1000.00')).toBeInTheDocument();
  });

  it('filters transactions by type button', () => {
    renderWithI18n(
      <TransactionList
        transactions={mockTransactions}
        accounts={mockAccounts}
        onDelete={vi.fn()}
        onPayLoan={vi.fn()}
      />
    );

    // Click 'Entrada (Receita)' filter
    fireEvent.click(screen.getByRole('button', { name: 'Entrada (Receita)' }));
    expect(screen.getByText('Salário Empresa')).toBeInTheDocument();
    expect(screen.queryByText('Supermercado Central')).not.toBeInTheDocument();
    expect(screen.queryByText('Transferência Reserva')).not.toBeInTheDocument();

    // Click 'Saída (Despesa)' filter
    fireEvent.click(screen.getByRole('button', { name: 'Saída (Despesa)' }));
    expect(screen.queryByText('Salário Empresa')).not.toBeInTheDocument();
    expect(screen.getByText('Supermercado Central')).toBeInTheDocument();

    // Click 'Transferência' filter
    fireEvent.click(screen.getByRole('button', { name: 'Transferência' }));
    expect(screen.getByText('Transferência Reserva')).toBeInTheDocument();
    expect(screen.queryByText('Supermercado Central')).not.toBeInTheDocument();

    // Click 'Empréstimos' filter
    fireEvent.click(screen.getByRole('button', { name: 'Empréstimos' }));
    expect(screen.getByText('Empréstimo Amigo')).toBeInTheDocument();
    expect(screen.queryByText('Transferência Reserva')).not.toBeInTheDocument();
  });

  it('filters transactions by search query', () => {
    renderWithI18n(
      <TransactionList
        transactions={mockTransactions}
        accounts={mockAccounts}
        onDelete={vi.fn()}
        onPayLoan={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText('Buscar transações...');
    fireEvent.change(searchInput, { target: { value: 'supermercado' } });

    expect(screen.getByText('Supermercado Central')).toBeInTheDocument();
    expect(screen.queryByText('Salário Empresa')).not.toBeInTheDocument();
  });

  it('invokes edit, delete, and loan payment callbacks', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onPayLoan = vi.fn();

    renderWithI18n(
      <TransactionList
        transactions={mockTransactions}
        accounts={mockAccounts}
        onEdit={onEdit}
        onDelete={onDelete}
        onPayLoan={onPayLoan}
      />
    );

    // Pay loan button
    const payButton = screen.getByRole('button', { name: 'Pagar' });
    fireEvent.click(payButton);
    expect(onPayLoan).toHaveBeenCalledWith(mockTransactions[3]);

    // Delete button for first item (title matches pt.json finance.delete: "Apagar")
    const deleteButtons = screen.getAllByTitle('Apagar');
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith('tx_1');

    // Edit button
    const editButtons = screen.getAllByTitle('Editar Transação');
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(mockTransactions[0]);
  });

  it('renders pinned future/pending transactions and handles confirmation', () => {
    const onConfirmPending = vi.fn();
    const pendingTx: Transaction = {
      id: 'tx_pending_1',
      description: 'Exame Agendado',
      amount: 200,
      type: 'expense',
      category: 'Saúde',
      date: '2026-11-10',
      account_id: 'acc_1',
      is_paid: 0,
      status: 'pending',
      created_at: '2026-11-08',
    };

    renderWithI18n(
      <TransactionList
        transactions={[...mockTransactions, pendingTx]}
        accounts={mockAccounts}
        onDelete={vi.fn()}
        onPayLoan={vi.fn()}
        onConfirmPending={onConfirmPending}
      />
    );

    // Section title
    expect(screen.getByText(/Transações Futuras \/ Pendentes/i)).toBeInTheDocument();
    expect(screen.getByText('Exame Agendado')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();

    // Confirm button
    const confirmBtn = screen.getByRole('button', { name: /efetivar/i });
    fireEvent.click(confirmBtn);
    expect(onConfirmPending).toHaveBeenCalledWith(pendingTx);
  });
});
