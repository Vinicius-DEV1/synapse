import { sqliteGetAll, sqliteQuery } from './bridgeClient';
import type { FinanceApi } from '../types';
import type { Transaction, WishlistItem } from '../../types/finance';

export const webviewFinanceApi: FinanceApi = {
  async getTransactions(): Promise<Transaction[]> {
    return await sqliteGetAll<Transaction>(
      `SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY date DESC, created_at DESC`
    );
  },

  async createTransaction(tx: Partial<Transaction>): Promise<Transaction> {
    const id = tx.id || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const newTx: Transaction = {
      id,
      description: tx.description || '',
      amount: tx.amount || 0,
      type: tx.type || 'expense',
      category: tx.category || 'Geral',
      date: tx.date || now.split('T')[0],
      status: tx.status || 'completed',
      created_at: tx.created_at || now,
      is_paid: tx.is_paid ?? 1,
      paid_amount: tx.paid_amount || tx.amount || 0,
    };

    await sqliteQuery(
      `INSERT INTO transactions (id, description, amount, type, category, date, status, is_paid, paid_amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newTx.id,
        newTx.description,
        newTx.amount,
        newTx.type,
        newTx.category,
        newTx.date,
        newTx.status,
        newTx.is_paid,
        newTx.paid_amount,
        newTx.created_at,
      ]
    );

    return newTx;
  },

  async updateTransaction(id: string, tx: Partial<Transaction>): Promise<{ success: boolean }> {
    const fields: string[] = [];
    const params: any[] = [];

    if (tx.description !== undefined) { fields.push('description = ?'); params.push(tx.description); }
    if (tx.amount !== undefined) { fields.push('amount = ?'); params.push(tx.amount); }
    if (tx.type !== undefined) { fields.push('type = ?'); params.push(tx.type); }
    if (tx.category !== undefined) { fields.push('category = ?'); params.push(tx.category); }
    if (tx.date !== undefined) { fields.push('date = ?'); params.push(tx.date); }
    if (tx.status !== undefined) { fields.push('status = ?'); params.push(tx.status); }
    if (tx.is_paid !== undefined) { fields.push('is_paid = ?'); params.push(tx.is_paid); }
    if (tx.paid_amount !== undefined) { fields.push('paid_amount = ?'); params.push(tx.paid_amount); }

    if (fields.length === 0) return { success: true };

    params.push(id);
    await sqliteQuery(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, params);
    return { success: true };
  },

  async deleteTransaction(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    await sqliteQuery(`UPDATE transactions SET deleted_at = ? WHERE id = ?`, [now, id]);
    return true;
  },

  async getWishlist(): Promise<WishlistItem[]> {
    return await sqliteGetAll<WishlistItem>(
      `SELECT * FROM wishlist WHERE deleted_at IS NULL ORDER BY priority DESC, created_at DESC`
    );
  },

  async createWishlist(item: Partial<WishlistItem>): Promise<WishlistItem> {
    const id = item.id || `wish_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const newItem: WishlistItem = {
      id,
      title: item.title || '',
      price: item.price || 0,
      priority: item.priority || 'medium',
      category: item.category || 'Geral',
      expected_date: item.expected_date || null,
      created_at: item.created_at || now,
      updated_at: item.updated_at || now,
      description: item.description || null,
      link: item.link || null,
    };

    await sqliteQuery(
      `INSERT INTO wishlist (id, title, price, priority, category, expected_date, description, link, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newItem.id,
        newItem.title,
        newItem.price,
        newItem.priority,
        newItem.category,
        newItem.expected_date,
        newItem.description,
        newItem.link,
        newItem.created_at,
        newItem.updated_at,
      ]
    );

    return newItem;
  },

  async updateWishlist(id: string, item: Partial<WishlistItem>): Promise<{ success: boolean }> {
    const fields: string[] = [];
    const params: any[] = [];

    if (item.title !== undefined) { fields.push('title = ?'); params.push(item.title); }
    if (item.price !== undefined) { fields.push('price = ?'); params.push(item.price); }
    if (item.priority !== undefined) { fields.push('priority = ?'); params.push(item.priority); }
    if (item.category !== undefined) { fields.push('category = ?'); params.push(item.category); }
    if (item.expected_date !== undefined) { fields.push('expected_date = ?'); params.push(item.expected_date); }
    if (item.description !== undefined) { fields.push('description = ?'); params.push(item.description); }
    if (item.link !== undefined) { fields.push('link = ?'); params.push(item.link); }

    fields.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(id);
    await sqliteQuery(`UPDATE wishlist SET ${fields.join(', ')} WHERE id = ?`, params);
    return { success: true };
  },

  async deleteWishlist(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    await sqliteQuery(`UPDATE wishlist SET deleted_at = ? WHERE id = ?`, [now, id]);
    return true;
  },
};
