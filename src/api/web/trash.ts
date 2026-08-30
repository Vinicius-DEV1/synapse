export const webTrashApi = (db: any) => ({
  getAll: async () => {
    const items: any[] = [];
    
    const tables = {
      pages: { type: 'page', titleKey: 'title' },
      anki_decks: { type: 'anki_deck', titleKey: 'name' },
      anki_cards: { type: 'anki_card', titleKey: 'front' },
      files: { type: 'file', titleKey: 'name' },
      vault_groups: { type: 'vault', titleKey: 'name' },
      transactions: { type: 'finance', titleKey: 'description' },
      wishlist: { type: 'wishlist', titleKey: 'title' },
      culture_items: { type: 'culture', titleKey: 'title' }
    };
    
    for (const [table, meta] of Object.entries(tables)) {
      try {
        const all = await db.getAll(table) || [];
        const deleted = all.filter((x: any) => x.deleted_at);
        for (const item of deleted) {
          items.push({
            id: item.id,
            title: item[meta.titleKey] || 'Sem título',
            item_type: meta.type,
            deleted_at: item.deleted_at
          });
        }
      } catch (e) {
        console.warn(`Could not fetch trash for table ${table}`, e);
      }
    }
    
    return items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
  },
  restore: async (id: string, itemType: string) => {
    const tableMap: Record<string, string> = {
      'page': 'pages',
      'anki_deck': 'anki_decks',
      'anki_card': 'anki_cards',
      'file': 'files',
      'vault': 'vault_groups',
      'finance': 'transactions',
      'wishlist': 'wishlist',
      'culture': 'culture_items'
    };
    const table = tableMap[itemType];
    if (!table) throw new Error('Tipo não suportado');
    
    const item = await db.get(table, id);
    if (item) {
      item.deleted_at = null;
      item.updated_at = new Date().toISOString();
      await db.put(table, item);
      return true;
    }
    return false;
  },
  empty: async () => {
    const tables = ['pages', 'anki_decks', 'anki_cards', 'files', 'vault_groups', 'transactions', 'wishlist', 'culture_items', 'file_folders'];
    for (const table of tables) {
      try {
        const all = await db.getAll(table) || [];
        const deleted = all.filter((x: any) => x.deleted_at);
        for (const item of deleted) {
          await db.delete(table, item.id);
        }
      } catch (e) {
        console.warn(`Could not empty table ${table}`, e);
      }
    }
    return true;
  },
  deletePermanently: async (id: string, itemType: string) => {
    const tableMap: Record<string, string> = {
      'page': 'pages',
      'anki_deck': 'anki_decks',
      'anki_card': 'anki_cards',
      'file': 'files',
      'vault': 'vault_groups',
      'finance': 'transactions',
      'wishlist': 'wishlist',
      'culture': 'culture_items'
    };
    const table = tableMap[itemType];
    if (!table) throw new Error('Tipo não suportado');
    
    await db.delete(table, id);
    return true;
  }
});

