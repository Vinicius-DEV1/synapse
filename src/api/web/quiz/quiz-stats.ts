import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../../services/db-web';
import type { QuizStats, BatteryWithQuestions, QuizBattery, QuizQuestion } from '../../../types/quiz';
import type { createQuizBatteriesApi } from './quiz-batteries';
import type { createQuizQuestionsApi } from './quiz-questions';
import type { createQuizAttemptsApi } from './quiz-attempts';
import type { createQuizPageLinksApi } from './quiz-page-links';

export function createQuizStatsApi(
  db: IDBPDatabase<CadernoDBSchema>,
  batteriesApi: ReturnType<typeof createQuizBatteriesApi>,
  questionsApi: ReturnType<typeof createQuizQuestionsApi>,
  attemptsApi: ReturnType<typeof createQuizAttemptsApi>,
  linksApi: ReturnType<typeof createQuizPageLinksApi>
) {
  return {
    async getStats(): Promise<QuizStats> {
      const batteries = await batteriesApi.getAll();
      const allQuestionsRaw = (await db.getAll('quiz_questions')) || [];
      const questions: QuizQuestion[] = allQuestionsRaw.filter((q: QuizQuestion) => !q.deleted_at);

      const latestAttempts = await attemptsApi.getLatestAttempts();

      let answeredCount = 0;
      let correctCount = 0;
      let incorrectCount = 0;

      const tagStats: Record<string, { total: number; correct: number; answered: number }> = {};

      for (const q of questions) {
        const attempt = latestAttempts[q.id];
        const isAnswered = Boolean(attempt);
        const isCorrect = attempt ? attempt.is_correct : false;

        if (isAnswered) {
          answeredCount++;
          if (isCorrect) {
            correctCount++;
          } else {
            incorrectCount++;
          }
        }

        const tags = Array.isArray(q.tags) && q.tags.length > 0 ? q.tags : ['Geral'];
        for (const t of tags) {
          const normTag = t.trim().toLowerCase();
          if (!normTag) continue;
          if (!tagStats[normTag]) {
            tagStats[normTag] = { total: 0, correct: 0, answered: 0 };
          }
          tagStats[normTag].total++;
          if (isAnswered) {
            tagStats[normTag].answered++;
            if (isCorrect) {
              tagStats[normTag].correct++;
            }
          }
        }
      }

      const accuracyRate = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

      return {
        totalBatteries: batteries.length,
        totalQuestions: questions.length,
        answeredQuestions: answeredCount,
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        accuracyRate,
        tagStats,
      };
    },

    async getBatteryWithQuestions(batteryId: string): Promise<BatteryWithQuestions | null> {
      const battery = await batteriesApi.getById(batteryId);
      if (!battery) return null;

      const questions = await questionsApi.getByBattery(batteryId);
      const latestAttempts = await attemptsApi.getLatestAttempts(batteryId);
      const links = await linksApi.getLinksByBattery(batteryId);

      // Collect unique page IDs from direct page_id and link table
      const pageIdSet = new Set<string>();
      if (battery.page_id) pageIdSet.add(battery.page_id);
      links.forEach((l) => pageIdSet.add(l.page_id));

      const linkedPages: { id: string; title: string; icon?: string }[] = [];
      for (const pId of pageIdSet) {
        try {
          const page = await db.get('pages', pId);
          if (page && !page.deleted_at) {
            linkedPages.push({
              id: page.id,
              title: page.title || 'Sem título',
              icon: page.icon || 'file',
            });
          }
        } catch {
          // Ignore lookup failures for orphaned pages
        }
      }

      return {
        ...battery,
        questions,
        latestAttempts,
        linkedPages,
      };
    },
  };
}
