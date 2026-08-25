import { sqliteGetAll, sqliteQuery, sqliteExec } from './bridgeClient';

export const webviewTrashApi = {
  async getAll() {
    const items: any[] = [];
    const tables: Array<{ table: string; type: string; titleCol: string }> = [
      { table: 'pages', type: 'page', titleCol: 'title' },
      { table: 'anki_decks', type: 'anki_deck', titleCol: 'name' },
      { table: 'anki_cards', type: 'anki_card', titleCol: 'front' },
      { table: 'files', type: 'file', titleCol: 'name' },
      { table: 'vault_groups', type: 'vault', titleCol: 'name' },
      { table: 'transactions', type: 'finance', titleCol: 'description' },
      { table: 'culture_items', type: 'culture', titleCol: 'title' },
    ];

    for (const meta of tables) {
      try {
        const rows = await sqliteGetAll<any>(
          `SELECT id, ${meta.titleCol} as title, deleted_at FROM ${meta.table} WHERE deleted_at IS NOT NULL`
        );
        for (const r of rows) {
          items.push({
            id: r.id,
            title: r.title || 'Sem título',
            item_type: meta.type,
            deleted_at: r.deleted_at,
          });
        }
      } catch (e) {
        console.warn(`Could not fetch trash for ${meta.table}:`, e);
      }
    }

    return items.sort(
      (a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
    );
  },

  async restore(id: string, itemType: string) {
    const tableMap: Record<string, string> = {
      page: 'pages',
      anki_deck: 'anki_decks',
      anki_card: 'anki_cards',
      file: 'files',
      vault: 'vault_groups',
      finance: 'transactions',
      culture: 'culture_items',
    };
    const table = tableMap[itemType];
    if (!table) throw new Error('Tipo não suportado');

    await sqliteQuery(
      `UPDATE ${table} SET deleted_at = NULL, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );
    return true;
  },

  async empty() {
    const tables = [
      'pages',
      'anki_decks',
      'anki_cards',
      'files',
      'vault_groups',
      'transactions',
      'culture_items',
      'file_folders',
      'file_page_links',
    ];
    for (const table of tables) {
      try {
        await sqliteExec(`DELETE FROM ${table} WHERE deleted_at IS NOT NULL`);
      } catch (e) {
        console.warn(`Could not empty table ${table}:`, e);
      }
    }
    return true;
  },

  async deletePermanently(id: string, itemType: string) {
    const tableMap: Record<string, string> = {
      page: 'pages',
      anki_deck: 'anki_decks',
      anki_card: 'anki_cards',
      file: 'files',
      vault: 'vault_groups',
      finance: 'transactions',
      culture: 'culture_items',
    };
    const table = tableMap[itemType];
    if (!table) return false;

    await sqliteQuery(`DELETE FROM ${table} WHERE id = ?`, [id]);
    return true;
  },
};
