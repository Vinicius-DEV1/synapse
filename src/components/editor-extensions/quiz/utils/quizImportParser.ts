import {
  sanitizeExpectedAnswer,
  cleanJsonBlock,
  repairMalformedJson,
} from '../../../../services/gemini/quiz-parser';
import type { QuestionItem } from '../types';

/**
 * Maps raw loosely structured parsed question objects from JSON or AI outputs
 * into strictly typed QuestionItem entities, filtering out invalid or empty entries.
 */
export function mapParsedToQuestionItems(items: Array<Record<string, unknown>>): QuestionItem[] {
  if (!Array.isArray(items)) return [];

  const result: QuestionItem[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    if (!item || typeof item !== 'object') continue;

    const rawQuestion =
      item.question ??
      item.enunciado ??
      item.pergunta ??
      item.texto ??
      item.statement ??
      item.titulo ??
      '';
    const questionText = String(rawQuestion).trim();

    // Discard empty draft items that have no question statement
    if (!questionText) {
      continue;
    }

    const rawType = String(item.type || item.tipo || '').toLowerCase();
    const isOpenQuestion =
      rawType.includes('open') ||
      rawType.includes('aberta') ||
      rawType.includes('discursiva') ||
      rawType.includes('dissertativa');

    // Parse options defensively (array of strings, array of objects, or object with letter keys)
    let options: string[] = [];
    let detectedCorrectFromOptionObject: number | null = null;

    const rawOpts =
      item.options ??
      item.alternativas ??
      item.opcoes ??
      item.alternatives;

    if (Array.isArray(rawOpts)) {
      options = rawOpts
        .map((o: unknown, optIdx: number) => {
          if (typeof o === 'string') {
            return o.replace(/^[A-Za-z0-9][).]\s+/, '').trim();
          }
          if (o && typeof o === 'object') {
            const obj = o as Record<string, unknown>;
            if (obj.correct === true || obj.isCorrect === true || obj.correta === true) {
              detectedCorrectFromOptionObject = optIdx;
            }
            const text = obj.text ?? obj.texto ?? obj.label ?? obj.value ?? obj.opcao ?? '';
            return String(text).replace(/^[A-Za-z0-9][).]\s+/, '').trim();
          }
          return String(o ?? '').trim();
        })
        .filter((o) => o.length > 0);
    } else if (rawOpts && typeof rawOpts === 'object') {
      // Handles e.g. { "A": "...", "B": "...", "C": "...", "D": "..." }
      options = Object.values(rawOpts)
        .map((val) => {
          const str = typeof val === 'string' ? val : String(val ?? '');
          return str.replace(/^[A-Za-z0-9][).]\s+/, '').trim();
        })
        .filter((o) => o.length > 0);
    }

    if (!isOpenQuestion && options.length < 2) {
      options = ['', '', '', ''];
    }

    // Parse correct index (number, string digit "1", letter "B", text match, or detected from option)
    let correctIndex = 0;
    if (detectedCorrectFromOptionObject !== null) {
      correctIndex = detectedCorrectFromOptionObject;
    } else {
      const rawCorrect =
        item.correct_option ??
        item.correct_index ??
        item.correctIndex ??
        item.resposta_correta ??
        item.respostaCorreta ??
        item.correta ??
        item.gabarito ??
        item.gabaritoEsperado ??
        item.answer;

      if (typeof rawCorrect === 'number' && !isNaN(rawCorrect)) {
        // If 1-based index provided (e.g. 4 for 4 options with valid 0..3 indices)
        if (options.length > 0 && rawCorrect === options.length) {
          correctIndex = rawCorrect - 1;
        } else {
          correctIndex = Math.max(0, Math.floor(rawCorrect));
        }
      } else if (typeof rawCorrect === 'string') {
        const trimmed = rawCorrect.trim();
        const parsedDigit = parseInt(trimmed, 10);

        if (!isNaN(parsedDigit) && /^\d+$/.test(trimmed)) {
          if (options.length > 0 && parsedDigit === options.length) {
            correctIndex = parsedDigit - 1;
          } else {
            correctIndex = Math.max(0, parsedDigit);
          }
        } else {
          // Check for letter (A-E) e.g. "A", "B)", "Alternativa C", "Opção D"
          // Ensure we don't accidentally match words starting with A-E (e.g. "Brasília")
          const letterMatch =
            /^(?:op[çc][ãa]o|alternativa|option)\s*([A-Ea-e])\b/i.exec(trimmed) ||
            /^([A-Ea-e])(?:[).\s]|$)/i.exec(trimmed);

          if (letterMatch) {
            const letterCode = letterMatch[1].toUpperCase().charCodeAt(0);
            correctIndex = letterCode - 65;
          } else if (options.length > 0) {
            // Check if string matches text of an option
            const matchingIdx = options.findIndex(
              (opt) => opt.toLowerCase() === trimmed.toLowerCase()
            );
            if (matchingIdx !== -1) {
              correctIndex = matchingIdx;
            }
          }
        }
      }
    }

    // Bounds check
    if (options.length > 0 && (correctIndex < 0 || correctIndex >= options.length)) {
      correctIndex = 0;
    }

    // Tags
    const rawTags =
      item.tags ?? item.topicos ?? item.temas ?? item.categories ?? item.subtopicos;
    let tags: string[] = [];
    if (Array.isArray(rawTags)) {
      tags = rawTags.map((t) => String(t).trim()).filter(Boolean);
    } else if (typeof rawTags === 'string') {
      tags = rawTags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    // Expected answer for open questions
    const rawExpected =
      item.expected_answer ??
      item.expectedAnswer ??
      item.resposta_esperada ??
      item.respostaEsperada ??
      item.gabarito ??
      item.resposta ??
      item.criterios ??
      item.rubrica ??
      '';
    const expectedAnswer = sanitizeExpectedAnswer(String(rawExpected).trim());

    // Explanation
    const rawExp =
      item.explanation ??
      item.explicacao ??
      item.justificativa ??
      item.comentario ??
      item.resolucao ??
      item.motivo ??
      item.feedback ??
      '';
    const explanation = String(rawExp).trim();

    result.push({
      id: `q_import_${Date.now()}_${idx}`,
      type: isOpenQuestion ? 'open' : 'multiple_choice',
      question: questionText,
      options: options.length >= 2 ? options : ['', '', '', ''],
      correctIndex,
      tags,
      selectedIndex: null,
      expectedAnswer,
      userTypedAnswer: '',
      aiFeedback: null,
      explanation,
      showExplanation: false,
      answered: false,
    });
  }

  return result;
}

/**
 * Resiliently scans raw text for individual question JSON blocks
 * when complete document JSON.parse fails (salvaging intact questions).
 */
export function extractPartialQuestionsFromMalformedText(rawText: string): QuestionItem[] {
  if (!rawText) return [];
  const candidateObjects: Array<Record<string, unknown>> = [];

  let searchIdx = 0;
  while (searchIdx < rawText.length) {
    const braceStart = rawText.indexOf('{', searchIdx);
    if (braceStart === -1) break;

    let depth = 0;
    let inString = false;
    let escape = false;
    let braceEnd = -1;

    for (let i = braceStart; i < rawText.length; i++) {
      const char = rawText[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') depth++;
        else if (char === '}') {
          depth--;
          if (depth === 0) {
            braceEnd = i;
            break;
          }
        }
      }
    }

    if (braceEnd !== -1) {
      const candidateChunk = rawText.slice(braceStart, braceEnd + 1);
      if (
        candidateChunk.includes('"question"') ||
        candidateChunk.includes('"enunciado"') ||
        candidateChunk.includes('"pergunta"')
      ) {
        try {
          const parsedObj = JSON.parse(candidateChunk);
          if (parsedObj && typeof parsedObj === 'object') {
            candidateObjects.push(parsedObj as Record<string, unknown>);
          }
        } catch {
          try {
            const repaired = repairMalformedJson(candidateChunk);
            const parsedObj = JSON.parse(repaired);
            if (parsedObj && typeof parsedObj === 'object') {
              candidateObjects.push(parsedObj as Record<string, unknown>);
            }
          } catch {
            // Unsalvageable chunk, move to next
          }
        }
      }
      searchIdx = braceEnd + 1;
    } else {
      searchIdx = braceStart + 1;
    }
  }

  return mapParsedToQuestionItems(candidateObjects);
}

/**
 * Parses raw JSON text (handling conversational AI text, markdown fences, DeepSeek reasoning tags,
 * and trailing commas) and returns validated QuestionItem objects.
 */
export function parseJsonToQuestions(raw: string): QuestionItem[] {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Conteúdo vazio ou inválido para importação.');
  }

  // 1. Strip reasoning blocks (e.g. DeepSeek R1 <think>...</think>)
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Extract outermost JSON block using cleanJsonBlock
  cleaned = cleanJsonBlock(cleaned);

  if (!cleaned) {
    throw new Error(
      'Não foi possível encontrar um bloco JSON válido no texto colado. Certifique-se de que o texto contém um array [ ... ] ou objeto com questões.'
    );
  }

  // 3. Attempt JSON parse with automatic trailing-comma repair fallback
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch (initialErr) {
    try {
      const repaired = repairMalformedJson(cleaned);
      parsed = JSON.parse(repaired);
    } catch {
      // If full parse still fails, try resilient chunk extraction
      const partialQuestions = extractPartialQuestionsFromMalformedText(cleaned);
      if (partialQuestions.length > 0) {
        return partialQuestions;
      }
      throw new Error(
        `Erro de sintaxe no JSON: ${initialErr instanceof Error ? initialErr.message : 'JSON malformado'}. Verifique aspas e vírgulas.`
      );
    }
  }

  // 4. Resolve candidate question array from diverse root structures
  let items: Array<Record<string, unknown>> | null = null;

  if (Array.isArray(parsed)) {
    items = parsed as Array<Record<string, unknown>>;
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const candidateList =
      obj.questions ??
      obj.questoes ??
      obj.items ??
      obj.data ??
      obj.bateria ??
      obj.exercises ??
      obj.exercicios;

    if (Array.isArray(candidateList)) {
      items = candidateList as Array<Record<string, unknown>>;
    } else if (obj.question || obj.enunciado || obj.pergunta) {
      // Single question object provided!
      items = [obj];
    }
  }

  if (!items || items.length === 0) {
    throw new Error(
      'Nenhuma lista de questões foi encontrada no JSON. O formato esperado é um array `[ ... ]` ou um objeto com a propriedade `questions`.'
    );
  }

  const mapped = mapParsedToQuestionItems(items);
  if (mapped.length === 0) {
    throw new Error(
      'Nenhuma questão válida com enunciado foi encontrada no JSON fornecido.'
    );
  }

  return mapped;
}
