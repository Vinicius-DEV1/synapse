export const sanitizeExpectedAnswer = (text: string): string => {
  if (!text) return '';
  return text
    .replace(
      /^(O|A|O\(a\)|Os|As)?\s*(aluno|aluna|estudante)(s|\(a\))?\s+(deve|precisa)\s+(explicar|responder|descrever|mencionar|citar|demonstrar|afirmar|dizer)\s+(que|como)\s+/i,
      ''
    )
    .replace(
      /^(Espera-se\s+que\s+(o|a|o\(a\)|os|as)?\s*(aluno|aluna|estudante)(s|\(a\))?\s+(responda|explique|descreva|demonstre|mencione|cite|afirme)\s+(que|como)\s+)/i,
      ''
    )
    .replace(/^(O\s+gabarito\s+esperado\s+é\s+(que\s+)?)/i, '')
    .replace(/^(Deve\s+ser\s+explicado\s+(que|como)\s+)/i, '')
    .replace(
      /^(The\s+student\s+should\s+(explain|answer|describe|mention|demonstrate|state|say|cite)\s+(that|how)\s+)/i,
      ''
    )
    .replace(
      /^(It\s+is\s+expected\s+that\s+(the\s+)?student\s+(responds|explains|describes|demonstrates|mentions|states)\s+(that|how)\s+)/i,
      ''
    )
    .replace(/^(The\s+expected\s+(answer|response|key)\s+is\s+(that\s+)?)/i, '')
    .replace(/^(It\s+should\s+be\s+explained\s+(that|how)\s+)/i, '')
    .replace(/^(Gabarito|Resposta|Answer|Expected\s+Answer):\s*/i, '')
    .replace(/^[a-z]/, (c) => c.toUpperCase());
};

export function cleanJsonBlock(text: string): string {
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const match = /{[\s\S]*}/.exec(clean);
  if (match) {
    clean = match[0];
  }
  return clean;
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
