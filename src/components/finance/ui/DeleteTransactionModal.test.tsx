import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteTransactionModal } from './DeleteTransactionModal';
import type { Transaction } from '../../../types';

describe('DeleteTransactionModal Component', () => {
  const mockTx: Transaction = {
    id: 'tx_123',
    description: 'Conta de Energia',
    amount: 180.5,
    type: 'expense',
    category: 'Moradia',
    date: '2026-08-25',
    created_at: '2026-08-25',
  };

  it('renders modal with transaction information and handles confirm', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <DeleteTransactionModal
        transaction={mockTx}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Excluir Transação')).toBeInTheDocument();
    expect(screen.getByText('Conta de Energia')).toBeInTheDocument();
    expect(screen.getByText('- R$ 180.50')).toBeInTheDocument();

    // Click confirm button
    const deleteBtn = screen.getByRole('button', { name: /Sim, Excluir/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('tx_123');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('handles cancel button click', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteTransactionModal
        transaction={mockTx}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders contextual title and warning for linked loan payment', () => {
    const linkedTx: Transaction = {
      id: 'tx_linked',
      description: 'Recebimento: Empréstimo',
      amount: 300,
      type: 'income',
      category: 'Recebimento de Empréstimo',
      date: '2026-08-25',
      linked_loan_id: 'loan_parent_123',
    };

    render(
      <DeleteTransactionModal
        transaction={linkedTx}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Excluir Pagamento de Empréstimo')).toBeInTheDocument();
    expect(screen.getByText(/estornado/i)).toBeInTheDocument();
  });

  it('renders contextual title for loan parent item', () => {
    const loanTx: Transaction = {
      id: 'loan_1',
      description: 'Empréstimo Amigo',
      amount: 1000,
      type: 'loan_made',
      category: 'Geral',
      date: '2026-08-25',
    };

    render(
      <DeleteTransactionModal
        transaction={loanTx}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Excluir Empréstimo / Dívida')).toBeInTheDocument();
  });
});
