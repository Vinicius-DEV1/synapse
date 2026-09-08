import { invoke } from '@tauri-apps/api/core';
import type { IQuizApi } from '../contracts/quiz';
import type {
  QuizBattery,
  QuizQuestion,
  QuizAttempt,
  QuizPageLink,
  QuizStats,
  BatteryWithQuestions,
} from '../../types/quiz';
import { getWebDb } from '../../services/db-web';
import { webQuizApi } from '../web/quiz';

let fallbackApiPromise: Promise<IQuizApi> | null = null;
async function getFallbackApi(): Promise<IQuizApi> {
  if (!fallbackApiPromise) {
    fallbackApiPromise = getWebDb().then((db) => webQuizApi(db, () => crypto.randomUUID()));
  }
  return fallbackApiPromise;
}

export const tauriQuizApi: IQuizApi = {
  async getAllBatteries(): Promise<QuizBattery[]> {
    try {
      return await invoke('quiz_get_all_batteries');
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getAllBatteries();
    }
  },

  async getBatteryById(id: string): Promise<QuizBattery | null> {
    try {
      return await invoke('quiz_get_battery_by_id', { id });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getBatteryById(id);
    }
  },

  async getBatteriesByPage(pageId: string): Promise<QuizBattery[]> {
    try {
      return await invoke('quiz_get_batteries_by_page', { pageId });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getBatteriesByPage(pageId);
    }
  },

  async saveBattery(battery: Partial<QuizBattery> & { title: string }): Promise<QuizBattery> {
    try {
      return await invoke('quiz_save_battery', { battery });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.saveBattery(battery);
    }
  },

  async deleteBattery(id: string): Promise<boolean> {
    try {
      return await invoke('quiz_delete_battery', { id });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.deleteBattery(id);
    }
  },

  async restoreBattery(id: string): Promise<boolean> {
    try {
      return await invoke('quiz_restore_battery', { id });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.restoreBattery(id);
    }
  },

  async getQuestionsByBattery(batteryId: string): Promise<QuizQuestion[]> {
    try {
      return await invoke('quiz_get_questions_by_battery', { batteryId });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getQuestionsByBattery(batteryId);
    }
  },

  async getQuestionById(id: string): Promise<QuizQuestion | null> {
    try {
      return await invoke('quiz_get_question_by_id', { id });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getQuestionById(id);
    }
  },

  async saveQuestion(
    question: Partial<QuizQuestion> & { battery_id: string; question: string }
  ): Promise<QuizQuestion> {
    try {
      return await invoke('quiz_save_question', { question });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.saveQuestion(question);
    }
  },

  async saveQuestionsBatch(
    questions: (Partial<QuizQuestion> & { battery_id: string; question: string })[]
  ): Promise<QuizQuestion[]> {
    try {
      return await invoke('quiz_save_questions_batch', { questions });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.saveQuestionsBatch(questions);
    }
  },

  async deleteQuestion(id: string): Promise<boolean> {
    try {
      return await invoke('quiz_delete_question', { id });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.deleteQuestion(id);
    }
  },

  async saveAttempt(
    attempt: Omit<QuizAttempt, 'id' | 'created_at'> & { id?: string; created_at?: string }
  ): Promise<QuizAttempt> {
    try {
      return await invoke('quiz_save_attempt', { attempt });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.saveAttempt(attempt);
    }
  },

  async getLatestAttempts(batteryId?: string): Promise<Record<string, QuizAttempt>> {
    try {
      return await invoke('quiz_get_latest_attempts', { batteryId });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getLatestAttempts(batteryId);
    }
  },

  async getAttemptsByQuestion(questionId: string): Promise<QuizAttempt[]> {
    try {
      return await invoke('quiz_get_attempts_by_question', { questionId });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getAttemptsByQuestion(questionId);
    }
  },

  async getWrongAttempts(): Promise<QuizAttempt[]> {
    try {
      return await invoke('quiz_get_wrong_attempts');
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getWrongAttempts();
    }
  },

  async getLinksByBattery(batteryId: string): Promise<QuizPageLink[]> {
    try {
      return await invoke('quiz_get_links_by_battery', { batteryId });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getLinksByBattery(batteryId);
    }
  },

  async getLinksByPage(pageId: string): Promise<QuizPageLink[]> {
    try {
      return await invoke('quiz_get_links_by_page', { pageId });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getLinksByPage(pageId);
    }
  },

  async linkBatteryToPage(batteryId: string, pageId: string): Promise<QuizPageLink> {
    try {
      return await invoke('quiz_link_battery_to_page', { batteryId, pageId });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.linkBatteryToPage(batteryId, pageId);
    }
  },

  async unlinkBatteryFromPage(batteryId: string, pageId: string): Promise<boolean> {
    try {
      return await invoke('quiz_unlink_battery_from_page', { batteryId, pageId });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.unlinkBatteryFromPage(batteryId, pageId);
    }
  },

  async getStats(): Promise<QuizStats> {
    try {
      return await invoke('quiz_get_stats');
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getStats();
    }
  },

  async getBatteryWithQuestions(batteryId: string): Promise<BatteryWithQuestions | null> {
    try {
      return await invoke('quiz_get_battery_with_questions', { batteryId });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getBatteryWithQuestions(batteryId);
    }
  },
};
