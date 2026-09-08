import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../../services/db-web';
import type { QuizBattery } from '../../../types/quiz';

export function createQuizBatteriesApi(db: IDBPDatabase<CadernoDBSchema>, generateId: () => string) {
  return {
    async getAll(): Promise<QuizBattery[]> {
      const all = (await db.getAll('quiz_batteries')) || [];
      return all
        .filter((b: QuizBattery) => !b.deleted_at)
        .sort((a: QuizBattery, b: QuizBattery) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    },

    async getById(id: string): Promise<QuizBattery | null> {
      const battery = await db.get('quiz_batteries', id);
      if (!battery || battery.deleted_at) return null;
      return battery;
    },

    async getByPage(pageId: string): Promise<QuizBattery[]> {
      try {
        const indexed = (await db.getAllFromIndex('quiz_batteries', 'page_id', pageId)) || [];
        return indexed.filter((b: QuizBattery) => !b.deleted_at);
      } catch {
        const all = (await db.getAll('quiz_batteries')) || [];
        return all.filter((b: QuizBattery) => b.page_id === pageId && !b.deleted_at);
      }
    },

    async save(battery: Partial<QuizBattery> & { title: string }): Promise<QuizBattery> {
      const now = new Date().toISOString();
      const existing = battery.id ? await db.get('quiz_batteries', battery.id) : null;

      const record: QuizBattery = {
        id: battery.id || existing?.id || generateId(),
        page_id: battery.page_id !== undefined ? battery.page_id : (existing?.page_id ?? null),
        title: battery.title.trim() || 'Bateria de Exercícios',
        description: battery.description !== undefined ? battery.description : (existing?.description || ''),
        layout: battery.layout || existing?.layout || 'sequential',
        tags: Array.isArray(battery.tags) ? battery.tags : (existing?.tags || []),
        created_at: existing?.created_at || battery.created_at || now,
        updated_at: now,
        deleted_at: battery.deleted_at !== undefined ? battery.deleted_at : (existing?.deleted_at ?? null),
      };

      await db.put('quiz_batteries', record);
      return record;
    },

    async delete(id: string): Promise<boolean> {
      const existing = await db.get('quiz_batteries', id);
      if (!existing) return false;

      const now = new Date().toISOString();
      await db.put('quiz_batteries', {
        ...existing,
        deleted_at: now,
        updated_at: now,
      });
      return true;
    },

    async restore(id: string): Promise<boolean> {
      const existing = await db.get('quiz_batteries', id);
      if (!existing) return false;

      const now = new Date().toISOString();
      await db.put('quiz_batteries', {
        ...existing,
        deleted_at: null,
        updated_at: now,
      });
      return true;
    },
  };
}
