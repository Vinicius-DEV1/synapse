import { useState, useCallback, useEffect } from 'react';
import type { Transaction, WishlistItem } from '../../../types';
import { triggerToast } from '../../ui/ToastContext';

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
      setTransactions(txs || []);
      setWishlist(wishes || []);
    } catch (err: any) {
      console.error('Failed to load finance data', err);
      setError(err instanceof Error ? err : new Error('Unknown error loading finance data'));
      triggerToast(err.message || 'Erro ao carregar dados financeiros', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createTransaction = useCallback(async (tx: Partial<Transaction>) => {
    if (!window.api?.finance) return;
    try {
      await window.api.finance.createTransaction(tx);
      triggerToast('Transação registrada com sucesso!', 'success');
      await loadData();
    } catch (err: any) {
      console.error('Erro ao criar transação:', err);
      triggerToast(err.message || 'Erro ao registrar transação', 'error');
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
      } catch (err: any) {
        console.error('Erro ao atualizar transação:', err);
        triggerToast(err.message || 'Erro ao atualizar transação', 'error');
      }
    }
  }, [transactions, loadData]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!window.api?.finance) return;
    try {
      await window.api.finance.deleteTransaction(id);
      triggerToast('Transação excluída.', 'info');
      await loadData();
    } catch (err: any) {
      console.error('Erro ao excluir transação:', err);
      triggerToast(err.message || 'Erro ao excluir transação', 'error');
    }
  }, [loadData]);

  const createWishlistItem = useCallback(async (item: Partial<WishlistItem>) => {
    if (!window.api?.finance) return;
    try {
      await window.api.finance.createWishlist(item);
      triggerToast('Item adicionado à Lista de Desejos!', 'success');
      await loadData();
    } catch (err: any) {
      console.error('Erro ao criar item na wishlist:', err);
      triggerToast(err.message || 'Erro ao adicionar item', 'error');
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
      } catch (err: any) {
        console.error('Erro ao atualizar item da wishlist:', err);
        triggerToast(err.message || 'Erro ao atualizar item', 'error');
      }
    }
  }, [wishlist, loadData]);

  const deleteWishlistItem = useCallback(async (id: string) => {
    if (!window.api?.finance) return;
    try {
      await window.api.finance.deleteWishlist(id);
      triggerToast('Item removido da Lista de Desejos.', 'info');
      await loadData();
    } catch (err: any) {
      console.error('Erro ao excluir item da wishlist:', err);
      triggerToast(err.message || 'Erro ao remover item', 'error');
    }
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
