import { promptGemini } from './client';
import {
  sanitizeExpectedAnswer,
  cleanJsonBlock,
  parseEvaluationVerdict,
} from './quiz-parser';
import {
  buildSingleQuestionPrompt,
  buildOpenQuestionEvaluationPrompt,
  buildBlockQuestionPrompt,
  buildBatchQuestionsPrompt,
  buildQuizAssistantPrompt,
} from './quiz-prompts';

export { sanitizeExpectedAnswer };

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
    throw new Error('A IA não retornou um JSON válido.');
  }
}

// Evaluates student open-ended / discursive question response
export async function promptGeminiForOpenQuestionEvaluation(
  question: string,
  expectedAnswer: string,
  userTypedAnswer: string
): Promise<{
  verdict: 'Correto' | 'Parcial' | 'Incorreto';
  feedback: string;
}> {
  const customPrompt = buildOpenQuestionEvaluationPrompt(
    question,
    expectedAnswer,
    userTypedAnswer
  );
  const response = await promptGemini(customPrompt);
  const responseText = response.text;

  try {
    const cleanJson = cleanJsonBlock(responseText);
    const parsed = JSON.parse(cleanJson);

    const verdict = parseEvaluationVerdict(parsed.verdict);

    return {
      verdict,
      feedback:
        parsed.feedback || parsed.feedbackText || parsed.justification || '',
    };
  } catch (err) {
    console.error(
      'Failed to parse Gemini JSON for open question evaluation:',
      responseText,
      err
    );
    throw new Error('A IA não retornou um JSON válido na avaliação.');
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
    throw new Error('A IA não retornou um JSON válido ao gerar a questão.');
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
    return rawArray.map((q: any) => ({
      type: (q.type || '').toLowerCase().includes('open')
        ? 'open'
        : 'multiple_choice',
      question: q.question || q.enunciado || '',
      options: q.options || q.opcoes,
      correctIndex:
        typeof q.correctIndex === 'number'
          ? q.correctIndex
          : (q.correta ?? 0),
      expectedAnswer: sanitizeExpectedAnswer(
        q.expectedAnswer || q.respostaEsperada || ''
      ),
      explanation: q.explanation || q.explicacao || '',
    }));
  } catch (err) {
    console.error(
      'Failed to parse Gemini JSON for batch question generation:',
      responseText,
      err
    );
    throw new Error(
      'A IA não retornou um JSON válido ao gerar a bateria de questões.'
    );
  }
}

// Interactive AI Pedagogical Quiz Assistant
export async function promptGeminiQuizAssistant(
  chatHistory: Array<{ role: 'user' | 'assistant'; text: string }>,
  currentQuestions: any[],
  userMessage: string,
  contextText?: string,
  blockTitle?: string,
  blockDescription?: string,
  referencedBatteries?: Array<{
    title: string;
    pageTitle?: string;
    questionCount?: number;
    questions: any[];
  }>
): Promise<{
  message: string;
  suggestedActions?: Array<{
    actionType: 'create' | 'edit' | 'delete';
    type?: 'multiple_choice' | 'open';
    question?: string;
    options?: string[];
    correctIndex?: number;
    expectedAnswer?: string;
    explanation?: string;
    targetQuestionIndex?: number;
    changes?: {
      question?: string;
      options?: string[];
      correctIndex?: number;
      expectedAnswer?: string;
      explanation?: string;
    };
    reason?: string;
  }>;
}> {
  const customPrompt = buildQuizAssistantPrompt(
    chatHistory,
    currentQuestions,
    userMessage,
    contextText,
    blockTitle,
    blockDescription,
    referencedBatteries
  );

  const response = await promptGemini(customPrompt);
  const responseText = response.text;

  try {
    const cleanText = cleanJsonBlock(responseText);
    const parsed = JSON.parse(cleanText);

    // Ensure expectedAnswer in suggestedActions is sanitized
    if (Array.isArray(parsed.suggestedActions)) {
      parsed.suggestedActions = parsed.suggestedActions.map((act: any) => {
        if (act.expectedAnswer)
          act.expectedAnswer = sanitizeExpectedAnswer(act.expectedAnswer);
        if (act.changes?.expectedAnswer)
          act.changes.expectedAnswer = sanitizeExpectedAnswer(
            act.changes.expectedAnswer
          );
        return act;
      });
    }

    // Clean up message if it somehow contained raw JSON
    if (
      typeof parsed.message === 'string' &&
      parsed.message.trim().startsWith('{')
    ) {
      const msgMatch = /"message":\s*"([^"]+)"/.exec(parsed.message);
      if (msgMatch) parsed.message = msgMatch[1];
    }

    return parsed;
  } catch (err) {
    console.error(
      'Failed to parse Gemini JSON for quiz assistant:',
      responseText,
      err
    );

    const msgMatch = /"message":\s*"([^"]+)"/.exec(responseText);
    const extractedMsg = msgMatch
      ? msgMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
      : 'Aqui estão as sugestões para a sua bateria:';

    return {
      message: extractedMsg,
    };
  }
}
