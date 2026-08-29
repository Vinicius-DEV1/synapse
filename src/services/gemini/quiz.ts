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
 * Splits large document content into chunks along logical boundaries (headers, numbered questions, double newlines).
 */
export function splitDocumentIntoChunks(content: string, maxChunkChars = 20000): string[] {
  const trimmed = content.trim();
  if (trimmed.length <= maxChunkChars) {
    return [trimmed];
  }

  // Potential split boundaries: Markdown headers (#, ##), Question numbers (1., 2), or double newlines
  const paragraphs = trimmed.split(/\n(?=(?:#{1,4}\s|\d+[\.\)]\s|\*{1,2}\d+[\.\)]|Q\d+[\.\:]|Questão\s+\d+))/i);
  const segments = paragraphs.length > 1 ? paragraphs : trimmed.split(/\n\s*\n/);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const seg of segments) {
    if (currentChunk.length + seg.length + 1 > maxChunkChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = seg;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${seg}` : seg;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [trimmed];
}

/**
 * Parses Markdown or PDF document content into structured study questions using Gemini.
 * Automatically splits large documents into chunks to prevent timeouts and output token exhaustion.
 */
export async function promptGeminiToParseDocumentToQuizJSON(
  documentContent: string,
  fileType: 'markdown' | 'pdf',
  onProgress?: (message: string) => void
): Promise<ParsedQuizQuestion[]> {
  const chunks = splitDocumentIntoChunks(documentContent, 20000);
  const allQuestions: ParsedQuizQuestion[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunks.length > 1) {
      onProgress?.(`Analisando lote ${i + 1} de ${chunks.length} com IA...`);
    } else {
      onProgress?.('Analisando documento e estruturando questões com IA...');
    }

    const customPrompt = buildDocumentToQuizPrompt(chunk, fileType);
    // Use generous 90s timeout for document parsing
    const response = await promptGemini(customPrompt, undefined, [], undefined, undefined, 90000);
    const responseText = response.text;

    let parsed: unknown;
    try {
      const cleanJson = cleanJsonBlock(responseText);
      parsed = JSON.parse(cleanJson);
    } catch (err: unknown) {
      console.error(`Failed to parse Gemini JSON for chunk ${i + 1}/${chunks.length}:`, responseText, err);
      if (chunks.length === 1 || allQuestions.length === 0) {
        throw new Error('A IA não conseguiu estruturar as questões do documento em JSON válido.');
      }
      continue;
    }

    const normalized = normalizeRawParsedQuestions(parsed);
    allQuestions.push(...normalized);
  }

  if (allQuestions.length === 0) {
    throw new Error('Nenhuma questão válida encontrada no retorno da IA.');
  }

  return allQuestions;
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

