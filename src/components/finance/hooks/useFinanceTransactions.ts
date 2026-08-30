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
      await window.api.finance.deleteTransaction(id);
      triggerToast('Transação excluída.', 'info');
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao excluir transação:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao excluir transação';
      triggerToast(msg, 'error');
    }
  }, [loadData]);

  return {
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
