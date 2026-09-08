import { promptGemini } from './client';
import { cleanJsonBlock, sanitizeExpectedAnswer } from './quiz-parser';
import { buildQuizValidationPrompt } from './quiz-prompts';

export interface CandidateQuestionAction {
  actionType: 'create' | 'edit' | 'delete';
  type?: 'multiple_choice' | 'open';
  question?: string;
  options?: string[];
  correctIndex?: number;
  expectedAnswer?: string;
  explanation?: string;
  targetQuestionIndex?: number;
  changes?: Record<string, unknown>;
  reason?: string;
  factCheckVerdict?: 'approved' | 'corrected';
  validatedByModel?: string;
}

export interface QuizValidationResult {
  actions: CandidateQuestionAction[];
  validationSummary?: string;
  hasCorrections: boolean;
  validatedModel?: string;
}

/**
 * Validates generated quiz questions through a second AI model (IA 2 / Fact-Checker).
 * Analyzes factual precision, eliminates hallucinations, and ensures answer validity.
 *
 * Fail-safe: If anything fails (network error, timeout, 429, invalid JSON),
 * it returns the original candidate actions unchanged without throwing errors.
 */
export async function validateCandidateQuizQuestions(
  actions: CandidateQuestionAction[],
  userMessageOrTopic?: string,
  contextText?: string,
  modelId?: string
): Promise<QuizValidationResult> {
  const createActions = actions.filter((a) => a.actionType === 'create');

  // If there are no create actions, there is nothing to validate
  if (createActions.length === 0) {
    return {
      actions,
      hasCorrections: false,
    };
  }

  const cleanModelName = (modelId || '').replace(/^models\//, '') || undefined;

  try {
    const candidatePayload = createActions.map((a) => ({
      type: a.type || 'multiple_choice',
      question: a.question || '',
      options: a.options || [],
      correctIndex: typeof a.correctIndex === 'number' ? a.correctIndex : 0,
      expectedAnswer: a.expectedAnswer || '',
      explanation: a.explanation || '',
    }));

    const prompt = buildQuizValidationPrompt(
      candidatePayload,
      userMessageOrTopic,
      contextText
    );

    const response = await promptGemini(
      prompt,
      undefined,
      [],
      modelId || undefined
    );
    const cleanText = cleanJsonBlock(response.text);
    const parsed = JSON.parse(cleanText);

    const validatedList: unknown[] = Array.isArray(parsed.validatedQuestions)
      ? parsed.validatedQuestions
      : Array.isArray(parsed)
      ? parsed
      : [];

    if (validatedList.length === 0) {
      console.warn(
        '[QuizDualAI] Validator returned empty list, preserving original questions.'
      );
      return { actions, hasCorrections: false };
    }

    let hasCorrections = false;
    let createIndex = 0;

    const mergedActions = actions.map((act) => {
      if (act.actionType !== 'create') return act;

      const vItem = validatedList[createIndex] as
        | Record<string, unknown>
        | undefined;
      createIndex++;

      if (!vItem) {
        return {
          ...act,
          validatedByModel: cleanModelName,
        };
      }

      const isCorrected =
        vItem.factCheckVerdict === 'corrected' ||
        Boolean(
          vItem.improvements &&
            !String(vItem.improvements).includes('sem inconsistências')
        );

      if (isCorrected) {
        hasCorrections = true;
      }

      const rawOpts = vItem.options;
      const options =
        Array.isArray(rawOpts) && rawOpts.length >= 2
          ? rawOpts.map((o) => String(o))
          : act.options;

      return {
        ...act,
        type:
          vItem.type === 'open'
            ? ('open' as const)
            : ('multiple_choice' as const),
        question:
          typeof vItem.question === 'string' && vItem.question.trim()
            ? vItem.question
            : act.question,
        options,
        correctIndex:
          typeof vItem.correctIndex === 'number'
            ? vItem.correctIndex
            : act.correctIndex,
        expectedAnswer:
          typeof vItem.expectedAnswer === 'string'
            ? sanitizeExpectedAnswer(vItem.expectedAnswer)
            : act.expectedAnswer,
        explanation:
          typeof vItem.explanation === 'string' && vItem.explanation.trim()
            ? vItem.explanation
            : act.explanation,
        factCheckVerdict: (vItem.factCheckVerdict === 'corrected'
          ? 'corrected'
          : 'approved') as 'approved' | 'corrected',
        validatedByModel: cleanModelName,
      };
    });

    return {
      actions: mergedActions,
      validationSummary:
        typeof parsed.validationSummary === 'string'
          ? parsed.validationSummary
          : undefined,
      hasCorrections,
      validatedModel: cleanModelName,
    };
  } catch (error) {
    // Fail-safe: log warning and fallback cleanly to original generator output
    console.warn(
      '[QuizDualAI] 2nd AI review failed or timed out. Gracefully falling back to generator output:',
      error
    );
    return {
      actions,
      hasCorrections: false,
    };
  }
}
