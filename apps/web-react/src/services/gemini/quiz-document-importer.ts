import { promptGemini } from './client';
import { cleanJsonBlock, sanitizeExpectedAnswer } from './quiz-parser';
import {
  buildDocumentToQuizPrompt,
  buildRefineImportedQuestionsPrompt,
} from './quiz-prompts';

export interface ParsedQuizQuestion {
  type: 'multiple_choice' | 'open';
  question: string;
  options: string[];
  correctIndex: number;
  expectedAnswer: string;
  explanation: string;
  tags?: string[];
}

export function normalizeRawParsedQuestions(parsed: unknown): ParsedQuizQuestion[] {
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

  let responseText: string;
  try {
    // Generous 180s (3 minutes) timeout for parsing large documents in a single pass
    const response = await promptGemini(customPrompt, undefined, [], undefined, undefined, 180000);
    responseText = response.text;
  } catch (err: unknown) {
    console.error('Error during Gemini document parsing request:', err);
    if (err instanceof Error) {
      if (
        err.name === 'AbortError' ||
        err.message.toLowerCase().includes('timeout') ||
        err.message.toLowerCase().includes('tempo limite') ||
        err.message.toLowerCase().includes('aborted')
      ) {
        throw new Error(
          'Tempo limite excedido ao processar o documento. O arquivo é extenso ou a conexão demorou para responder. Tente novamente.',
          { cause: err }
        );
      }
      if (
        err.message.includes('RATE_LIMIT') ||
        err.message.includes('cota excedida') ||
        err.message.includes('429')
      ) {
        throw new Error(
          'Limite de requisições da IA atingido. Aguarde alguns instantes ou verifique suas chaves nas Configurações.',
          { cause: err }
        );
      }
      throw err;
    }
    throw new Error('Falha na comunicação com a IA ao analisar o documento.', { cause: err });
  }

  let parsed: unknown;
  try {
    const cleanJson = cleanJsonBlock(responseText);
    parsed = JSON.parse(cleanJson);
  } catch (err: unknown) {
    console.error('Failed to parse Gemini JSON for document import:', responseText, err);
    throw new Error(
      'A IA não conseguiu estruturar as questões do documento em um JSON válido. Verifique se o conteúdo possui formato legível.',
      { cause: err }
    );
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
    throw new Error('A IA não conseguiu refinar as questões com a instrução fornecida.', { cause: err });
  }

  const normalized = normalizeRawParsedQuestions(parsed);
  if (normalized.length === 0) {
    throw new Error('Nenhuma questão retornada após o refinamento.');
  }

  return normalized;
}
