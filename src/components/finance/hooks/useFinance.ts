import { useState, useCallback, useEffect, useRef } from 'react';
import type { Transaction, WishlistItem, Account } from '../../../types';
import { triggerToast } from '../../ui/ToastContext';

export function useFinance() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    if (!window.api?.finance) {
      if (isMountedRef.current) {
        setError(new Error('Finance API not available'));
        setIsLoading(false);
      }
      return;
    }
    
    try {
      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
      }
      const [txs, wishes, accs] = await Promise.all([
        window.api.finance.getTransactions(),
        window.api.finance.getWishlist(),
        window.api.finance.getAccounts ? window.api.finance.getAccounts() : Promise.resolve([])
      ]);
      if (isMountedRef.current) {
        setTransactions(txs || []);
        setWishlist(wishes || []);
        setAccounts(accs || []);
      }
    } catch (err: unknown) {
      console.error('Failed to load finance data', err);
      const errObj = err instanceof Error ? err : new Error('Unknown error loading finance data');
      if (isMountedRef.current) {
        setError(errObj);
        triggerToast(errObj.message || 'Erro ao carregar dados financeiros', 'error');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Account operations
  const createAccount = useCallback(async (account: Partial<Account>) => {
    if (!window.api?.finance?.createAccount) return;
    try {
      await window.api.finance.createAccount(account);
      triggerToast('Conta cadastrada com sucesso!', 'success');
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao cadastrar conta:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar conta';
      triggerToast(msg, 'error');
    }
  }, [loadData]);

  const updateAccount = useCallback(async (id: string, updates: Partial<Account>) => {
    if (!window.api?.finance?.updateAccount) return;
    try {
      await window.api.finance.updateAccount(id, updates);
      triggerToast('Conta atualizada com sucesso!', 'success');
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao atualizar conta:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar conta';
      triggerToast(msg, 'error');
    }
  }, [loadData]);

  const deleteAccount = useCallback(async (id: string) => {
    if (!window.api?.finance?.deleteAccount) return;
    try {
      await window.api.finance.deleteAccount(id);
      triggerToast('Conta arquivada com sucesso.', 'info');
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao arquivar conta:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao arquivar conta';
      triggerToast(msg, 'error');
    }
  }, [loadData]);

  // Transaction operations
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

  const createWishlistItem = useCallback(async (item: Partial<WishlistItem>) => {
    if (!window.api?.finance) return;
    try {
      await window.api.finance.createWishlist(item);
      triggerToast('Item adicionado à Lista de Desejos!', 'success');
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao criar item na wishlist:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao adicionar item';
      triggerToast(msg, 'error');
    }
  }, [loadData]);

  const updateWishlistItem = useCallback(async (id: string, updates: Partial<WishlistItem>) => {
    if (!window.api?.finance) return;
    const item = wishlist.find(w => w.id === id);
    if (item) {
      try {
        await window.api.finance.updateWishlist(id, { ...item, ...updates });
        triggerToast('Item da Lista de Desejos atualizado!', 'success');
        await loadData();
      } catch (err: unknown) {
        console.error('Erro ao atualizar item da wishlist:', err);
        const msg = err instanceof Error ? err.message : 'Erro ao atualizar item';
        triggerToast(msg, 'error');
      }
    }
  }, [wishlist, loadData]);

  const deleteWishlistItem = useCallback(async (id: string) => {
    if (!window.api?.finance) return;
    try {
      await window.api.finance.deleteWishlist(id);
      triggerToast('Item removido da Lista de Desejos.', 'info');
      await loadData();
    } catch (err: unknown) {
      console.error('Erro ao excluir item da wishlist:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao remover item';
      triggerToast(msg, 'error');
    }
  }, [loadData]);

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
      });

      // 2. Update loan status
      await window.api.finance.updateTransaction(loan.id, {
        ...loan,
        paid_amount: newPaidAmount,
        is_paid: isPaid,
        status
      });

      triggerToast(isLoanMade ? 'Recebimento registrado com sucesso!' : 'Pagamento registrado com sucesso!', 'success');
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
    transactions,
    wishlist,
    accounts,
    isLoading,
    error,
    loadData,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    createAccount,
    updateAccount,
    deleteAccount,
    payLoanWithAccount,
    markLoanAsPaid,
    reopenLoan,
    createWishlistItem,
    updateWishlistItem,
    deleteWishlistItem
  };
}


