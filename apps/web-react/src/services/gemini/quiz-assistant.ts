import { promptGemini } from './client';
import { getSettings } from '../../utils/settings';
import {
  cleanJsonBlock,
  repairMalformedJson,
  normalizeCandidateAction,
  extractPartialSuggestedActions,
  type CandidateQuestionAction,
} from './quiz-parser';
import { buildQuizAssistantPrompt, type PromptQuizQuestionItem } from './quiz-prompts';
import { validateCandidateQuizQuestions } from './quiz-validator';

// Interactive AI Pedagogical Quiz Assistant
export async function promptGeminiQuizAssistant(
  chatHistory: Array<{ role: 'user' | 'assistant'; text: string }>,
  currentQuestions: PromptQuizQuestionItem[],
  userMessage: string,
  contextText?: string,
  blockTitle?: string,
  blockDescription?: string,
  referencedBatteries?: Array<{
    title: string;
    pageTitle?: string;
    questionCount?: number;
    questions: PromptQuizQuestionItem[];
  }>,
  onProgress?: (step: 'generating' | 'validating', model: string) => void
): Promise<{
  message: string;
  suggestedActions?: CandidateQuestionAction[];
  validationSummary?: string;
}> {
  const settings = getSettings();
  const generatorModel =
    settings.geminiModelQuizGenerator ||
    settings.geminiModelChat ||
    settings.geminiModel;
  const cleanGeneratorModel = (generatorModel || 'gemini').replace(/^models\//, '');

  if (onProgress) {
    onProgress('generating', cleanGeneratorModel);
  }

  const customPrompt = buildQuizAssistantPrompt(
    chatHistory,
    currentQuestions,
    userMessage,
    contextText,
    blockTitle,
    blockDescription,
    referencedBatteries
  );

  const response = await promptGemini(
    customPrompt,
    undefined,
    [],
    generatorModel || undefined
  );
  const responseText = response.text;

  let parsed: {
    message?: string;
    suggestedActions?: CandidateQuestionAction[];
    validationSummary?: string;
  };

  const cleanText = cleanJsonBlock(responseText);

  try {
    parsed = JSON.parse(cleanText);
  } catch {
    try {
      const repaired = repairMalformedJson(cleanText);
      parsed = JSON.parse(repaired);
    } catch {
      console.warn(
        '[QuizAssistant] Standard and repaired JSON.parse failed. Engaging resilient fallback question extraction.'
      );
      const extractedActions = extractPartialSuggestedActions(
        responseText,
        currentQuestions.length
      );
      const msgMatch = /"message":\s*"([^"]+)"/.exec(responseText);
      const extractedMsg = msgMatch
        ? msgMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
        : 'Aqui estão as sugestões para a sua bateria:';

      parsed = {
        message: extractedMsg,
        suggestedActions: extractedActions,
      };
    }
  }

  // Ensure suggestedActions is an array and normalize all candidate actions
  if (Array.isArray(parsed.suggestedActions) && parsed.suggestedActions.length > 0) {
    parsed.suggestedActions = parsed.suggestedActions.map((act: unknown) =>
      normalizeCandidateAction(act, currentQuestions.length)
    );
  } else {
    // If suggestedActions was missing or empty in parsed object, attempt fallback extraction
    const fallbackActions = extractPartialSuggestedActions(
      responseText,
      currentQuestions.length
    );
    if (fallbackActions.length > 0) {
      parsed.suggestedActions = fallbackActions;
    }
  }

  // Clean up message if it somehow contained raw JSON
  if (
    typeof parsed.message === 'string' &&
    parsed.message.trim().startsWith('{')
  ) {
    const msgMatch = /"message":\s*"([^"]+)"/.exec(parsed.message);
    if (msgMatch) parsed.message = msgMatch[1];
  }

  if (!parsed.message || typeof parsed.message !== 'string') {
    parsed.message = 'Aqui estão as sugestões para a sua bateria:';
  }

  // Dual AI Validation: only run for newly created questions if enabled in settings
  const isDualAiEnabled = settings.quizDualAiValidation !== false;
  const hasCreateActions =
    Array.isArray(parsed.suggestedActions) &&
    parsed.suggestedActions.some(
      (act: CandidateQuestionAction) => act.actionType === 'create'
    );

  if (isDualAiEnabled && hasCreateActions && parsed.suggestedActions) {
    const validatorModel =
      settings.geminiModelQuizValidator ||
      settings.geminiModelChat ||
      settings.geminiModel;
    const cleanValidatorModel = (validatorModel || 'gemini').replace(
      /^models\//,
      ''
    );

    if (onProgress) {
      onProgress('validating', cleanValidatorModel);
    }

    try {
      const valResult = await validateCandidateQuizQuestions(
        parsed.suggestedActions,
        userMessage,
        contextText,
        validatorModel
      );

      parsed.suggestedActions = valResult.actions;
      if (valResult.validationSummary) {
        parsed.validationSummary = valResult.validationSummary;
      }
    } catch (valErr) {
      console.warn('[QuizAssistant] Dual-AI validation error, continuing with generator questions:', valErr);
    }
  }

  return {
    message: parsed.message,
    suggestedActions: parsed.suggestedActions,
    validationSummary: parsed.validationSummary,
  };
}
