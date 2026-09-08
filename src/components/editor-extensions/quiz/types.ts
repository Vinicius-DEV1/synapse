export interface SuggestedAction {
  id: string;
  actionType: 'create' | 'edit' | 'delete';
  status: 'pending' | 'accepted' | 'rejected';
  // create
  type?: 'multiple_choice' | 'open';
  question?: string;
  options?: string[];
  correctIndex?: number;
  tags?: string[];
  expectedAnswer?: string;
  explanation?: string;
  // edit / delete
  targetQuestionIndex?: number;
  changes?: {
    type?: 'multiple_choice' | 'open';
    question?: string;
    options?: string[];
    correctIndex?: number;
    tags?: string[];
    expectedAnswer?: string;
    explanation?: string;
  };
  reason?: string;
  factCheckVerdict?: 'approved' | 'corrected';
  validatedByModel?: string;
}

export interface QuizChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestedActions?: SuggestedAction[];
  validationSummary?: string;
}

export interface AttemptItem {
  id: string;
  timestamp: number;
  type: 'multiple_choice' | 'open';
  userTypedAnswer?: string;
  aiFeedback?: { verdict: 'Correto' | 'Parcial' | 'Incorreto'; feedback: string; model?: string } | null;
  selectedIndex?: number | null;
  isCorrect?: boolean;
}

export interface QuestionItem {
  id: string;
  type: 'multiple_choice' | 'open';
  question: string;
  options: string[];
  correctIndex: number;
  tags?: string[];
  selectedIndex: number | null;
  expectedAnswer: string;
  userTypedAnswer: string;
  aiFeedback: { verdict: 'Correto' | 'Parcial' | 'Incorreto'; feedback: string; model?: string } | null;
  explanation: string;
  showExplanation: boolean;
  answered: boolean;
  attemptsHistory?: AttemptItem[];
  batteryId?: string;
}

export interface ReferencedBattery {
  id: string;
  title: string;
  pageId: string;
  pageTitle: string;
  questionCount: number;
  questions: QuestionItem[];
}

export type QuizLayout = 'list' | 'sequential';
