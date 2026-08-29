import type { QuestionItem, QuizChatMessage, AttemptItem, SuggestedAction } from '../types';
import { createDefaultQuestion } from './fireworks';

/**
 * Defensively normalizes an individual question item from unknown input,
 * preventing any undefined, null, or unexpected types from corrupting state.
 */
export function normalizeSingleQuestion(raw: unknown, fallbackIndex: number = 1): QuestionItem {
  if (!raw || typeof raw !== 'object') {
    return createDefaultQuestion(fallbackIndex);
  }

  const record = raw as Record<string, unknown>;

  const type: 'multiple_choice' | 'open' =
    record.type === 'open' ? 'open' : 'multiple_choice';

  const options: string[] = Array.isArray(record.options)
    ? record.options.map((opt: unknown) => (opt !== null && opt !== undefined ? String(opt) : ''))
    : ['', '', '', ''];

  let correctIndex =
    typeof record.correctIndex === 'number' && !isNaN(record.correctIndex)
      ? record.correctIndex
      : 0;

  if (correctIndex < 0 || (options.length > 0 && correctIndex >= options.length)) {
    correctIndex = 0;
  }

  const tags: string[] = Array.isArray(record.tags)
    ? record.tags.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
    : [];

  const attemptsHistory: AttemptItem[] = Array.isArray(record.attemptsHistory)
    ? record.attemptsHistory
        .filter((att: unknown): att is Record<string, unknown> => Boolean(att && typeof att === 'object'))
        .map((att: Record<string, unknown>, idx: number) => {
          const rawFeedback = att.aiFeedback as Record<string, unknown> | null | undefined;
          const rawVerdict = rawFeedback?.verdict;
          const verdict: 'Correto' | 'Parcial' | 'Incorreto' =
            rawVerdict === 'Correto' || rawVerdict === 'Parcial' || rawVerdict === 'Incorreto'
              ? rawVerdict
              : 'Incorreto';

          return {
            id: typeof att.id === 'string' ? att.id : `att_${Date.now()}_${idx}`,
            timestamp: typeof att.timestamp === 'number' ? att.timestamp : Date.now(),
            type: att.type === 'open' ? ('open' as const) : ('multiple_choice' as const),
            userTypedAnswer: typeof att.userTypedAnswer === 'string' ? att.userTypedAnswer : undefined,
            aiFeedback:
              rawFeedback && typeof rawFeedback === 'object'
                ? {
                    verdict,
                    feedback: String(rawFeedback.feedback || ''),
                  }
                : null,
            selectedIndex: typeof att.selectedIndex === 'number' ? att.selectedIndex : null,
            isCorrect: typeof att.isCorrect === 'boolean' ? att.isCorrect : undefined,
          };
        })
    : [];

  const rawAiFeedback = record.aiFeedback as Record<string, unknown> | null | undefined;
  const rawMainVerdict = rawAiFeedback?.verdict;
  const mainVerdict: 'Correto' | 'Parcial' | 'Incorreto' =
    rawMainVerdict === 'Correto' || rawMainVerdict === 'Parcial' || rawMainVerdict === 'Incorreto'
      ? rawMainVerdict
      : 'Incorreto';

  const aiFeedback: { verdict: 'Correto' | 'Parcial' | 'Incorreto'; feedback: string } | null =
    rawAiFeedback && typeof rawAiFeedback === 'object'
      ? {
          verdict: mainVerdict,
          feedback: String(rawAiFeedback.feedback || ''),
        }
      : null;

  return {
    id: typeof record.id === 'string' && record.id.trim() ? record.id : `q_${Date.now()}_${fallbackIndex}`,
    type,
    question: typeof record.question === 'string' ? record.question : '',
    options: options.length > 0 ? options : ['', '', '', ''],
    correctIndex,
    tags,
    selectedIndex: typeof record.selectedIndex === 'number' ? record.selectedIndex : null,
    expectedAnswer: typeof record.expectedAnswer === 'string' ? record.expectedAnswer : '',
    userTypedAnswer: typeof record.userTypedAnswer === 'string' ? record.userTypedAnswer : '',
    aiFeedback,
    explanation: typeof record.explanation === 'string' ? record.explanation : '',
    showExplanation: Boolean(record.showExplanation),
    answered: Boolean(record.answered),
    attemptsHistory,
  };
}

/**
 * Normalizes an arbitrary questions payload (raw array, JSON string, or URI-encoded string).
 */
export function normalizeQuizQuestions(rawQuestions: unknown): QuestionItem[] {
  let parsed: unknown = rawQuestions;

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
export function normalizeChatHistory(rawHistory: unknown): QuizChatMessage[] {
  let parsed: unknown = rawHistory;

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
    .filter((m: unknown): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
    .map((m, idx) => ({
      id: typeof m.id === 'string' ? m.id : `msg_${Date.now()}_${idx}`,
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      text: typeof m.text === 'string' ? m.text : '',
      suggestedActions: Array.isArray(m.suggestedActions) ? (m.suggestedActions as SuggestedAction[]) : undefined,
    }));
}
