/**
 * Pure parsing, sanitization and repair utilities for Gemini Quiz generation.
 */

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
  repaired = repaired.replace(/}\s*([{[])/g, '}, $1');
  repaired = repaired.replace(/]\s*([{[])/g, '], $1');

  return repaired;
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
