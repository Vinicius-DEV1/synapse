import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../../services/db-web';
import type { QuizStats, BatteryWithQuestions, QuizQuestion, QuizPageLink, QuizAttempt } from '../../../types/quiz';
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
      const activeBatteryIds = new Set(batteries.map((b) => b.id));
      const allQuestionsRaw = (await db.getAll('quiz_questions')) || [];
      const questions: QuizQuestion[] = allQuestionsRaw.filter(
        (q: QuizQuestion) => !q.deleted_at && activeBatteryIds.has(q.battery_id)
      );

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
      const allLatestAttempts = await attemptsApi.getLatestAttempts();
      const latestAttempts: Record<string, QuizAttempt> = {};
      for (const q of questions) {
        if (allLatestAttempts[q.id]) {
          latestAttempts[q.id] = allLatestAttempts[q.id];
        }
      }
      const links = await linksApi.getLinksByBattery(batteryId);

      // Collect unique page IDs from direct page_id and link table
      const pageIdSet = new Set<string>();
      if (battery.page_id) pageIdSet.add(battery.page_id);
      links.forEach((l) => pageIdSet.add(l.page_id));

      const pageIdArray = Array.from(pageIdSet);
      const pageResults = await Promise.all(
        pageIdArray.map(async (pId) => {
          try {
            const page = await db.get('pages', pId);
            if (page && !page.deleted_at) {
              return {
                id: page.id,
                title: page.title || 'Sem título',
                icon: page.icon || 'file',
              };
            }
          } catch {
            // Ignore lookup failures for orphaned pages
          }
          return null;
        })
      );
      const linkedPages = pageResults.filter(
        (p): p is { id: string; title: string; icon: string } => p !== null
      );

      return {
        ...battery,
        questions,
        latestAttempts,
        linkedPages,
      };
    },

    async getAllBatteriesEnriched(): Promise<BatteryWithQuestions[]> {
      const [allBatteries, allQuestionsRaw, latestAttempts, allLinks, allPages] = await Promise.all([
        batteriesApi.getAll(),
        db.getAll('quiz_questions'),
        attemptsApi.getLatestAttempts(),
        db.getAll('quiz_page_links').catch(() => []),
        db.getAll('pages').catch(() => []),
      ]);

      const pageMap = new Map<string, { id: string; title: string; icon?: string }>();
      ((allPages || []) as Array<{ id: string; title?: string; icon?: string; deleted_at?: string | null }>).forEach((p) => {
        if (!p.deleted_at) {
          pageMap.set(p.id, { id: p.id, title: p.title || 'Sem título', icon: p.icon || 'file' });
        }
      });

      // Group links by battery_id
      const linksByBattery = new Map<string, Set<string>>();
      ((allLinks || []) as QuizPageLink[]).forEach((l) => {
        if (!l.deleted_at) {
          if (!linksByBattery.has(l.battery_id)) linksByBattery.set(l.battery_id, new Set());
          linksByBattery.get(l.battery_id)!.add(l.page_id);
        }
      });

      // Group questions by battery_id
      const questionsByBattery = new Map<string, QuizQuestion[]>();
      (allQuestionsRaw || []).forEach((q: QuizQuestion) => {
        if (!q.deleted_at) {
          if (!questionsByBattery.has(q.battery_id)) questionsByBattery.set(q.battery_id, []);
          questionsByBattery.get(q.battery_id)!.push(q);
        }
      });

      // Sort questions by sort_order
      questionsByBattery.forEach((list) => {
        list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      });

      return allBatteries.map((b) => {
        const bQuestions = questionsByBattery.get(b.id) || [];
        const pageIds = new Set<string>();
        if (b.page_id) pageIds.add(b.page_id);
        const extraLinks = linksByBattery.get(b.id);
        if (extraLinks) extraLinks.forEach((pId) => pageIds.add(pId));

        const linkedPages: { id: string; title: string; icon?: string }[] = [];
        pageIds.forEach((pId) => {
          const page = pageMap.get(pId);
          if (page) linkedPages.push(page);
        });

        const bAttempts: Record<string, QuizAttempt> = {};
        bQuestions.forEach((q) => {
          if (latestAttempts[q.id]) bAttempts[q.id] = latestAttempts[q.id];
        });

        return {
          ...b,
          questions: bQuestions,
          latestAttempts: bAttempts,
          linkedPages,
        };
      });
    },
  };
}
