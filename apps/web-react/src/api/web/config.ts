import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web-schema';

export const createWebConfigApi = (db: IDBPDatabase<CadernoDBSchema>) => ({
  get: async (key: string): Promise<unknown> => {
    const item = await db.get('config', key);
    return item ? item.value : null;
  },
  set: async (key: string, data: unknown): Promise<{ success: boolean }> => {
    await db.put('config', { id: key, value: data, updated_at: new Date().toISOString() });
    return { success: true };
  }
});
