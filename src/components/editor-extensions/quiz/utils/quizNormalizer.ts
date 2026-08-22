import type { QuestionItem, QuizChatMessage, AttemptItem } from '../types';
import { createDefaultQuestion } from './fireworks';

/**
 * Defensively normalizes an individual question item,
 * prevenindo qualquer valor undefined, null ou tipos inesperados.
 */
export function normalizeSingleQuestion(raw: any, fallbackIndex: number = 1): QuestionItem {
  if (!raw || typeof raw !== 'object') {
    return createDefaultQuestion(fallbackIndex);
  }

  const type: 'multiple_choice' | 'open' =
    raw.type === 'open' ? 'open' : 'multiple_choice';

  const options: string[] = Array.isArray(raw.options)
    ? raw.options.map((opt: any) => (opt !== null && opt !== undefined ? String(opt) : ''))
    : ['', '', '', ''];

  let correctIndex = typeof raw.correctIndex === 'number' && !isNaN(raw.correctIndex)
    ? raw.correctIndex
    : 0;

  if (correctIndex < 0 || (options.length > 0 && correctIndex >= options.length)) {
    correctIndex = 0;
  }

  const tags: string[] = Array.isArray(raw.tags)
    ? raw.tags.filter((t: any) => typeof t === 'string' && t.trim().length > 0)
    : [];

  const attemptsHistory: AttemptItem[] = Array.isArray(raw.attemptsHistory)
    ? raw.attemptsHistory
        .filter((att: any) => att && typeof att === 'object')
        .map((att: any, idx: number) => ({
          id: typeof att.id === 'string' ? att.id : `att_${Date.now()}_${idx}`,
          timestamp: typeof att.timestamp === 'number' ? att.timestamp : Date.now(),
          type: att.type === 'open' ? ('open' as const) : ('multiple_choice' as const),
          userTypedAnswer: typeof att.userTypedAnswer === 'string' ? att.userTypedAnswer : undefined,
          aiFeedback:
            att.aiFeedback && typeof att.aiFeedback === 'object'
              ? {
                  verdict:
                    att.aiFeedback.verdict === 'Correto' ||
                    att.aiFeedback.verdict === 'Parcial' ||
                    att.aiFeedback.verdict === 'Incorreto'
                      ? att.aiFeedback.verdict
                      : 'Incorreto',
                  feedback: String(att.aiFeedback.feedback || ''),
                }
              : null,
          selectedIndex: typeof att.selectedIndex === 'number' ? att.selectedIndex : null,
          isCorrect: typeof att.isCorrect === 'boolean' ? att.isCorrect : undefined,
        }))
    : [];

  const aiFeedback =
    raw.aiFeedback && typeof raw.aiFeedback === 'object'
      ? {
          verdict:
            raw.aiFeedback.verdict === 'Correto' ||
            raw.aiFeedback.verdict === 'Parcial' ||
            raw.aiFeedback.verdict === 'Incorreto'
              ? raw.aiFeedback.verdict
              : 'Incorreto',
          feedback: String(raw.aiFeedback.feedback || ''),
        }
      : null;

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `q_${Date.now()}_${fallbackIndex}`,
    type,
    question: typeof raw.question === 'string' ? raw.question : '',
    options: options.length > 0 ? options : ['', '', '', ''],
    correctIndex,
    tags,
    selectedIndex: typeof raw.selectedIndex === 'number' ? raw.selectedIndex : null,
    expectedAnswer: typeof raw.expectedAnswer === 'string' ? raw.expectedAnswer : '',
    userTypedAnswer: typeof raw.userTypedAnswer === 'string' ? raw.userTypedAnswer : '',
    aiFeedback,
    explanation: typeof raw.explanation === 'string' ? raw.explanation : '',
    showExplanation: Boolean(raw.showExplanation),
    answered: Boolean(raw.answered),
    attemptsHistory,
  };
}

/**
 * Normaliza um payload arbitrário de questões (seja array bruto, string JSON ou URI-encoded).
 */
export function normalizeQuizQuestions(rawQuestions: any): QuestionItem[] {
  let parsed = rawQuestions;

  if (typeof rawQuestions === 'string') {
    try {
      if (rawQuestions.startsWith('%')) {
        parsed = JSON.parse(decodeURIComponent(rawQuestions));
      } else {
        parsed = JSON.parse(rawQuestions);
      }
    } catch {
      parsed = null;
    }
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [createDefaultQuestion(1)];
  }

  return parsed.map((q, idx) => normalizeSingleQuestion(q, idx + 1));
}

/**
 * Normalizes AI chat history to prevent deserialization issues.
 */
export function normalizeChatHistory(rawHistory: any): QuizChatMessage[] {
  let parsed = rawHistory;

  if (typeof rawHistory === 'string') {
    try {
      if (rawHistory.startsWith('%')) {
        parsed = JSON.parse(decodeURIComponent(rawHistory));
      } else {
        parsed = JSON.parse(rawHistory);
      }
    } catch {
      parsed = [];
    }
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .filter((m) => m && typeof m === 'object')
    .map((m, idx) => ({
      id: typeof m.id === 'string' ? m.id : `msg_${Date.now()}_${idx}`,
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      text: typeof m.text === 'string' ? m.text : '',
      suggestedActions: Array.isArray(m.suggestedActions) ? m.suggestedActions : undefined,
    }));
}
