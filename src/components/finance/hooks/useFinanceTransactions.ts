import { useCallback } from 'react';
import type { Transaction } from '../../../types';
import { triggerToast } from '../../ui/ToastContext';

export interface UseFinanceTransactionsProps {
  transactions: Transaction[];
  loadData: () => Promise<void>;
}

export function useFinanceTransactions({ transactions, loadData }: UseFinanceTransactionsProps) {
  const createTransaction = useCallback(async (tx: Partial<Transaction>) => {
    if (!window.api?.finance) return;
    try {
      await window.api.finance.createTransaction(tx);
      triggerToast('Transação registrada com sucesso!', 'success');
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao criar transação:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao registrar transação';
      triggerToast(msg, 'error');
    }
  }, [loadData]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (!window.api?.finance) return;
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      try {
        const merged: Transaction = { ...tx, ...updates };
        const isLoan = merged.type === 'loan_made' || merged.type === 'loan_taken';

        // If editing a loan, recalculate is_paid and status based on target total vs paid_amount
        if (isLoan) {
          const targetTotal = Number(merged.expected_amount || merged.amount || 0);
          const currentPaid = Number(merged.paid_amount || 0);
          merged.is_paid = (targetTotal > 0 && currentPaid >= targetTotal - 0.001) ? 1 : 0;
          merged.status = merged.is_paid ? 'completed' : 'in_progress';

          // If the loan description or type changed, synchronize linked payment transactions
          const descChanged = updates.description && updates.description !== tx.description;
          const typeChanged = updates.type && updates.type !== tx.type;

          if (descChanged || typeChanged) {
            const linkedPayments = transactions.filter(t => t.linked_loan_id === id);
            const isLoanMade = merged.type === 'loan_made';

            for (const payment of linkedPayments) {
              const updatedPayment: Partial<Transaction> = {};
              if (descChanged) {
                updatedPayment.description = isLoanMade
                  ? `Recebimento: ${merged.description}`
                  : `Pagamento: ${merged.description}`;
              }
              if (typeChanged) {
                updatedPayment.type = isLoanMade ? 'income' : 'expense';
                updatedPayment.category = isLoanMade
                  ? 'Recebimento de Empréstimo'
                  : 'Pagamento de Dívida';
              }
              await window.api.finance.updateTransaction(payment.id, { ...payment, ...updatedPayment });
            }
          }
        }

        await window.api.finance.updateTransaction(id, merged);
        triggerToast('Transação atualizada com sucesso!', 'success');
        await loadData();
      } catch (err: unknown) {
        console.error('Erro ao atualizar transação:', err);
        const msg = err instanceof Error ? err.message : 'Erro ao atualizar transação';
        triggerToast(msg, 'error');
      }
    }
  }, [transactions, loadData]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!window.api?.finance) return;
    try {
      const tx = transactions.find(t => t.id === id);

      // Case 1: If deleting a payment linked to a loan, rollback the paid_amount on the parent loan
      if (tx?.linked_loan_id) {
        const parentLoan = transactions.find(t => t.id === tx.linked_loan_id);
        if (parentLoan) {
          const targetTotal = Number(parentLoan.expected_amount || parentLoan.amount || 0);
          const newPaidAmount = Math.max(0, Number(parentLoan.paid_amount || 0) - Number(tx.amount || 0));
          const isPaid = (targetTotal > 0 && newPaidAmount >= targetTotal - 0.001) ? 1 : 0;
          const status = isPaid ? 'completed' : 'in_progress';

          await window.api.finance.updateTransaction(parentLoan.id, {
            ...parentLoan,
            paid_amount: newPaidAmount,
            is_paid: isPaid,
            status,
          });
        }
      }

      // Case 2: If deleting a parent loan itself, cascade delete any linked payment transactions
      const isLoan = tx?.type === 'loan_made' || tx?.type === 'loan_taken';
      if (isLoan) {
        const linkedPayments = transactions.filter(t => t.linked_loan_id === id);
        for (const payment of linkedPayments) {
          await window.api.finance.deleteTransaction(payment.id);
        }
      }

      await window.api.finance.deleteTransaction(id);
      triggerToast(isLoan ? 'Empréstimo excluído.' : 'Transação excluída.', 'info');
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao excluir transação:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao excluir transação';
      triggerToast(msg, 'error');
    }
  }, [transactions, loadData]);

  return {
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
