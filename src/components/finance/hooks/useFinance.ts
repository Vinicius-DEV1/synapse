import { useState, useCallback, useEffect } from 'react';
import type { Transaction, WishlistItem } from '../../../types';

export function useFinance() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    if (!window.api?.finance) {
      setError(new Error('Finance API not available'));
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      const [txs, wishes] = await Promise.all([
        window.api.finance.getTransactions(),
        window.api.finance.getWishlist()
      ]);
      setTransactions(txs);
      setWishlist(wishes);
    } catch (err) {
      console.error('Failed to load finance data', err);
      setError(err instanceof Error ? err : new Error('Unknown error loading finance data'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createTransaction = useCallback(async (tx: Partial<Transaction>) => {
    if (!window.api?.finance) return;
    await window.api.finance.createTransaction(tx);
    await loadData();
  }, [loadData]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (!window.api?.finance) return;
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      await window.api.finance.updateTransaction(id, { ...tx, ...updates });
      await loadData();
    }
  }, [transactions, loadData]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!window.api?.finance) return;
    await window.api.finance.deleteTransaction(id);
    await loadData();
  }, [loadData]);

  const createWishlistItem = useCallback(async (item: Partial<WishlistItem>) => {
    if (!window.api?.finance) return;
    await window.api.finance.createWishlist(item);
    await loadData();
  }, [loadData]);

  const updateWishlistItem = useCallback(async (id: string, updates: Partial<WishlistItem>) => {
    if (!window.api?.finance) return;
    const item = wishlist.find(w => w.id === id);
    if (item) {
      await window.api.finance.updateWishlist(id, { ...item, ...updates });
      await loadData();
    }
  }, [wishlist, loadData]);

  const deleteWishlistItem = useCallback(async (id: string) => {
    if (!window.api?.finance) return;
    await window.api.finance.deleteWishlist(id);
    await loadData();
  }, [loadData]);

  return {
    transactions,
    wishlist,
    isLoading,
    error,
    loadData,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    createWishlistItem,
    updateWishlistItem,
    deleteWishlistItem
  };
}
