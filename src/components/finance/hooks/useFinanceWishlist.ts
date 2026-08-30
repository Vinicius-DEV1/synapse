import { useCallback } from 'react';
import type { WishlistItem } from '../../../types';
import { triggerToast } from '../../ui/ToastContext';

export interface UseFinanceWishlistProps {
  wishlist: WishlistItem[];
  loadData: () => Promise<void>;
}

export function useFinanceWishlist({ wishlist, loadData }: UseFinanceWishlistProps) {
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

  return {
    createWishlistItem,
    updateWishlistItem,
    deleteWishlistItem,
  };
}
