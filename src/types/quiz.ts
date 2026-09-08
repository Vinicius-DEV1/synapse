export type QuestionType = 'multiple_choice' | 'open';
export type QuizLayout = 'list' | 'sequential';

export interface QuizBattery {
  id: string;
  page_id?: string | null;
  title: string;
  description?: string;
  layout: QuizLayout;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface QuizQuestion {
  id: string;
  battery_id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correct_index: number;
  expected_answer?: string;
  explanation?: string;
  tags: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface QuizAttemptFeedback {
  verdict: 'Correto' | 'Parcial' | 'Incorreto';
  feedback: string;
  model?: string;
}

export interface QuizAttempt {
  id: string;
  question_id: string;
  battery_id: string;
  type: QuestionType;
  selected_index?: number | null;
  user_typed_answer?: string;
  is_correct: boolean;
  ai_feedback?: QuizAttemptFeedback | null;
  duration_ms?: number;
  created_at: string;
}

export interface QuizPageLink {
  id: string;
  battery_id: string;
  page_id: string;
  created_at: string;
  deleted_at?: string | null;
}

export interface QuizStats {
  totalBatteries: number;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracyRate: number;
  tagStats: Record<string, { total: number; correct: number; answered: number }>;
}

export interface BatteryWithQuestions extends QuizBattery {
  questions: QuizQuestion[];
  latestAttempts?: Record<string, QuizAttempt>;
  linkedPages?: { id: string; title: string; icon?: string }[];
}
