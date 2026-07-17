import { invoke } from '@tauri-apps/api/core';

export const tauriFinanceApi = {
  getTransactions: async () => await invoke('finance_get_transactions'),
  addTransaction: async (t: any) => await invoke('finance_add_transaction', { transaction: t }),
  updateTransaction: async (t: any) => await invoke('finance_update_transaction', { transaction: t }),
  deleteTransaction: async (id: string) => await invoke('finance_delete_transaction', { id }),
  getWishlist: async () => await invoke('finance_get_wishlist'),
  addWishlist: async (w: any) => await invoke('finance_add_wishlist', { item: w }),
  updateWishlist: async (w: any) => await invoke('finance_update_wishlist', { item: w }),
  deleteWishlist: async (id: string) => await invoke('finance_delete_wishlist', { id })
};
