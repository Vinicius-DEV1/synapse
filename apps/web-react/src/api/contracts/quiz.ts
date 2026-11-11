import type {
  QuizBattery,
  QuizQuestion,
  QuizAttempt,
  QuizPageLink,
  QuizStats,
  BatteryWithQuestions,
} from '../../types/quiz';

export interface IQuizApi {
  // Batteries
  getAllBatteries(): Promise<QuizBattery[]>;
  getBatteryById(id: string): Promise<QuizBattery | null>;
  getBatteriesByPage(pageId: string): Promise<QuizBattery[]>;
  saveBattery(battery: Partial<QuizBattery> & { title: string }): Promise<QuizBattery>;
  deleteBattery(id: string): Promise<boolean>;
  restoreBattery(id: string): Promise<boolean>;

  // Questions
  getQuestionsByBattery(batteryId: string): Promise<QuizQuestion[]>;
  getQuestionById(id: string): Promise<QuizQuestion | null>;
  saveQuestion(question: Partial<QuizQuestion> & { battery_id: string; question: string }): Promise<QuizQuestion>;
  saveQuestionsBatch(questions: (Partial<QuizQuestion> & { battery_id: string; question: string })[]): Promise<QuizQuestion[]>;
  deleteQuestion(id: string): Promise<boolean>;

  // Attempts
  saveAttempt(attempt: Omit<QuizAttempt, 'id' | 'created_at'> & { id?: string; created_at?: string }): Promise<QuizAttempt>;
  getLatestAttempts(batteryId?: string): Promise<Record<string, QuizAttempt>>;
  getAttemptsByQuestion(questionId: string): Promise<QuizAttempt[]>;
  getWrongAttempts(): Promise<QuizAttempt[]>;

  // Page Links
  getLinksByBattery(batteryId: string): Promise<QuizPageLink[]>;
  getLinksByPage(pageId: string): Promise<QuizPageLink[]>;
  linkBatteryToPage(batteryId: string, pageId: string): Promise<QuizPageLink>;
  unlinkBatteryFromPage(batteryId: string, pageId: string): Promise<boolean>;

  // Stats & Compositions
  getStats(): Promise<QuizStats>;
  getBatteryWithQuestions(batteryId: string): Promise<BatteryWithQuestions | null>;
  getAllBatteriesEnriched(): Promise<BatteryWithQuestions[]>;
}
