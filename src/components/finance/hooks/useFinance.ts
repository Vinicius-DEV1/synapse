import { useState, useCallback, useEffect, useRef } from 'react';
import type { Transaction, WishlistItem, Account } from '../../../types';
import { triggerToast } from '../../ui/ToastContext';
import { useFinanceAccounts } from './useFinanceAccounts';
import { useFinanceTransactions } from './useFinanceTransactions';
import { useFinanceWishlist } from './useFinanceWishlist';
import { useFinanceLoans } from './useFinanceLoans';

/**
 * Orchestration facade hook for personal finance module.
 * Coordinates domain sub-hooks while maintaining backward compatibility.
 */
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

  // Compose focused sub-hooks
  const { createAccount, updateAccount, deleteAccount } = useFinanceAccounts({ loadData });
  const { createTransaction, updateTransaction, deleteTransaction } = useFinanceTransactions({
    transactions,
    loadData,
  });
  const { createWishlistItem, updateWishlistItem, deleteWishlistItem } = useFinanceWishlist({
    wishlist,
    loadData,
  });
  const { payLoanWithAccount, markLoanAsPaid, reopenLoan } = useFinanceLoans({
    transactions,
    loadData,
    updateTransaction,
  });

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
    deleteWishlistItem,
  };
}
