import { describe, it, expect } from 'vitest';
import { extractBatteriesFromContent } from './quizExtractor';

describe('quizExtractor Unit Tests', () => {
  it('extracts batteries from HTML content correctly', () => {
    const questionsData = encodeURIComponent(
      JSON.stringify([
        {
          id: 'q1',
          type: 'multiple_choice',
          question: 'O que é TCP?',
          options: ['Protocolo', 'Hardware'],
          correctIndex: 0,
        },
      ])
    );

    const html = `
      <div>
        <p>Texto introdutório</p>
        <div data-type="question-block" class="question-block" data-title="Bateria de Redes" data-questions="${questionsData}"></div>
      </div>
    `;

    const extracted = extractBatteriesFromContent('page_1', 'Redes de Computadores', html);
    expect(extracted).toHaveLength(1);
    expect(extracted[0].title).toBe('Bateria de Redes');
    expect(extracted[0].pageTitle).toBe('Redes de Computadores');
    expect(extracted[0].questionCount).toBe(1);
    expect(extracted[0].questions[0].question).toBe('O que é TCP?');
  });

  it('extracts batteries from TipTap JSON tree correctly', () => {
    const jsonContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Nota de aula' }],
        },
        {
          type: 'questionBlock',
          attrs: {
            title: 'Exercícios de Álgebra',
            questions: [
              {
                id: 'q10',
                type: 'open',
                question: 'Defina espaço vetorial',
                expectedAnswer: 'Conjunto fechado...',
              },
            ],
          },
        },
      ],
    };

    const extracted = extractBatteriesFromContent('page_2', 'Matemática', jsonContent);
    expect(extracted).toHaveLength(1);
    expect(extracted[0].title).toBe('Exercícios de Álgebra');
    expect(extracted[0].questionCount).toBe(1);
    expect(extracted[0].questions[0].type).toBe('open');
  });

  it('returns empty array when content has no quiz blocks', () => {
    const extracted = extractBatteriesFromContent('page_3', 'Página Vazia', '<p>Apenas texto</p>');
    expect(extracted).toEqual([]);
  });
});
