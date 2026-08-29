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
  buildDocumentToQuizPrompt,
  buildRefineImportedQuestionsPrompt,
  getCadernoQuizJsonSchemaPrompt,
} from './quiz-prompts';

export { sanitizeExpectedAnswer, getCadernoQuizJsonSchemaPrompt };


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

export interface ParsedQuizQuestion {
  type: 'multiple_choice' | 'open';
  question: string;
  options: string[];
  correctIndex: number;
  expectedAnswer: string;
  explanation: string;
  tags?: string[];
}

function normalizeRawParsedQuestions(parsed: unknown): ParsedQuizQuestion[] {
  let items: unknown[] = [];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    const nested = obj.questions || obj.questoes || obj.items;
    if (Array.isArray(nested)) {
      items = nested;
    }
  }

  return (items as Array<Record<string, unknown>>).map((item) => {
    const rawType = String(item.type || item.tipo || '').toLowerCase();
    const isOpen =
      rawType.includes('open') ||
      rawType.includes('aberta') ||
      rawType.includes('discursiva') ||
      rawType.includes('dissertativa');

    let options: string[] = [];
    const rawOpts = item.options || item.opcoes || item.alternativas || item.alternatives;
    if (Array.isArray(rawOpts)) {
      options = rawOpts.map((o) => {
        const str = typeof o === 'string' ? o : String(o);
        return str.replace(/^[A-Za-z0-9][).]\s+/, '').trim();
      });
    }
    if (!isOpen && options.length < 2) {
      options = ['', '', '', ''];
    }

    let correctIndex = 0;
    const rawCorrect =
      item.correctIndex ?? item.correct_option ?? item.correta ?? item.resposta_correta;
    if (typeof rawCorrect === 'number') {
      correctIndex = rawCorrect;
    } else if (typeof rawCorrect === 'string') {
      const letter = rawCorrect.trim().toUpperCase().charCodeAt(0);
      if (letter >= 65 && letter <= 90) {
        correctIndex = letter - 65;
      }
    }

    const rawTags = item.tags || item.topicos;
    const tags = Array.isArray(rawTags)
      ? rawTags.map((t) => String(t).trim()).filter(Boolean)
      : [];

    return {
      type: isOpen ? 'open' : 'multiple_choice',
      question: String(item.question || item.enunciado || item.pergunta || item.texto || '').trim(),
      options: options.length >= 2 ? options : ['', '', '', ''],
      correctIndex,
      expectedAnswer: sanitizeExpectedAnswer(
        String(item.expectedAnswer || item.expected_answer || item.respostaEsperada || item.gabarito || '')
      ),
      explanation: String(item.explanation || item.explicacao || item.justificativa || item.comentario || '').trim(),
      tags,
    };
  });
}

/**
 * Parses Markdown or PDF document content into structured study questions using Gemini.
 * Processes the full document directly in a single request with an extended timeout (180s)
 * and robust error handling.
 */
export async function promptGeminiToParseDocumentToQuizJSON(
  documentContent: string,
  fileType: 'markdown' | 'pdf',
  onProgress?: (message: string) => void
): Promise<ParsedQuizQuestion[]> {
  onProgress?.('Analisando documento completo e estruturando questões com IA...');

  const customPrompt = buildDocumentToQuizPrompt(documentContent, fileType);

  let responseText = '';
  try {
    // Generous 180s (3 minutes) timeout for parsing large documents in a single pass
    const response = await promptGemini(customPrompt, undefined, [], undefined, undefined, 180000);
    responseText = response.text;
  } catch (err: unknown) {
    console.error('Error during Gemini document parsing request:', err);
    if (err instanceof Error) {
      if (err.name === 'AbortError' || err.message.toLowerCase().includes('timeout') || err.message.toLowerCase().includes('tempo limite') || err.message.toLowerCase().includes('aborted')) {
        throw new Error('Tempo limite excedido ao processar o documento. O arquivo é extenso ou a conexão demorou para responder. Tente novamente.');
      }
      if (err.message.includes('RATE_LIMIT') || err.message.includes('cota excedida') || err.message.includes('429')) {
        throw new Error('Limite de requisições da IA atingido. Aguarde alguns instantes ou verifique suas chaves nas Configurações.');
      }
      throw err;
    }
    throw new Error('Falha na comunicação com a IA ao analisar o documento.');
  }

  let parsed: unknown;
  try {
    const cleanJson = cleanJsonBlock(responseText);
    parsed = JSON.parse(cleanJson);
  } catch (err: unknown) {
    console.error('Failed to parse Gemini JSON for document import:', responseText, err);
    throw new Error('A IA não conseguiu estruturar as questões do documento em um JSON válido. Verifique se o conteúdo possui formato legível.');
  }

  const normalized = normalizeRawParsedQuestions(parsed);
  if (normalized.length === 0) {
    throw new Error('Nenhuma questão válida encontrada no retorno da IA.');
  }

  return normalized;
}

/**
 * Refines, deduplicates, or adjusts an existing list of questions based on a user instruction.
 */
export async function promptGeminiToRefineImportedQuestions(
  currentQuestions: unknown[],
  instruction: string
): Promise<ParsedQuizQuestion[]> {
  const customPrompt = buildRefineImportedQuestionsPrompt(currentQuestions, instruction);
  const response = await promptGemini(customPrompt);
  const responseText = response.text;

  let parsed: unknown;
  try {
    const cleanJson = cleanJsonBlock(responseText);
    parsed = JSON.parse(cleanJson);
  } catch (err: unknown) {
    console.error('Failed to parse Gemini JSON for questions refinement:', responseText, err);
    throw new Error('A IA não conseguiu refinar as questões com a instrução fornecida.');
  }

  const normalized = normalizeRawParsedQuestions(parsed);
  if (normalized.length === 0) {
    throw new Error('Nenhuma questão retornada após o refinamento.');
  }

  return normalized;
}

