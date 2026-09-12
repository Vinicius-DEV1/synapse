import { sanitizeExpectedAnswer } from '../../../../services/gemini';
import type { QuestionItem } from '../types';

/**
 * Maps raw loosely structured parsed question objects from JSON or AI outputs
 * into strictly typed QuestionItem entities.
 */
export function mapParsedToQuestionItems(items: Array<Record<string, unknown>>): QuestionItem[] {
  return items.map((item, idx): QuestionItem => {
    const rawType = String(item.type || item.tipo || '').toLowerCase();
    const isOpenQuestion =
      rawType.includes('open') ||
      rawType.includes('aberta') ||
      rawType.includes('discursiva') ||
      rawType.includes('dissertativa');

    let options: string[] = [];
    const rawOpts =
      item.options || item.alternativas || item.opcoes || item.alternatives || [];
    if (Array.isArray(rawOpts) && rawOpts.length >= 2) {
      options = rawOpts.map((o: unknown) => {
        const str = typeof o === 'string' ? o : String(o);
        return str.replace(/^[A-Za-z0-9][).]\s+/, '').trim();
      });
    }
    if (!isOpenQuestion && options.length < 2) options = ['', '', '', ''];

    let correctIndex = 0;
    const rawCorrect =
      item.correct_option ??
      item.resposta_correta ??
      item.correctIndex ??
      item.correta;
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
      id: `q_import_${Date.now()}_${idx}`,
      type: isOpenQuestion ? 'open' : 'multiple_choice',
      question: String(item.question || item.enunciado || item.pergunta || item.texto || '').trim(),
      options: options.length >= 2 ? options : ['', '', '', ''],
      correctIndex,
      tags,
      selectedIndex: null,
      expectedAnswer: sanitizeExpectedAnswer(
        String(item.expected_answer || item.resposta_esperada || item.gabarito || item.expectedAnswer || '')
      ),
      userTypedAnswer: '',
      aiFeedback: null,
      explanation: String(
        item.explanation || item.explicacao || item.justificativa || item.comentario || ''
      ).trim(),
      showExplanation: false,
      answered: false,
    };
  });
}

/**
 * Parses raw JSON text (handling markdown code fence wrappers if present)
 * and returns validated QuestionItem objects.
 */
export function parseJsonToQuestions(raw: string): QuestionItem[] {
  const json = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());

  const items: Array<Record<string, unknown>> | null = Array.isArray(json)
    ? json
    : Array.isArray(json.questions)
      ? json.questions
      : Array.isArray(json.questoes)
        ? json.questoes
        : Array.isArray(json.items)
          ? json.items
          : null;

  if (!items) {
    throw new Error(
      'Não encontrei uma lista de questões no JSON. Verifique se o formato é um array ou contém a chave "questions".'
    );
  }

  return mapParsedToQuestionItems(items);
}
