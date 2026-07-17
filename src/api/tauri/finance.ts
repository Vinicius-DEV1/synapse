import { invoke } from '@tauri-apps/api/core';

export const tauriFinanceApi = {
  getTransactions: async () => await invoke('finance_get_transactions'),
  createTransaction: async (t: any) => await invoke('finance_add_transaction', { transaction: t }),
  updateTransaction: async (id: string, updates: any) => await invoke('finance_update_transaction', { transaction: { id, ...updates } }),
  deleteTransaction: async (id: string) => await invoke('finance_delete_transaction', { id }),
  getWishlist: async () => await invoke('finance_get_wishlist'),
  createWishlist: async (w: any) => await invoke('finance_add_wishlist', { item: w }),
  updateWishlist: async (id: string, updates: any) => await invoke('finance_update_wishlist', { item: { id, ...updates } }),
  deleteWishlist: async (id: string) => await invoke('finance_delete_wishlist', { id })
};
