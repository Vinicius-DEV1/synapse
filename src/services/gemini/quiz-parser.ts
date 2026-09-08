export interface CandidateQuestionAction {
  actionType: 'create' | 'edit' | 'delete' | 'reorder';
  type?: 'multiple_choice' | 'open';
  question?: string;
  options?: string[];
  correctIndex?: number;
  expectedAnswer?: string;
  explanation?: string;
  targetQuestionIndex?: number;
  order?: number[];
  changes?: Record<string, unknown>;
  reason?: string;
  factCheckVerdict?: 'approved' | 'corrected';
  validatedByModel?: string;
}

export const sanitizeExpectedAnswer = (text: string): string => {
  if (!text) return '';
  return text
    .replace(
      /^(O|A|O\(a\)|Os|As)?\s*(aluno|aluna|estudante)(s|\(a\))?\s+(deve|precisa)\s+(explicar|responder|descrever|mencionar|citar|demonstrar|afirmar|dizer)(\s+(que|como|com|sobre))?\s*[:,-]?\s*/i,
      ''
    )
    .replace(
      /^(Espera-se\s+que\s+(o|a|o\(a\)|os|as)?\s*(aluno|aluna|estudante)(s|\(a\))?\s+(responda|explique|descreva|demonstre|mencione|cite|afirme)(\s+(que|como|com|sobre))?\s*[:,-]?\s*)/i,
      ''
    )
    .replace(/^(O\s+gabarito\s+esperado\s+é\s+(que\s+)?)/i, '')
    .replace(/^(Deve\s+ser\s+explicado\s+(que|como)\s+)/i, '')
    .replace(
      /^(The\s+student\s+should\s+(explain|answer|describe|mention|demonstrate|state|say|cite)(\s+(that|how|with|about))?\s*[:,-]?\s*)/i,
      ''
    )
    .replace(
      /^(It\s+is\s+expected\s+that\s+(the\s+)?student\s+(responds|explains|describes|demonstrates|mentions|states)(\s+(that|how|with|about))?\s*[:,-]?\s*)/i,
      ''
    )
    .replace(/^(The\s+expected\s+(answer|response|key)\s+is\s+(that\s+)?)/i, '')
    .replace(/^(It\s+should\s+be\s+explained\s+(that|how)\s+)/i, '')
    .replace(/^(Gabarito|Resposta|Answer|Expected\s+Answer):\s*/i, '')
    .replace(/^[a-z]/, (c) => c.toUpperCase());
};

/**
 * Strips only outermost markdown code fences without removing internal code backticks.
 */
export function stripOuterMarkdownFence(text: string): string {
  let trimmed = (text || '').trim();
  trimmed = trimmed.replace(/^```(?:json)?\s*\n?/i, '');
  trimmed = trimmed.replace(/\n?```\s*$/i, '');
  return trimmed.trim();
}

/**
 * Cleans the input text to extract the outermost valid JSON block.
 * Preserves inner backticks in code blocks inside JSON strings.
 */
export function cleanJsonBlock(text: string): string {
  if (!text) return '';
  let clean = stripOuterMarkdownFence(text);
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = clean.lastIndexOf('}');
    if (lastBrace > firstBrace) {
      clean = clean.slice(firstBrace, lastBrace + 1);
    }
  } else if (firstBracket !== -1) {
    const lastBracket = clean.lastIndexOf(']');
    if (lastBracket > firstBracket) {
      clean = clean.slice(firstBracket, lastBracket + 1);
    }
  }
  return clean.trim();
}

/**
 * Repairs common malformed JSON syntaxes from LLM generation:
 * - Trailing commas before closing braces/brackets
 * - Missing commas between adjacent objects/arrays
 */
export function repairMalformedJson(raw: string): string {
  if (!raw) return '';
  let repaired = raw.trim();

  // 1. Remove trailing commas before object or array closings
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');

  // 2. Add missing commas between adjacent objects or arrays
  repaired = repaired.replace(/}\s*([{\[])/g, '}, $1');
  repaired = repaired.replace(/]\s*([{\[])/g, '], $1');

  return repaired;
}

/**
 * Normalizes a candidate action object from English or Portuguese fields.
 */
export function normalizeCandidateAction(
  rawAction: unknown,
  totalQuestionsCount?: number
): CandidateQuestionAction {
  const a = (rawAction && typeof rawAction === 'object' ? rawAction : {}) as Record<string, unknown>;

  // Action type normalization
  const rawType = String(a.actionType || a.tipoAcao || a.acao || '').toLowerCase();
  let actionType: 'create' | 'edit' | 'delete' | 'reorder' = 'create';
  if (rawType.includes('reorder') || rawType.includes('reorden') || rawType.includes('orden')) {
    actionType = 'reorder';
  } else if (rawType.includes('edit') || rawType.includes('alter')) {
    actionType = 'edit';
  } else if (rawType.includes('del') || rawType.includes('remov') || rawType.includes('excl')) {
    actionType = 'delete';
  }

  // Question type normalization
  const rawQType = String(a.type || a.tipo || '').toLowerCase();
  const type: 'multiple_choice' | 'open' =
    rawQType.includes('open') || rawQType.includes('abert') || rawQType.includes('dissert')
      ? 'open'
      : 'multiple_choice';

  // Question text normalization
  const rawQuestion =
    a.question ?? a.enunciado ?? a.pergunta ?? a.texto ?? a.titulo ?? '';
  const question = typeof rawQuestion === 'string' ? rawQuestion : String(rawQuestion);

  // Options normalization
  const rawOpts = a.options ?? a.opcoes ?? a.alternativas;
  let options: string[] = [];
  if (Array.isArray(rawOpts)) {
    options = rawOpts.map((o) => (typeof o === 'string' ? o : String(o ?? '')));
  } else if (type === 'multiple_choice') {
    options = ['', '', '', ''];
  }

  // Correct index normalization (supports numbers and letter indices A-E)
  const rawCorrect =
    a.correctIndex ?? a.correta ?? a.indiceCorreto ?? a.respostaCorreta ?? a.gabarito;
  let correctIndex = 0;
  if (typeof rawCorrect === 'number' && !isNaN(rawCorrect)) {
    correctIndex = Math.max(0, Math.floor(rawCorrect));
  } else if (typeof rawCorrect === 'string') {
    const trimmed = rawCorrect.trim().toUpperCase();
    const letterIndex = ['A', 'B', 'C', 'D', 'E'].indexOf(trimmed);
    if (letterIndex !== -1) {
      correctIndex = letterIndex;
    } else {
      const parsedNum = parseInt(trimmed, 10);
      if (!isNaN(parsedNum)) {
        correctIndex = Math.max(0, parsedNum);
      }
    }
  }

  // Expected answer normalization
  const rawExpected =
    a.expectedAnswer ?? a.respostaEsperada ?? a.gabaritoEsperado ?? a.resposta ?? '';
  const expectedAnswer = sanitizeExpectedAnswer(
    typeof rawExpected === 'string' ? rawExpected : String(rawExpected)
  );

  // Explanation normalization
  const rawExp =
    a.explanation ?? a.explicacao ?? a.justificativa ?? a.comentario ?? '';
  const explanation = typeof rawExp === 'string' ? rawExp : String(rawExp);

  // Target question index normalization (handling 1-based prompt instruction vs 0-based array)
  const rawTargetIdx =
    a.targetQuestionIndex ?? a.indiceQuestao ?? a.targetIndex ?? a.indice;
  let targetQuestionIndex: number | undefined;
  if (typeof rawTargetIdx === 'number' && !isNaN(rawTargetIdx)) {
    if (
      typeof totalQuestionsCount === 'number' &&
      totalQuestionsCount > 0 &&
      rawTargetIdx >= 1 &&
      rawTargetIdx <= totalQuestionsCount
    ) {
      targetQuestionIndex = rawTargetIdx - 1;
    } else if (rawTargetIdx > 0 && totalQuestionsCount === undefined) {
      targetQuestionIndex = rawTargetIdx - 1;
    } else {
      targetQuestionIndex = Math.max(0, rawTargetIdx);
    }
  }

  // Changes map normalization for edit actions
  const rawChanges =
    (a.changes ?? a.alteracoes ?? a.modificacoes) as Record<string, unknown> | undefined;
  const changes: Record<string, unknown> = { ...(rawChanges || {}) };
  if (typeof changes.expectedAnswer === 'string') {
    changes.expectedAnswer = sanitizeExpectedAnswer(changes.expectedAnswer);
  } else if (typeof changes.respostaEsperada === 'string') {
    changes.expectedAnswer = sanitizeExpectedAnswer(changes.respostaEsperada);
    delete changes.respostaEsperada;
  }

  if (actionType === 'edit') {
    if (question && !changes.question) changes.question = question;
    if (options.length >= 2 && !changes.options) changes.options = options;
    if (correctIndex !== undefined && changes.correctIndex === undefined)
      changes.correctIndex = correctIndex;
    if (expectedAnswer && !changes.expectedAnswer)
      changes.expectedAnswer = expectedAnswer;
    if (explanation && !changes.explanation) changes.explanation = explanation;
    if (type && !changes.type) changes.type = type;
  }

  // Order normalization for reorder action (handling 1-based prompt instruction vs 0-based array)
  const rawOrder = a.order ?? a.ordem ?? a.sequencia ?? a.indices;
  let order: number[] | undefined;
  if (Array.isArray(rawOrder) && rawOrder.length > 0) {
    order = rawOrder.map((idxVal: unknown) => {
      const num = typeof idxVal === 'number' ? idxVal : parseInt(String(idxVal), 10);
      if (isNaN(num)) return 0;
      if (
        typeof totalQuestionsCount === 'number' &&
        totalQuestionsCount > 0 &&
        num >= 1 &&
        num <= totalQuestionsCount
      ) {
        return num - 1;
      }
      return num > 0 ? num - 1 : Math.max(0, num);
    });
  }

  // Fact-check verdict
  let factCheckVerdict: 'approved' | 'corrected' | undefined;
  const rawVerdict = String(a.factCheckVerdict || '').toLowerCase();
  if (rawVerdict === 'corrected') factCheckVerdict = 'corrected';
  else if (rawVerdict === 'approved') factCheckVerdict = 'approved';

  return {
    actionType,
    type,
    question,
    options,
    correctIndex,
    expectedAnswer,
    explanation,
    targetQuestionIndex,
    order,
    changes: Object.keys(changes).length > 0 ? changes : undefined,
    reason: typeof a.reason === 'string' ? a.reason : undefined,
    factCheckVerdict,
    validatedByModel:
      typeof a.validatedByModel === 'string' ? a.validatedByModel : undefined,
  };
}

/**
 * Resiliently scans raw text for individual question/action JSON blocks
 * when complete document JSON.parse fails.
 */
export function extractPartialSuggestedActions(
  rawText: string,
  totalQuestionsCount?: number
): CandidateQuestionAction[] {
  if (!rawText) return [];
  const actions: CandidateQuestionAction[] = [];

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
        candidateChunk.includes('"actionType"') ||
        candidateChunk.includes('"tipoAcao"')
      ) {
        try {
          const parsedObj = JSON.parse(candidateChunk);
          if (
            (parsedObj.question || parsedObj.enunciado || parsedObj.actionType) &&
            !Array.isArray(parsedObj.suggestedActions)
          ) {
            actions.push(normalizeCandidateAction(parsedObj, totalQuestionsCount));
          }
        } catch {
          try {
            const repaired = repairMalformedJson(candidateChunk);
            const parsedObj = JSON.parse(repaired);
            if (
              (parsedObj.question || parsedObj.enunciado || parsedObj.actionType) &&
              !Array.isArray(parsedObj.suggestedActions)
            ) {
              actions.push(normalizeCandidateAction(parsedObj, totalQuestionsCount));
            }
          } catch {
            const qMatch = /"(?:question|enunciado)":\s*"([^"]+)"/.exec(candidateChunk);
            if (qMatch) {
              actions.push(
                normalizeCandidateAction(
                  {
                    actionType: 'create',
                    question: qMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
                  },
                  totalQuestionsCount
                )
              );
            }
          }
        }
      }
      searchIdx = braceEnd + 1;
    } else {
      searchIdx = braceStart + 1;
    }
  }

  return actions;
}

export function parseEvaluationVerdict(rawVerdict: string): 'Correto' | 'Parcial' | 'Incorreto' {
  const norm = String(rawVerdict || '').toLowerCase().trim();
  if (
    norm.includes('incorret') ||
    norm.includes('incorrect') ||
    norm.includes('wrong') ||
    norm.includes('errad')
  ) {
    return 'Incorreto';
  } else if (norm.includes('parcial') || norm.includes('partial')) {
    return 'Parcial';
  } else if (
    norm.includes('corret') ||
    norm.includes('correct') ||
    norm.includes('right')
  ) {
    return 'Correto';
  }
  return 'Incorreto';
}
