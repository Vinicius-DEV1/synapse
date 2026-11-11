import { describe, it, expect, vi } from 'vitest';
import {
  normalizeQuizQuestions,
  normalizeSingleQuestion,
  normalizeChatHistory,
} from './utils/quizNormalizer';
import { triggerFireworksAnimation, createDefaultQuestion } from './utils/fireworks';

describe('Quiz Normalizer & State Utilities', () => {
  it('creates a valid default question', () => {
    const q = createDefaultQuestion(1);
    expect(q.id).toBeDefined();
    expect(q.type).toBe('multiple_choice');
    expect(q.options).toEqual(['', '', '', '']);
    expect(q.answered).toBe(false);
    expect(q.selectedIndex).toBeNull();
  });

  it('normalizes single malformed question safely', () => {
    const raw = {
      type: 'invalid_type',
      options: null,
      correctIndex: 99,
      tags: ['tag1', null, '  ', 'tag2'],
      attemptsHistory: [
        {
          timestamp: 12345,
          type: 'multiple_choice',
          selectedIndex: 0,
          isCorrect: true,
        },
        null,
      ],
    };

    const normalized = normalizeSingleQuestion(raw, 1);
    expect(normalized.type).toBe('multiple_choice');
    expect(normalized.options).toEqual(['', '', '', '']);
    expect(normalized.correctIndex).toBe(0);
    expect(normalized.tags).toEqual(['tag1', 'tag2']);
    expect(normalized.attemptsHistory).toHaveLength(1);
    expect(normalized.attemptsHistory?.[0].isCorrect).toBe(true);
  });

  it('normalizes open question with feedback', () => {
    const raw = {
      type: 'open',
      question: 'Explique React?',
      expectedAnswer: 'Biblioteca de UI',
      userTypedAnswer: 'Biblioteca para construir interfaces',
      aiFeedback: {
        verdict: 'Correto',
        feedback: 'Excelente resposta',
      },
    };

    const normalized = normalizeSingleQuestion(raw, 1);
    expect(normalized.type).toBe('open');
    expect(normalized.expectedAnswer).toBe('Biblioteca de UI');
    expect(normalized.userTypedAnswer).toBe('Biblioteca para construir interfaces');
    expect(normalized.aiFeedback?.verdict).toBe('Correto');
  });

  it('normalizes stringified and URI-encoded question payloads', () => {
    const questionsArray = [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: 'Qual a capital do Brasil?',
        options: ['Rio', 'Brasília', 'São Paulo', 'Salvador'],
        correctIndex: 1,
      },
    ];

    const jsonStr = JSON.stringify(questionsArray);
    const fromJson = normalizeQuizQuestions(jsonStr);
    expect(fromJson).toHaveLength(1);
    expect(fromJson[0].question).toBe('Qual a capital do Brasil?');
    expect(fromJson[0].options[1]).toBe('Brasília');

    const uriEncoded = encodeURIComponent(jsonStr);
    const fromUri = normalizeQuizQuestions(uriEncoded);
    expect(fromUri).toHaveLength(1);
    expect(fromUri[0].question).toBe('Qual a capital do Brasil?');
  });

  it('handles null, undefined or empty arrays by returning a default question', () => {
    expect(normalizeQuizQuestions(null)).toHaveLength(1);
    expect(normalizeQuizQuestions(undefined)).toHaveLength(1);
    expect(normalizeQuizQuestions([])).toHaveLength(1);
    expect(normalizeQuizQuestions('invalid json string')).toHaveLength(1);
  });

  it('normalizes AI chat history safely', () => {
    const raw = [
      { id: 'm1', role: 'user', text: 'Ajuda com a questão' },
      { id: 'm2', role: 'assistant', text: 'Aqui estão sugestões', suggestedActions: [] },
      null,
    ];

    const normalized = normalizeChatHistory(raw);
    expect(normalized).toHaveLength(2);
    expect(normalized[0].role).toBe('user');
    expect(normalized[1].role).toBe('assistant');

    const encoded = encodeURIComponent(JSON.stringify(raw));
    expect(normalizeChatHistory(encoded)).toHaveLength(2);
  });

  it('runs triggerFireworksAnimation safely without throwing even if canvas-confetti fails', () => {
    expect(() => {
      triggerFireworksAnimation();
    }).not.toThrow();
  });
});
