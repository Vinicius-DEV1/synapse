import { promptGemini } from './client';
import {
  sanitizeExpectedAnswer,
  cleanJsonBlock,
  repairMalformedJson,
} from './quiz-parser';
import {
  buildSingleQuestionPrompt,
  buildBlockQuestionPrompt,
  buildBatchQuestionsPrompt,
  getCadernoQuizJsonSchemaPrompt,
  formatQuestionsForAiContext,
} from './quiz-prompts';
import {
  validateCandidateQuizQuestions,
  type CandidateQuestionAction,
  type QuizValidationResult,
} from './quiz-validator';

export {
  sanitizeExpectedAnswer,
  cleanJsonBlock,
  repairMalformedJson,
  getCadernoQuizJsonSchemaPrompt,
  formatQuestionsForAiContext,
  validateCandidateQuizQuestions,
};
export type { CandidateQuestionAction, QuizValidationResult };

// Re-export sub-module functions for backward compatibility and clean API boundary
export * from './quiz-evaluator';
export * from './quiz-assistant';
export * from './quiz-document-importer';

// Creates a study question automatically via JSON
export async function promptGeminiForQuestion(
  prompt: string,
  imageBase64?: string
): Promise<{
  enunciado: string;
  opcoes: string[];
  correta: number; // 0-based index
}> {
  const customPrompt = buildSingleQuestionPrompt(prompt);
  const response = await promptGemini(customPrompt, imageBase64);
  const responseText = response.text;

  try {
    const cleanJson = cleanJsonBlock(responseText);
    const parsed = JSON.parse(cleanJson);
    return {
      enunciado: parsed.enunciado || parsed.question || '',
      opcoes: parsed.opcoes || parsed.options || [],
      correta:
        typeof parsed.correta === 'number'
          ? parsed.correta
          : (parsed.correctIndex ?? 0),
    };
  } catch (err) {
    console.error('Failed to parse Gemini JSON for question:', responseText, err);
    throw new Error('A IA não retornou um JSON válido.', { cause: err });
  }
}

// Generates or autofills a single study question for the block
export async function promptGeminiToGenerateBlockQuestion(
  topicOrPrompt: string,
  questionType: 'multiple_choice' | 'open',
  contextText?: string
): Promise<{
  enunciado: string;
  opcoes?: string[];
  correta?: number;
  respostaEsperada?: string;
  explicacao?: string;
}> {
  const customPrompt = buildBlockQuestionPrompt(
    topicOrPrompt,
    questionType,
    contextText
  );
  const response = await promptGemini(customPrompt);
  const responseText = response.text;

  try {
    const cleanJson = cleanJsonBlock(responseText);
    const parsed = JSON.parse(cleanJson);
    return {
      enunciado: parsed.enunciado || parsed.question || '',
      opcoes: parsed.opcoes || parsed.options,
      correta:
        typeof parsed.correta === 'number' ? parsed.correta : parsed.correctIndex,
      respostaEsperada: sanitizeExpectedAnswer(
        parsed.respostaEsperada || parsed.expectedAnswer || ''
      ),
      explicacao: parsed.explicacao || parsed.explanation || '',
    };
  } catch (err) {
    console.error(
      'Failed to parse Gemini JSON for block question generation:',
      responseText,
      err
    );
    throw new Error('A IA não retornou um JSON válido ao gerar a questão.', { cause: err });
  }
}

// Generates a batch of N study questions at once
export async function promptGeminiToGenerateBatchQuestions(
  topicOrPrompt: string,
  count: number = 3,
  contextText?: string
): Promise<
  Array<{
    type: 'multiple_choice' | 'open';
    question: string;
    options?: string[];
    correctIndex?: number;
    expectedAnswer?: string;
    explanation?: string;
  }>
> {
  const customPrompt = buildBatchQuestionsPrompt(
    topicOrPrompt,
    count,
    contextText
  );
  const response = await promptGemini(customPrompt);
  const responseText = response.text;

  try {
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    const rawArray = Array.isArray(parsed) ? parsed : [parsed];
    return rawArray.map((q: Record<string, unknown>) => ({
      type: (typeof q.type === 'string' && q.type.toLowerCase().includes('open'))
        ? 'open'
        : 'multiple_choice',
      question: (q.question as string) || (q.enunciado as string) || '',
      options: (q.options as string[]) || (q.opcoes as string[]),
      correctIndex:
        typeof q.correctIndex === 'number'
          ? q.correctIndex
          : (typeof q.correta === 'number' ? q.correta : 0),
      expectedAnswer: sanitizeExpectedAnswer(
        (q.expectedAnswer as string) || (q.respostaEsperada as string) || ''
      ),
      explanation: (q.explanation as string) || (q.explicacao as string) || '',
    }));
  } catch (err) {
    console.error(
      'Failed to parse Gemini JSON for batch question generation:',
      responseText,
      err
    );
    throw new Error(
      'A IA não retornou um JSON válido ao gerar a bateria de questões.',
      { cause: err }
    );
  }
}
