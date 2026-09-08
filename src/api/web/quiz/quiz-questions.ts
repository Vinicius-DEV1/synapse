import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../../services/db-web';
import type { QuizQuestion } from '../../../types/quiz';

export function createQuizQuestionsApi(db: IDBPDatabase<CadernoDBSchema>, generateId: () => string) {
  return {
    async getByBattery(batteryId: string): Promise<QuizQuestion[]> {
      let questions: QuizQuestion[] = [];
      try {
        questions = (await db.getAllFromIndex('quiz_questions', 'battery_id', batteryId)) || [];
      } catch {
        const all = (await db.getAll('quiz_questions')) || [];
        questions = all.filter((q: QuizQuestion) => q.battery_id === batteryId);
      }

      return questions
        .filter((q) => !q.deleted_at)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    },

    async getById(id: string): Promise<QuizQuestion | null> {
      const q = await db.get('quiz_questions', id);
      if (!q || q.deleted_at) return null;
      return q;
    },

    async save(question: Partial<QuizQuestion> & { battery_id: string; question: string }): Promise<QuizQuestion> {
      const now = new Date().toISOString();
      const existing = question.id ? await db.get('quiz_questions', question.id) : null;

      const record: QuizQuestion = {
        id: question.id || existing?.id || generateId(),
        battery_id: question.battery_id || existing?.battery_id || '',
        type: question.type || existing?.type || 'multiple_choice',
        question: typeof question.question === 'string' ? question.question.trim() : (existing?.question || ''),
        options: Array.isArray(question.options) ? question.options.map(String) : (existing?.options || []),
        correct_index: typeof question.correct_index === 'number' ? question.correct_index : (existing?.correct_index ?? 0),
        expected_answer: question.expected_answer !== undefined ? question.expected_answer : (existing?.expected_answer || ''),
        explanation: question.explanation !== undefined ? question.explanation : (existing?.explanation || ''),
        tags: Array.isArray(question.tags) ? question.tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim()) : (existing?.tags || []),
        sort_order: typeof question.sort_order === 'number' ? question.sort_order : (existing?.sort_order ?? 0),
        created_at: existing?.created_at || question.created_at || now,
        updated_at: now,
        deleted_at: question.deleted_at !== undefined ? question.deleted_at : (existing?.deleted_at ?? null),
      };

      await db.put('quiz_questions', record);
      return record;
    },

    async saveBatch(
      items: (Partial<QuizQuestion> & { battery_id: string; question: string })[]
    ): Promise<QuizQuestion[]> {
      const now = new Date().toISOString();
      const tx = db.transaction('quiz_questions', 'readwrite');
      const store = tx.objectStore('quiz_questions');
      const results: QuizQuestion[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const existing = item.id ? await store.get(item.id) : null;

        const record: QuizQuestion = {
          id: item.id || existing?.id || generateId(),
          battery_id: item.battery_id || existing?.battery_id || '',
          type: item.type || existing?.type || 'multiple_choice',
          question: typeof item.question === 'string' ? item.question.trim() : (existing?.question || ''),
          options: Array.isArray(item.options) ? item.options.map(String) : (existing?.options || []),
          correct_index: typeof item.correct_index === 'number' ? item.correct_index : (existing?.correct_index ?? 0),
          expected_answer: item.expected_answer !== undefined ? item.expected_answer : (existing?.expected_answer || ''),
          explanation: item.explanation !== undefined ? item.explanation : (existing?.explanation || ''),
          tags: Array.isArray(item.tags) ? item.tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim()) : (existing?.tags || []),
          sort_order: typeof item.sort_order === 'number' ? item.sort_order : (existing?.sort_order ?? i),
          created_at: existing?.created_at || item.created_at || now,
          updated_at: now,
          deleted_at: item.deleted_at !== undefined ? item.deleted_at : (existing?.deleted_at ?? null),
        };

        await store.put(record);
        results.push(record);
      }

      await tx.done;
      return results;
    },

    async delete(id: string): Promise<boolean> {
      const existing = await db.get('quiz_questions', id);
      if (!existing) return false;

      const now = new Date().toISOString();
      await db.put('quiz_questions', {
        ...existing,
        deleted_at: now,
        updated_at: now,
      });
      return true;
    },
  };
}
