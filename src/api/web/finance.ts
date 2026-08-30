import type { FinanceApi } from '../types';
import type { Transaction, WishlistItem, Account } from '../../types/finance';

export const webFinanceApi = (db: any, generateId: () => string): FinanceApi => ({
  getTransactions: async (): Promise<Transaction[]> => {
    const all = await db.getAll('transactions');
    return all
      .filter((t: any) => !t.deleted_at)
      .map((t: any) => ({
        ...t,
        account_id: t.account_id || 'default-wallet',
      }))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
    await db.put('transactions', {
      ...transaction,
      updated_at: now,
      deleted_at: null,
    });
    return transaction;
  },
  updateTransaction: async (id: string, updates: Partial<Transaction>): Promise<{ success: boolean }> => {
    const existing = await db.get('transactions', id);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      await db.put('transactions', updated);
      return { success: true };
    }
    return { success: false };
  },
  deleteTransaction: async (id: string): Promise<boolean> => {
    const existing = await db.get('transactions', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('transactions', existing);
      return true;
    }
    return false;
  },
  getWishlist: async (): Promise<WishlistItem[]> => {
    const all = await db.getAll('wishlist');
    return all
      .filter((w: any) => !w.deleted_at)
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
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
    await db.put('wishlist', {
      ...wishlist,
      deleted_at: null,
    });
    return wishlist;
  },
  updateWishlist: async (id: string, updates: Partial<WishlistItem>): Promise<{ success: boolean }> => {
    const existing = await db.get('wishlist', id);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      await db.put('wishlist', updated);
      return { success: true };
    }
    return { success: false };
  },
  deleteWishlist: async (id: string): Promise<boolean> => {
    const existing = await db.get('wishlist', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('wishlist', existing);
      return true;
    }
    return false;
  },
  getAccounts: async (): Promise<Account[]> => {
    let all: any[] = [];
    try {
      all = await db.getAll('finance_accounts');
    } catch {
      all = [];
    }
    const nonDeleted = all.filter((a: any) => !a.deleted_at);
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
        await db.put('finance_accounts', defaultAccount);
        return [defaultAccount];
      } catch {
        return [defaultAccount];
      }
    }
    return nonDeleted.sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
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
    await db.put('finance_accounts', newAccount);
    return newAccount;
  },
  updateAccount: async (id: string, updates: Partial<Account>): Promise<{ success: boolean }> => {
    const existing = await db.get('finance_accounts', id);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      await db.put('finance_accounts', updated);
      return { success: true };
    }
    return { success: false };
  },
  deleteAccount: async (id: string): Promise<boolean> => {
    const existing = await db.get('finance_accounts', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('finance_accounts', existing);
      return true;
    }
    return false;
  },
});

