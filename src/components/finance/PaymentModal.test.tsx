import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaymentModal from './PaymentModal';
import type { Transaction, Account } from '../../types';

vi.mock('../ui/ToastContext', () => ({
  triggerToast: vi.fn(),
}));

describe('PaymentModal', () => {
  const mockAccounts: Account[] = [
    { id: 'acc_1', name: 'Carteira Principal', type: 'wallet', balance: 500, color: '#10b981', is_active: 1, created_at: '', updated_at: '' },
    { id: 'acc_2', name: 'Bradesco', type: 'checking', balance: 1000, color: '#3b82f6', is_active: 1, created_at: '', updated_at: '' },
  ];

  const mockLoanMade: Transaction = {
    id: 'loan_1',
    description: 'Empréstimo João',
    amount: 600,
    expected_amount: 600,
    paid_amount: 150,
    type: 'loan_made',
    category: 'Empréstimos',
    date: '2026-11-01',
    account_id: 'acc_1',
    is_paid: 0,
    status: 'in_progress',
  };

  it('renders loan information, pending amount and handles partial payment submission with date', async () => {
    const handlePayLoanWithAccount = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <PaymentModal
        transaction={mockLoanMade}
        accounts={mockAccounts}
        onClose={handleClose}
        onPayLoanWithAccount={handlePayLoanWithAccount}
      />
    );

    // Verify title and description
    expect(screen.getByText('Registrar Recebimento')).toBeInTheDocument();
    expect(screen.getByText('Empréstimo João')).toBeInTheDocument();
    // 600 - 150 = 450 pending
    expect(screen.getByText('R$ 450.00')).toBeInTheDocument();

    // Fill partial amount
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '200' } });

    // Fill custom payment date
    const dateInput = screen.getByLabelText(/Data do Pagamento/i) || screen.getByDisplayValue(new Date().toISOString().split('T')[0]);
    fireEvent.change(dateInput, { target: { value: '2026-11-05' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handlePayLoanWithAccount).toHaveBeenCalledWith(
        mockLoanMade,
        200,
        'acc_1',
        '2026-11-05'
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('fills full pending amount when clicking "Receber Total"', async () => {
    render(
      <PaymentModal
        transaction={mockLoanMade}
        accounts={mockAccounts}
        onClose={vi.fn()}
        onPayLoanWithAccount={vi.fn()}
      />
    );

    const fullBtn = screen.getByRole('button', { name: /receber total/i });
    fireEvent.click(fullBtn);

    const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    expect(amountInput.value).toBe('450.00');
  });
});
