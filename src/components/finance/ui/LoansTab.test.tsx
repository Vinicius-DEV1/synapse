import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoansTab } from './LoansTab';
import type { Transaction } from '../../../types';

describe('LoansTab component', () => {
  const mockLoans: Transaction[] = [
    {
      id: 'loan-1',
      description: 'Empréstimo para João',
      amount: 1000,
      paid_amount: 400,
      type: 'loan_made',
      category: 'Pessoal',
      date: '2026-08-20',
      status: 'in_progress',
      is_paid: 0,
      created_at: '2026-08-20',
    },
    {
      id: 'loan-2',
      description: 'Dívida Cartão de Crédito',
      amount: 500,
      paid_amount: 500,
      type: 'loan_taken',
      category: 'Bancos',
      date: '2026-08-15',
      status: 'completed',
      is_paid: 1,
      created_at: '2026-08-15',
    },
  ];

  it('renders summary cards with correct amounts', () => {
    const onAddLoan = vi.fn();
    const onPayLoan = vi.fn();
    const onMarkAsPaid = vi.fn();
    const onReopenLoan = vi.fn();
    const onEditLoan = vi.fn();
    const onDeleteLoan = vi.fn();

    render(
      <LoansTab
        loans={mockLoans}
        onAddLoan={onAddLoan}
        onPayLoan={onPayLoan}
        onMarkAsPaid={onMarkAsPaid}
        onReopenLoan={onReopenLoan}
        onEditLoan={onEditLoan}
        onDeleteLoan={onDeleteLoan}
      />
    );

    // To Receive: 1000 - 400 = 600
    expect(screen.getByText('R$ 600.00')).toBeInTheDocument();
    // To Pay: 500 - 500 = 0
    expect(screen.getByText('R$ 0.00')).toBeInTheDocument();

    // Descriptions
    expect(screen.getByText('Empréstimo para João')).toBeInTheDocument();
    expect(screen.getByText('Dívida Cartão de Crédito')).toBeInTheDocument();
  });

  it('filters loans by direction and status', () => {
    const onAddLoan = vi.fn();
    const onPayLoan = vi.fn();
    const onMarkAsPaid = vi.fn();
    const onReopenLoan = vi.fn();
    const onEditLoan = vi.fn();
    const onDeleteLoan = vi.fn();

    render(
      <LoansTab
        loans={mockLoans}
        onAddLoan={onAddLoan}
        onPayLoan={onPayLoan}
        onMarkAsPaid={onMarkAsPaid}
        onReopenLoan={onReopenLoan}
        onEditLoan={onEditLoan}
        onDeleteLoan={onDeleteLoan}
      />
    );

    // Filter "A Receber"
    fireEvent.click(screen.getByRole('button', { name: 'A Receber' }));
    expect(screen.getByText('Empréstimo para João')).toBeInTheDocument();
    expect(screen.queryByText('Dívida Cartão de Crédito')).not.toBeInTheDocument();

    // Filter "A Pagar (Dívidas)"
    fireEvent.click(screen.getByRole('button', { name: 'A Pagar (Dívidas)' }));
    expect(screen.queryByText('Empréstimo para João')).not.toBeInTheDocument();
    expect(screen.getByText('Dívida Cartão de Crédito')).toBeInTheDocument();
  });

  it('handles action buttons correctly', () => {
    const onAddLoan = vi.fn();
    const onPayLoan = vi.fn();
    const onMarkAsPaid = vi.fn();
    const onReopenLoan = vi.fn();
    const onEditLoan = vi.fn();
    const onDeleteLoan = vi.fn();

    render(
      <LoansTab
        loans={mockLoans}
        onAddLoan={onAddLoan}
        onPayLoan={onPayLoan}
        onMarkAsPaid={onMarkAsPaid}
        onReopenLoan={onReopenLoan}
        onEditLoan={onEditLoan}
        onDeleteLoan={onDeleteLoan}
      />
    );

    // Abater valor
    const payBtn = screen.getByRole('button', { name: /Abater Valor/i });
    fireEvent.click(payBtn);
    expect(onPayLoan).toHaveBeenCalledWith(mockLoans[0]);

    // Quitar total
    const markPaidBtn = screen.getByRole('button', { name: /Quitar Total/i });
    fireEvent.click(markPaidBtn);
    expect(onMarkAsPaid).toHaveBeenCalledWith('loan-1');

    // Reabrir empréstimo
    const reopenBtn = screen.getByRole('button', { name: /Reabrir Empréstimo/i });
    fireEvent.click(reopenBtn);
    expect(onReopenLoan).toHaveBeenCalledWith('loan-2');

    // Editar empréstimo
    const editBtns = screen.getAllByTitle('Editar Empréstimo');
    fireEvent.click(editBtns[0]);
    expect(onEditLoan).toHaveBeenCalledWith(mockLoans[0]);
  });

  it('displays overdue alerts and filters overdue loans', () => {
    const overdueLoans: Transaction[] = [
      {
        id: 'overdue-1',
        description: 'Empréstimo Atrasado',
        amount: 200,
        paid_amount: 0,
        type: 'loan_taken',
        category: 'Contas',
        date: '2026-08-01',
        due_date: '2026-08-10', // Clearly in the past
        status: 'in_progress',
        is_paid: 0,
        created_at: '2026-08-01',
      },
    ];

    render(
      <LoansTab
        loans={overdueLoans}
        onAddLoan={vi.fn()}
        onPayLoan={vi.fn()}
        onMarkAsPaid={vi.fn()}
        onReopenLoan={vi.fn()}
        onEditLoan={vi.fn()}
        onDeleteLoan={vi.fn()}
      />
    );

    expect(screen.getByText(/Vencido há/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vencidos/i })).toBeInTheDocument();
  });

  it('correctly calculates summary and displays loan with interest (expected_amount)', () => {
    const loanWithInterest: Transaction[] = [
      {
        id: 'interest-1',
        description: 'Empréstimo com Juros',
        amount: 500,
        expected_amount: 600,
        paid_amount: 100,
        type: 'loan_made',
        category: 'Pessoal',
        date: '2026-08-20',
        status: 'in_progress',
        is_paid: 0,
        created_at: '2026-08-20',
      },
    ];

    render(
      <LoansTab
        loans={loanWithInterest}
        onAddLoan={vi.fn()}
        onPayLoan={vi.fn()}
        onMarkAsPaid={vi.fn()}
        onReopenLoan={vi.fn()}
        onEditLoan={vi.fn()}
        onDeleteLoan={vi.fn()}
      />
    );

    // Pending should be 600 - 100 = 500.00
    expect(screen.getByText('R$ 500.00')).toBeInTheDocument();
    // Principal should be displayed in the card badge
    expect(screen.getByText('Principal: R$ 500.00')).toBeInTheDocument();
    // Total with interest should be displayed
    expect(screen.getByText(/de R\$ 600\.00/i)).toBeInTheDocument();
  });
});

