import { describe, it, expect } from 'vitest';
import {
  normalizeSingleQuestion,
  normalizeQuizQuestions,
  normalizeChatHistory,
} from './utils/quizNormalizer';

describe('quizNormalizer utils', () => {
  it('normalizes null or empty single question into a safe default question', () => {
    const q = normalizeSingleQuestion(null, 1);
    expect(q.id).toBeDefined();
    expect(q.type).toBe('multiple_choice');
    expect(q.options).toHaveLength(4);
    expect(q.correctIndex).toBe(0);
    expect(q.answered).toBe(false);
  });

  it('preserves valid open question fields and sanitized feedback', () => {
    const raw = {
      id: 'q_test_1',
      type: 'open',
      question: 'Explique o que é CRDT.',
      expectedAnswer: 'Conflict-free Replicated Data Type',
      tags: ['distribuídos', 'tiptap'],
      aiFeedback: {
        verdict: 'Correto',
        feedback: 'Excelente explicação.',
      },
      answered: true,
    };

    const q = normalizeSingleQuestion(raw, 1);
    expect(q.id).toBe('q_test_1');
    expect(q.type).toBe('open');
    expect(q.question).toBe('Explique o que é CRDT.');
    expect(q.expectedAnswer).toBe('Conflict-free Replicated Data Type');
    expect(q.tags).toEqual(['distribuídos', 'tiptap']);
    expect(q.aiFeedback?.verdict).toBe('Correto');
    expect(q.answered).toBe(true);
  });

  it('normalizes quiz questions from JSON string or URI encoded string', () => {
    const rawArray = [
      { id: '1', question: 'Q1', options: ['A', 'B'], correctIndex: 1 },
      { id: '2', question: 'Q2', type: 'open' },
    ];
    const jsonStr = JSON.stringify(rawArray);

    const questionsFromJson = normalizeQuizQuestions(jsonStr);
    expect(questionsFromJson).toHaveLength(2);
    expect(questionsFromJson[0].question).toBe('Q1');
    expect(questionsFromJson[1].type).toBe('open');

    const uriEncoded = encodeURIComponent(jsonStr);
    const questionsFromUri = normalizeQuizQuestions(uriEncoded);
    expect(questionsFromUri).toHaveLength(2);
  });

  it('normalizes chat history defensively', () => {
    const rawChat = [
      { role: 'user', text: 'Me ajude nesta questão' },
      { role: 'assistant', text: 'Claro, observe a fórmula...' },
      null,
      { invalid: true },
    ];

    const chat = normalizeChatHistory(rawChat);
    expect(chat).toHaveLength(3);
    expect(chat[0].role).toBe('user');
    expect(chat[1].role).toBe('assistant');
  });

  it('handles malformed URI strings without throwing unhandled exceptions', () => {
    // Malformed percent-encoding that causes decodeURIComponent to throw URIError
    const malformedUri = '%E0%A4%9';
    const fallbackQuestions = normalizeQuizQuestions(malformedUri);
    expect(fallbackQuestions).toHaveLength(1);
    expect(fallbackQuestions[0].id).toBeDefined();

    const fallbackChat = normalizeChatHistory(malformedUri);
    expect(fallbackChat).toEqual([]);
  });
});
