import { useCallback } from 'react';
import type { Transaction } from '../../../types';
import { triggerToast } from '../../ui/ToastContext';

export interface UseFinanceLoansProps {
  transactions: Transaction[];
  loadData: () => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
}

export function useFinanceLoans({
  transactions,
  loadData,
  updateTransaction,
}: UseFinanceLoansProps) {
  // Option A Loan Payment with Account Link
  const payLoanWithAccount = useCallback(async (
    loan: Transaction,
    paymentAmount: number,
    targetAccountId: string
  ) => {
    if (!window.api?.finance) return;
    try {
      const currentPaid = Number(loan.paid_amount || 0);
      const newPaidAmount = Math.min(loan.amount, currentPaid + paymentAmount);
      const isPaid = newPaidAmount >= loan.amount - 0.001 ? 1 : 0;
      const status = isPaid ? 'completed' : 'in_progress';

      // 1. Create linked cashflow transaction in target account FIRST
      const isLoanMade = loan.type === 'loan_made';
      await window.api.finance.createTransaction({
        type: isLoanMade ? 'income' : 'expense',
        amount: paymentAmount,
        account_id: targetAccountId,
        linked_loan_id: loan.id,
        category: isLoanMade ? 'Recebimento de Empréstimo' : 'Pagamento de Dívida',
        description: isLoanMade ? `Recebimento: ${loan.description}` : `Pagamento: ${loan.description}`,
        date: new Date().toISOString().split('T')[0],
        is_paid: 1,
        status: 'completed',
      });

      // 2. Update loan status
      await window.api.finance.updateTransaction(loan.id, {
        ...loan,
        paid_amount: newPaidAmount,
        is_paid: isPaid,
        status,
      });

      triggerToast(
        isLoanMade ? 'Recebimento registrado com sucesso!' : 'Pagamento registrado com sucesso!',
        'success'
      );
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao registrar pagamento do empréstimo:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao processar pagamento';
      triggerToast(msg, 'error');
    }
  }, [loadData]);

  const markLoanAsPaid = useCallback(async (id: string, targetAccountId?: string) => {
    if (!window.api?.finance) return;
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      const pending = Math.max(0, tx.amount - Number(tx.paid_amount || 0));
      const accId = targetAccountId || tx.account_id || 'default-wallet';
      if (pending > 0) {
        await payLoanWithAccount(tx, pending, accId);
      } else {
        await updateTransaction(id, { is_paid: 1, status: 'completed' });
      }
    }
  }, [transactions, payLoanWithAccount, updateTransaction]);

  const reopenLoan = useCallback(async (id: string) => {
    if (!window.api?.finance) return;
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      try {
        await window.api.finance.updateTransaction(id, {
          ...tx,
          is_paid: 0,
          status: 'in_progress',
        });
        triggerToast('Empréstimo reaberto como ativo.', 'info');
        await loadData();
      } catch (err: unknown) {
        console.error('Erro ao reabrir empréstimo:', err);
        const msg = err instanceof Error ? err.message : 'Erro ao reabrir empréstimo';
        triggerToast(msg, 'error');
      }
    }
  }, [transactions, loadData]);

  return {
    payLoanWithAccount,
    markLoanAsPaid,
    reopenLoan,
  };
}
