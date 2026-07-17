export const webFinanceApi = (db: any, generateId: () => string) => ({
  getTransactions: async () => {
    const all = await db.getAll('transactions');
    return all.filter((t: any) => !t.deleted_at).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },
  createTransaction: async (tx: any) => {
    const transaction = {
      id: generateId(),
      ...tx,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };
    await db.put('transactions', transaction);
    return transaction;
  },
  updateTransaction: async (id: string, updates: any) => {
    const existing = await db.get('transactions', id);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString()
      };
      await db.put('transactions', updated);
      return updated;
    }
    return updates;
  },
  deleteTransaction: async (id: string) => {
    const existing = await db.get('transactions', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('transactions', existing);
      return true;
    }
    return false;
  },
  getWishlist: async () => {
    const all = await db.getAll('wishlist');
    return all.filter((w: any) => !w.deleted_at);
  },
  createWishlist: async (item: any) => {
    const wishlist = {
      id: generateId(),
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };
    await db.put('wishlist', wishlist);
    return wishlist;
  },
  updateWishlist: async (id: string, updates: any) => {
    const existing = await db.get('wishlist', id);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        updated_at: new Date().toISOString()
      };
      await db.put('wishlist', updated);
      return updated;
    }
    return updates;
  },
  deleteWishlist: async (id: string) => {
    const existing = await db.get('wishlist', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('wishlist', existing);
      return true;
    }
    return false;
  }
});
