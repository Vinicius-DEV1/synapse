import type { IDBPDatabase, StoreNames } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web-schema';
import type { TrashApi, TrashItem } from '../types';

type TrashSupportedStore = Extract<
  StoreNames<CadernoDBSchema>,
  | 'pages'
  | 'anki_decks'
  | 'anki_cards'
  | 'files'
  | 'vault_groups'
  | 'transactions'
  | 'wishlist'
  | 'culture_items'
  | 'quiz_batteries'
>;

type TrashEmptyStore = TrashSupportedStore | 'file_folders';

export const webTrashApi = (db: IDBPDatabase<CadernoDBSchema>): TrashApi => ({
  getAll: async (): Promise<TrashItem[]> => {
    const items: TrashItem[] = [];

    const tables: Record<TrashSupportedStore, { type: string; titleKey: string }> = {
      pages: { type: 'page', titleKey: 'title' },
      anki_decks: { type: 'anki_deck', titleKey: 'name' },
      anki_cards: { type: 'anki_card', titleKey: 'front' },
      files: { type: 'file', titleKey: 'name' },
      vault_groups: { type: 'vault', titleKey: 'name' },
      transactions: { type: 'finance', titleKey: 'description' },
      wishlist: { type: 'wishlist', titleKey: 'title' },
      culture_items: { type: 'culture', titleKey: 'title' },
      quiz_batteries: { type: 'quiz_battery', titleKey: 'title' },
    };

    for (const [table, meta] of Object.entries(tables) as [TrashSupportedStore, { type: string; titleKey: string }][]) {
      try {
        const all = ((await db.getAll(table)) as unknown as Array<Record<string, unknown>>) || [];
        const deleted = all.filter((x) => Boolean(x.deleted_at));
        for (const item of deleted) {
          items.push({
            id: String(item.id),
            title: String(item[meta.titleKey] || 'Sem título'),
            item_type: meta.type,
            deleted_at: String(item.deleted_at),
          });
        }
      } catch (e) {
        console.warn(`Could not fetch trash for table ${table}`, e);
      }
    }

    return items.sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
  },
  restore: async (id: string, itemType: string): Promise<boolean> => {
    const tableMap: Record<string, TrashSupportedStore> = {
      page: 'pages',
      anki_deck: 'anki_decks',
      anki_card: 'anki_cards',
      file: 'files',
      vault: 'vault_groups',
      finance: 'transactions',
      wishlist: 'wishlist',
      culture: 'culture_items',
      quiz_battery: 'quiz_batteries',
    };
    const table = tableMap[itemType];
    if (!table) throw new Error('Tipo não suportado');

    const item = (await db.get(table, id)) as Record<string, unknown> | undefined;
    if (item) {
      item.deleted_at = null;
      item.updated_at = new Date().toISOString();
      await (db as any).put(table, item);
      return true;
    }
    return false;
  },
  empty: async (): Promise<boolean> => {
    const tables: TrashEmptyStore[] = [
      'pages',
      'anki_decks',
      'anki_cards',
      'files',
      'vault_groups',
      'transactions',
      'wishlist',
      'culture_items',
      'file_folders',
      'quiz_batteries',
    ];
    for (const table of tables) {
      try {
        const all = ((await db.getAll(table)) as unknown as Array<Record<string, unknown>>) || [];
        const deleted = all.filter((x) => Boolean(x.deleted_at));
        for (const item of deleted) {
          await db.delete(table, String(item.id));
        }
      } catch (e) {
        console.warn(`Could not empty table ${table}`, e);
      }
    }
    return true;
  },
  deletePermanently: async (id: string, itemType: string): Promise<boolean> => {
    const tableMap: Record<string, TrashSupportedStore> = {
      page: 'pages',
      anki_deck: 'anki_decks',
      anki_card: 'anki_cards',
      file: 'files',
      vault: 'vault_groups',
      finance: 'transactions',
      wishlist: 'wishlist',
      culture: 'culture_items',
      quiz_battery: 'quiz_batteries',
    };
    const table = tableMap[itemType];
    if (!table) throw new Error('Tipo não suportado');

    await db.delete(table, id);
    return true;
  },
});

