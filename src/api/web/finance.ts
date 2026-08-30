import type { FinanceApi } from '../types';
import type { Transaction, WishlistItem, Account } from '../../types/finance';

export interface IDatabaseDriver {
  getAll<T = unknown>(storeName: string): Promise<T[]>;
  get<T = unknown>(storeName: string, id: string): Promise<T | undefined>;
  put<T = unknown>(storeName: string, value: T): Promise<unknown>;
}

export type SoftDeletable<T> = T & {
  deleted_at?: string | null;
  updated_at?: string | null;
};

export const webFinanceApi = (db: IDatabaseDriver, generateId: () => string): FinanceApi => ({
  getTransactions: async (): Promise<Transaction[]> => {
    const all = await db.getAll<SoftDeletable<Transaction>>('transactions');
    return all
      .filter((t): t is SoftDeletable<Transaction> => Boolean(t && !t.deleted_at))
      .map((t) => ({
        ...t,
        account_id: t.account_id || 'default-wallet',
      }))
      .sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  },

  createTransaction: async (tx: Partial<Transaction>): Promise<Transaction> => {
    const now = new Date().toISOString();
    const transaction: Transaction = {
      id: tx.id || generateId(),
      type: tx.type || 'expense',
      amount: typeof tx.amount === 'number' ? tx.amount : 0,
      description: tx.description || '',
      category: tx.category || 'Geral',
      date: tx.date || now.split('T')[0],
      due_date: tx.due_date || null,
      status: tx.status || 'completed',
      is_paid: tx.is_paid !== undefined ? tx.is_paid : (tx.type === 'loan_made' || tx.type === 'loan_taken' ? 0 : 1),
      paid_amount: tx.paid_amount !== undefined ? tx.paid_amount : 0,
      account_id: tx.account_id || 'default-wallet',
      destination_account_id: tx.destination_account_id || null,
      linked_loan_id: tx.linked_loan_id || null,
      created_at: tx.created_at || now,
    };
    await db.put<SoftDeletable<Transaction>>('transactions', {
      ...transaction,
      updated_at: now,
      deleted_at: null,
    });
    return transaction;
  },

  updateTransaction: async (id: string, updates: Partial<Transaction>): Promise<{ success: boolean }> => {
    const existing = await db.get<SoftDeletable<Transaction>>('transactions', id);
    if (existing) {
      const updated: SoftDeletable<Transaction> = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      await db.put<SoftDeletable<Transaction>>('transactions', updated);
      return { success: true };
    }
    return { success: false };
  },

  deleteTransaction: async (id: string): Promise<boolean> => {
    const existing = await db.get<SoftDeletable<Transaction>>('transactions', id);
    if (existing) {
      const updated: SoftDeletable<Transaction> = {
        ...existing,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.put<SoftDeletable<Transaction>>('transactions', updated);
      return true;
    }
    return false;
  },

  getWishlist: async (): Promise<WishlistItem[]> => {
    const all = await db.getAll<SoftDeletable<WishlistItem>>('wishlist');
    return all
      .filter((w): w is SoftDeletable<WishlistItem> => Boolean(w && !w.deleted_at))
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  },

  createWishlist: async (item: Partial<WishlistItem>): Promise<WishlistItem> => {
    const now = new Date().toISOString();
    const wishlist: WishlistItem = {
      id: item.id || generateId(),
      title: item.title || '',
      price: typeof item.price === 'number' ? item.price : 0,
      priority: item.priority || 'medium',
      category: item.category || 'Geral',
      expected_date: item.expected_date || null,
      description: item.description || null,
      link: item.link || null,
      created_at: item.created_at || now,
      updated_at: item.updated_at || now,
    };
    await db.put<SoftDeletable<WishlistItem>>('wishlist', {
      ...wishlist,
      deleted_at: null,
    });
    return wishlist;
  },

  updateWishlist: async (id: string, updates: Partial<WishlistItem>): Promise<{ success: boolean }> => {
    const existing = await db.get<SoftDeletable<WishlistItem>>('wishlist', id);
    if (existing) {
      const updated: SoftDeletable<WishlistItem> = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      await db.put<SoftDeletable<WishlistItem>>('wishlist', updated);
      return { success: true };
    }
    return { success: false };
  },

  deleteWishlist: async (id: string): Promise<boolean> => {
    const existing = await db.get<SoftDeletable<WishlistItem>>('wishlist', id);
    if (existing) {
      const updated: SoftDeletable<WishlistItem> = {
        ...existing,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.put<SoftDeletable<WishlistItem>>('wishlist', updated);
      return true;
    }
    return false;
  },

  getAccounts: async (): Promise<Account[]> => {
    let all: SoftDeletable<Account>[] = [];
    try {
      all = await db.getAll<SoftDeletable<Account>>('finance_accounts');
    } catch {
      all = [];
    }
    const nonDeleted = all.filter((a): a is SoftDeletable<Account> => Boolean(a && !a.deleted_at));
    if (nonDeleted.length === 0) {
      const now = new Date().toISOString();
      const defaultAccount: Account = {
        id: 'default-wallet',
        name: 'Carteira Principal',
        color: '#10b981',
        icon: 'wallet',
        initial_balance: 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      try {
        await db.put<SoftDeletable<Account>>('finance_accounts', defaultAccount);
        return [defaultAccount];
      } catch {
        return [defaultAccount];
      }
    }
    return nonDeleted.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  },

  createAccount: async (account: Partial<Account>): Promise<Account> => {
    const now = new Date().toISOString();
    const newAccount: Account = {
      id: account.id || generateId(),
      name: account.name || 'Nova Conta',
      color: account.color || '#10b981',
      icon: account.icon || 'wallet',
      initial_balance: typeof account.initial_balance === 'number' ? account.initial_balance : 0,
      created_at: account.created_at || now,
      updated_at: now,
      deleted_at: null,
    };
    await db.put<SoftDeletable<Account>>('finance_accounts', newAccount);
    return newAccount;
  },

  updateAccount: async (id: string, updates: Partial<Account>): Promise<{ success: boolean }> => {
    const existing = await db.get<SoftDeletable<Account>>('finance_accounts', id);
    if (existing) {
      const updated: SoftDeletable<Account> = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      await db.put<SoftDeletable<Account>>('finance_accounts', updated);
      return { success: true };
    }
    return { success: false };
  },

  deleteAccount: async (id: string): Promise<boolean> => {
    const existing = await db.get<SoftDeletable<Account>>('finance_accounts', id);
    if (existing) {
      const updated: SoftDeletable<Account> = {
        ...existing,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.put<SoftDeletable<Account>>('finance_accounts', updated);
      return true;
    }
    return false;
  },
});
