import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../services/db-web';
import { webFinanceApi } from './finance';

describe('webFinanceApi (IndexedDB)', () => {
  let api: any;

  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('transactions');
    await db.clear('wishlist');
    try {
      await db.clear('finance_accounts');
    } catch (err) {
      // Ignored if table does not exist in schema, but logged for diagnostic visibility
      console.warn('[finance.test] Optional finance_accounts store not cleared:', err);
    }
    api = webFinanceApi(db, () => 'tx_' + Math.random().toString(36).substring(2, 8));
  });

  it('creates, retrieves and updates financial transactions', async () => {
    const tx = await api.createTransaction({
      description: 'Book purchase',
      amount: 49.9,
      type: 'expense',
      category: 'Education',
      date: '2026-08-19',
      account_id: 'default-wallet',
    });

    expect(tx.id).toBeDefined();
    expect(tx.amount).toBe(49.9);
    expect(tx.account_id).toBe('default-wallet');

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

  it('manages bank accounts properly', async () => {
    const account = await api.createAccount({
      name: 'Nubank',
      color: '#8a05be',
      initial_balance: 1500,
    });

    expect(account.id).toBeDefined();
    expect(account.name).toBe('Nubank');

    let accounts = await api.getAccounts();
    expect(accounts.some((a: any) => a.name === 'Nubank')).toBe(true);

    await api.updateAccount(account.id, { name: 'Nubank PJ' });
    accounts = await api.getAccounts();
    const updated = accounts.find((a: any) => a.id === account.id);
    expect(updated?.name).toBe('Nubank PJ');

    await api.deleteAccount(account.id);
    accounts = await api.getAccounts();
    expect(accounts.some((a: any) => a.id === account.id)).toBe(false);
  });

  it('manages wishlist items properly', async () => {
    const item = await api.createWishlist({
      title: 'Mechanical Keyboard',
      price: 350,
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
