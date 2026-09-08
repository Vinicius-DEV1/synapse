import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../../services/db-web';
import type { QuizAttempt } from '../../../types/quiz';

export function createQuizAttemptsApi(db: IDBPDatabase<CadernoDBSchema>, generateId: () => string) {
  return {
    async save(
      attempt: Omit<QuizAttempt, 'id' | 'created_at'> & { id?: string; created_at?: string }
    ): Promise<QuizAttempt> {
      const record: QuizAttempt = {
        id: attempt.id || generateId(),
        question_id: attempt.question_id,
        battery_id: attempt.battery_id,
        type: attempt.type,
        selected_index: attempt.selected_index !== undefined ? attempt.selected_index : null,
        user_typed_answer: attempt.user_typed_answer !== undefined ? attempt.user_typed_answer : '',
        is_correct: Boolean(attempt.is_correct),
        ai_feedback: attempt.ai_feedback || null,
        duration_ms: attempt.duration_ms || 0,
        created_at: attempt.created_at || new Date().toISOString(),
      };

      await db.put('quiz_attempts', record);
      return record;
    },

    async getLatestAttempts(batteryId?: string): Promise<Record<string, QuizAttempt>> {
      let attempts: QuizAttempt[] = [];
      try {
        if (batteryId) {
          attempts = (await db.getAllFromIndex('quiz_attempts', 'battery_id', batteryId)) || [];
        } else {
          attempts = (await db.getAll('quiz_attempts')) || [];
        }
      } catch {
        const all = (await db.getAll('quiz_attempts')) || [];
        attempts = batteryId ? all.filter((a: QuizAttempt) => a.battery_id === batteryId) : all;
      }

      // Group by question_id and keep the most recent attempt
      const latestMap: Record<string, QuizAttempt> = {};
      for (const att of attempts) {
        const existing = latestMap[att.question_id];
        if (!existing || new Date(att.created_at).getTime() > new Date(existing.created_at).getTime()) {
          latestMap[att.question_id] = att;
        }
      }

      return latestMap;
    },

    async getAttemptsByQuestion(questionId: string): Promise<QuizAttempt[]> {
      try {
        const list = (await db.getAllFromIndex('quiz_attempts', 'question_id', questionId)) || [];
        return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } catch {
        const all = (await db.getAll('quiz_attempts')) || [];
        return all
          .filter((a: QuizAttempt) => a.question_id === questionId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    },

    async getWrongAttempts(): Promise<QuizAttempt[]> {
      const latestMap = await this.getLatestAttempts();
      return Object.values(latestMap).filter((att) => !att.is_correct);
    },
  };
}
