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
        await window.api.finance.updateTransaction(id, { ...tx, ...updates });
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

      // If deleting a payment linked to a loan, rollback the paid_amount on the parent loan
      if (tx?.linked_loan_id) {
        const parentLoan = transactions.find(t => t.id === tx.linked_loan_id);
        if (parentLoan) {
          const newPaidAmount = Math.max(0, Number(parentLoan.paid_amount || 0) - Number(tx.amount || 0));
          const isPaid = newPaidAmount >= parentLoan.amount - 0.001 ? 1 : 0;
          const status = isPaid ? 'completed' : 'in_progress';

          await window.api.finance.updateTransaction(parentLoan.id, {
            ...parentLoan,
            paid_amount: newPaidAmount,
            is_paid: isPaid,
            status,
          });
        }
      }

      await window.api.finance.deleteTransaction(id);
      triggerToast('Transação excluída.', 'info');
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
