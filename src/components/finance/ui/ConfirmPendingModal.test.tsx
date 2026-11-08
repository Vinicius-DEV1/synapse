import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmPendingModal } from './ConfirmPendingModal';
import type { Transaction, Account } from '../../../types';

const mockAccounts: Account[] = [
  { id: 'acc-1', name: 'Nubank', initial_balance: 1000, created_at: '2026-01-01' },
];

const mockPendingTx: Transaction = {
  id: 'tx-pending-1',
  type: 'expense',
  amount: 85.5,
  description: 'Exame de Sangue',
  category: 'Saúde',
  date: '2026-11-09',
  status: 'pending',
  is_paid: 0,
  account_id: 'acc-1',
  created_at: '2026-11-08',
};

describe('ConfirmPendingModal', () => {
  it('renders prefilled pending transaction information and submits confirmed values', async () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <ConfirmPendingModal
        isOpen={true}
        transaction={mockPendingTx}
        accounts={mockAccounts}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    );

    expect(screen.getByText('Efetivar Transação')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Exame de Sangue')).toBeInTheDocument();
    expect(screen.getByDisplayValue('85.5')).toBeInTheDocument();

    // Confirm button
    const confirmBtn = screen.getByRole('button', { name: /confirmar e efetivar/i });
    fireEvent.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledWith('tx-pending-1', expect.objectContaining({
      amount: 85.5,
      description: 'Exame de Sangue',
      category: 'Saúde',
      accountId: 'acc-1',
    }));
  });
});
