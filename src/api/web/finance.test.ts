import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../services/db-web';
import { webFinanceApi } from './finance';

describe('webFinanceApi (IndexedDB)', () => {
  let api: any;

  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('transactions');
    await db.clear('wishlist');
    api = webFinanceApi(db, () => 'tx_' + Math.random().toString(36).substring(2, 8));
  });

  it('creates, retrieves and updates financial transactions', async () => {
    const tx = await api.createTransaction({
      description: 'Book purchase',
      amount: 49.9,
      type: 'expense',
      category: 'Education',
      date: '2026-08-19',
    });

    expect(tx.id).toBeDefined();
    expect(tx.amount).toBe(49.9);

    let list = await api.getTransactions();
    expect(list).toHaveLength(1);
    expect(list[0].description).toBe('Book purchase');

    await api.updateTransaction(tx.id, { amount: 55.0 });
    list = await api.getTransactions();
    expect(list[0].amount).toBe(55.0);

    await api.deleteTransaction(tx.id);
    list = await api.getTransactions();
    expect(list).toHaveLength(0);
  });

  it('manages wishlist items properly', async () => {
    const item = await api.createWishlist({
      title: 'Mechanical Keyboard',
      estimated_price: 350,
      priority: 'high',
    });

    expect(item.id).toBeDefined();

    let wishlist = await api.getWishlist();
    expect(wishlist).toHaveLength(1);

    await api.deleteWishlist(item.id);
    wishlist = await api.getWishlist();
    expect(wishlist).toHaveLength(0);
  });
});
