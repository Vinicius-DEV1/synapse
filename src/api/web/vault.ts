export const webVaultApi = (db: any, generateId: () => string) => ({
  getGroups: async () => {
    const all = await db.getAll('vault_groups') || [];
    return all.filter((g: any) => !g.deleted_at).sort((a: any, b: any) => a.position - b.position);
  },
  upsertGroup: async (group: any) => {
    const id = group.id || generateId();
    const newGroup = {
      ...group,
      id,
      created_at: group.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };
    await db.put('vault_groups', newGroup);
  },
  deleteGroup: async (id: string) => {
    const existing = await db.get('vault_groups', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('vault_groups', existing);
    }
  },
  reorderGroups: async (updates: any[]) => {
    for (const update of updates) {
      const existing = await db.get('vault_groups', update.id);
      if (existing) {
        existing.position = update.position;
        existing.updated_at = new Date().toISOString();
        await db.put('vault_groups', existing);
      }
    }
  },
  getItems: async (groupId?: string) => {
    let all: any[] = [];
    if (groupId) {
      all = await db.getAllFromIndex('vault_items', 'group_id', groupId);
    } else {
      all = await db.getAll('vault_items');
    }
    return all.filter((i: any) => !i.deleted_at).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  getItem: async (id: string) => {
    const item = await db.get('vault_items', id);
    return item && !item.deleted_at ? item : null;
  },
  upsertItem: async (item: any) => {
    const id = item.id || generateId();
    const newItem = {
      ...item,
      id,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };
    await db.put('vault_items', newItem);
  },
  deleteItem: async (id: string) => {
    const existing = await db.get('vault_items', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('vault_items', existing);
    }
  },
  searchItems: async (query: string) => {
    const all = await db.getAll('vault_items');
    const q = query.toLowerCase();
    return all.filter((i: any) => !i.deleted_at && (
      (i.label && i.label.toLowerCase().includes(q)) ||
      (i.username && i.username.toLowerCase().includes(q)) ||
      (i.url && i.url.toLowerCase().includes(q))
    ));
  },
  getPasswordHistory: async (itemId: string) => {
    const all = await db.getAllFromIndex('vault_password_history', 'item_id', itemId);
    return all.filter((h: any) => !h.deleted_at).sort((a: any, b: any) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  },
  generatePassword: async (opts: any) => {
    // mock implementation
    return "mock-password-123";
  },
  checkBreach: async (password: string) => {
    // mock implementation
    return { breached: false, count: 0 };
  },
  checkStrength: async (password: string) => {
     return 3;
  }
});
