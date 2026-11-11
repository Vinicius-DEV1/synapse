import { invoke } from '@tauri-apps/api/core';
import type { FinanceApi } from '../types';
import type { Transaction, WishlistItem, Account } from '../../types/finance';

export const tauriFinanceApi: FinanceApi = {
  getTransactions: async (): Promise<Transaction[]> => await invoke('finance_get_transactions'),
  createTransaction: async (tx: Partial<Transaction>): Promise<Transaction> =>
    await invoke('finance_add_transaction', { transaction: { id: '', ...tx } }),
  updateTransaction: async (id: string, updates: Partial<Transaction>): Promise<{ success: boolean }> => {
    await invoke('finance_update_transaction', { transaction: { id, ...updates } });
    return { success: true };
  },
  deleteTransaction: async (id: string): Promise<boolean> =>
    await invoke('finance_delete_transaction', { id }),
  getWishlist: async (): Promise<WishlistItem[]> => await invoke('finance_get_wishlist'),
  createWishlist: async (item: Partial<WishlistItem>): Promise<WishlistItem> =>
    await invoke('finance_add_wishlist', { item: { id: '', ...item } }),
  updateWishlist: async (id: string, updates: Partial<WishlistItem>): Promise<{ success: boolean }> => {
    await invoke('finance_update_wishlist', { item: { id, ...updates } });
    return { success: true };
  },
  deleteWishlist: async (id: string): Promise<boolean> =>
    await invoke('finance_delete_wishlist', { id }),
  getAccounts: async (): Promise<Account[]> => await invoke('finance_get_accounts'),
  createAccount: async (account: Partial<Account>): Promise<Account> =>
    await invoke('finance_add_account', { account: { id: '', ...account } }),
  updateAccount: async (id: string, updates: Partial<Account>): Promise<{ success: boolean }> => {
    await invoke('finance_update_account', { account: { id, ...updates } });
    return { success: true };
  },
  deleteAccount: async (id: string): Promise<boolean> =>
    await invoke('finance_delete_account', { id }),
};

