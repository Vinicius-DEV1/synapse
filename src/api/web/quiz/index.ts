import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../../services/db-web';
import type { IQuizApi } from '../../contracts/quiz';
import { createQuizBatteriesApi } from './quiz-batteries';
import { createQuizQuestionsApi } from './quiz-questions';
import { createQuizAttemptsApi } from './quiz-attempts';
import { createQuizPageLinksApi } from './quiz-page-links';
import { createQuizStatsApi } from './quiz-stats';

export function webQuizApi(db: IDBPDatabase<CadernoDBSchema>, generateId: () => string): IQuizApi {
  const batteries = createQuizBatteriesApi(db, generateId);
  const questions = createQuizQuestionsApi(db, generateId);
  const attempts = createQuizAttemptsApi(db, generateId);
  const pageLinks = createQuizPageLinksApi(db, generateId);
  const stats = createQuizStatsApi(db, batteries, questions, attempts, pageLinks);

  return {
    // Batteries
    getAllBatteries: batteries.getAll.bind(batteries),
    getBatteryById: batteries.getById.bind(batteries),
    getBatteriesByPage: batteries.getByPage.bind(batteries),
    saveBattery: batteries.save.bind(batteries),
    deleteBattery: batteries.delete.bind(batteries),
    restoreBattery: batteries.restore.bind(batteries),

    // Questions
    getQuestionsByBattery: questions.getByBattery.bind(questions),
    getQuestionById: questions.getById.bind(questions),
    saveQuestion: questions.save.bind(questions),
    saveQuestionsBatch: questions.saveBatch.bind(questions),
    deleteQuestion: questions.delete.bind(questions),

    // Attempts
    saveAttempt: attempts.save.bind(attempts),
    getLatestAttempts: attempts.getLatestAttempts.bind(attempts),
    getAttemptsByQuestion: attempts.getAttemptsByQuestion.bind(attempts),
    getWrongAttempts: attempts.getWrongAttempts.bind(attempts),

    // Page Links
    getLinksByBattery: pageLinks.getLinksByBattery.bind(pageLinks),
    getLinksByPage: pageLinks.getLinksByPage.bind(pageLinks),
    linkBatteryToPage: pageLinks.linkBatteryToPage.bind(pageLinks),
    unlinkBatteryFromPage: pageLinks.unlinkBatteryFromPage.bind(pageLinks),

    // Stats & Aggregates
    getStats: stats.getStats.bind(stats),
    getBatteryWithQuestions: stats.getBatteryWithQuestions.bind(stats),
    getAllBatteriesEnriched: stats.getAllBatteriesEnriched.bind(stats),
  };
}
