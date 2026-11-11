import { describe, it, expect } from 'vitest';
import {
  parseJsonToQuestions,
  mapParsedToQuestionItems,
  extractPartialQuestionsFromMalformedText,
} from './quizImportParser';
import { formatQuestionsForAiContext } from '../../../../services/gemini/quiz-prompts';

describe('quizImportParser & formatQuestionsForAiContext Unit Tests', () => {
  describe('parseJsonToQuestions', () => {
    it('parses a clean standard JSON array of questions', () => {
      const json = JSON.stringify([
        {
          type: 'multiple_choice',
          question: 'O que é polimorfismo?',
          options: ['A', 'B', 'C', 'D'],
          correct_option: 1,
          tags: ['POO', 'Conceitos'],
          explanation: 'Permite que classes derivadas compartilhem métodos.',
        },
        {
          type: 'open',
          question: 'Explique o princípio SRP.',
          expected_answer: 'Uma classe deve ter apenas um motivo para mudar.',
          tags: ['SOLID'],
          explanation: 'Princípio da responsabilidade única.',
        },
      ]);

      const questions = parseJsonToQuestions(json);
      expect(questions).toHaveLength(2);
      expect(questions[0].type).toBe('multiple_choice');
      expect(questions[0].question).toBe('O que é polimorfismo?');
      expect(questions[0].correctIndex).toBe(1);
      expect(questions[0].tags).toEqual(['POO', 'Conceitos']);

      expect(questions[1].type).toBe('open');
      expect(questions[1].expectedAnswer).toBe('Uma classe deve ter apenas um motivo para mudar.');
    });

    it('extracts JSON when surrounded by conversational AI intro and outro text', () => {
      const raw = `
Aqui estão as questões que você solicitou sobre C#:

\`\`\`json
[
  {
    "type": "multiple_choice",
    "question": "Qual é a diferença entre struct e class em C#?",
    "options": ["Struct é valor, class é referência", "Não há diferença", "Struct é abstrato", "Class é estático"],
    "correct_option": 0,
    "explanation": "Structs são alocados na pilha/stack como value types."
  }
]
\`\`\`

Espero que ajude nos seus estudos! Se precisar de mais questões, é só pedir.
`;

      const questions = parseJsonToQuestions(raw);
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('Qual é a diferença entre struct e class em C#?');
      expect(questions[0].correctIndex).toBe(0);
    });

    it('strips DeepSeek reasoning <think> blocks before parsing', () => {
      const raw = `
<think>
O usuário precisa de uma questão sobre garbage collection em .NET.
Vou criar uma questão focada no IDisposable e finalizers.
</think>
\`\`\`json
[
  {
    "type": "multiple_choice",
    "question": "Qual método da interface IDisposable libera recursos não gerenciados?",
    "options": ["Dispose()", "Finalize()", "Close()", "Release()"],
    "correct_option": 0,
    "explanation": "O método Dispose() é o padrão para liberação determinística."
  }
]
\`\`\`
`;

      const questions = parseJsonToQuestions(raw);
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('Qual método da interface IDisposable libera recursos não gerenciados?');
      expect(questions[0].correctIndex).toBe(0);
    });

    it('repairs trailing commas gracefully', () => {
      const malformedWithTrailingCommas = `
[
  {
    "type": "multiple_choice",
    "question": "O que é async/await?",
    "options": ["Recurso para assincronia", "Comando de thread direta", "Loop", "Variável",],
    "correct_option": 0,
  },
]
`;
      const questions = parseJsonToQuestions(malformedWithTrailingCommas);
      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('O que é async/await?');
    });

    it('supports root object with questions property or single question object', () => {
      const wrappedInObj = JSON.stringify({
        questions: [
          {
            question: 'Questão encapsulada em objeto',
            options: ['A', 'B'],
            correct_option: 0,
          },
        ],
      });

      const parsedWrapped = parseJsonToQuestions(wrappedInObj);
      expect(parsedWrapped).toHaveLength(1);
      expect(parsedWrapped[0].question).toBe('Questão encapsulada em objeto');

      const singleObj = JSON.stringify({
        question: 'Questão única em formato de objeto',
        options: ['Sim', 'Não'],
        correct_option: 0,
      });

      const parsedSingle = parseJsonToQuestions(singleObj);
      expect(parsedSingle).toHaveLength(1);
      expect(parsedSingle[0].question).toBe('Questão única em formato de objeto');
    });

    it('throws meaningful error when no valid question is found', () => {
      expect(() => parseJsonToQuestions('texto sem json algum')).toThrow();
      expect(() => parseJsonToQuestions(JSON.stringify([{ question: '' }]))).toThrow();
    });
  });

  describe('mapParsedToQuestionItems', () => {
    it('correctly maps string numbers in correct_option ("1", "2", "3", "0")', () => {
      const items = [
        {
          question: 'Teste de gabarito em string numérica',
          options: ['Opção 0', 'Opção 1', 'Opção 2', 'Opção 3'],
          correct_option: '2',
        },
        {
          question: 'Teste de gabarito "0"',
          options: ['Opção 0', 'Opção 1'],
          correct_option: '0',
        },
      ];

      const mapped = mapParsedToQuestionItems(items);
      expect(mapped[0].correctIndex).toBe(2);
      expect(mapped[1].correctIndex).toBe(0);
    });

    it('correctly maps letter options ("A", "B", "C", "D", "Alternativa B")', () => {
      const items = [
        {
          question: 'Teste com letra B',
          options: ['Opção 0', 'Opção 1', 'Opção 2'],
          correct_option: 'B',
        },
        {
          question: 'Teste com Alternativa C',
          options: ['Opção 0', 'Opção 1', 'Opção 2'],
          correct_option: 'Alternativa C',
        },
      ];

      const mapped = mapParsedToQuestionItems(items);
      expect(mapped[0].correctIndex).toBe(1);
      expect(mapped[1].correctIndex).toBe(2);
    });

    it('matches correct option by full text if string is not letter or digit', () => {
      const items = [
        {
          question: 'Qual a capital do Brasil?',
          options: ['São Paulo', 'Brasília', 'Rio de Janeiro', 'Salvador'],
          correct_option: 'Brasília',
        },
      ];

      const mapped = mapParsedToQuestionItems(items);
      expect(mapped[0].correctIndex).toBe(1);
    });

    it('handles options provided as a letter-indexed object { A: "...", B: "..." }', () => {
      const items = [
        {
          question: 'Questão com options como objeto',
          options: {
            A: 'Primeira Alternativa',
            B: 'Segunda Alternativa',
            C: 'Terceira Alternativa',
            D: 'Quarta Alternativa',
          },
          correct_option: 'C',
        },
      ];

      const mapped = mapParsedToQuestionItems(items);
      expect(mapped[0].options).toEqual([
        'Primeira Alternativa',
        'Segunda Alternativa',
        'Terceira Alternativa',
        'Quarta Alternativa',
      ]);
      expect(mapped[0].correctIndex).toBe(2);
    });

    it('handles options provided as array of objects [{ text: "...", correct: true }]', () => {
      const items = [
        {
          question: 'Questão com array de objetos',
          options: [
            { text: 'Incorreta 1' },
            { text: 'Correta 2', correct: true },
            { text: 'Incorreta 3' },
          ],
        },
      ];

      const mapped = mapParsedToQuestionItems(items);
      expect(mapped[0].options).toEqual(['Incorreta 1', 'Correta 2', 'Incorreta 3']);
      expect(mapped[0].correctIndex).toBe(1);
    });

    it('filters out empty draft questions with blank question text', () => {
      const items = [
        {
          question: '',
          options: ['', '', '', ''],
          correct_option: 0,
        },
        {
          question: '   ',
          options: ['A', 'B'],
        },
        {
          question: 'Questão válida',
          options: ['X', 'Y'],
          correct_option: 0,
        },
      ];

      const mapped = mapParsedToQuestionItems(items);
      expect(mapped).toHaveLength(1);
      expect(mapped[0].question).toBe('Questão válida');
    });

    it('parses tags from comma-separated string or array', () => {
      const items = [
        {
          question: 'Questão com tags em string',
          options: ['A', 'B'],
          tags: 'CSharp, Backend, DotNet',
        },
      ];

      const mapped = mapParsedToQuestionItems(items);
      expect(mapped[0].tags).toEqual(['CSharp', 'Backend', 'DotNet']);
    });
  });

  describe('extractPartialQuestionsFromMalformedText', () => {
    it('salvages valid questions from text where complete JSON parse fails', () => {
      const malformedText = `
[
  {
    "type": "multiple_choice",
    "question": "Questão número um intacta",
    "options": ["A", "B", "C", "D"],
    "correct_option": 0
  },
  {
    "broken_syntax": "unclosed quotes...
  },
  {
    "type": "multiple_choice",
    "question": "Questão número dois intacta",
    "options": ["X", "Y", "Z", "W"],
    "correct_option": 1
  }
]
`;

      const salvaged = extractPartialQuestionsFromMalformedText(malformedText);
      expect(salvaged.length).toBeGreaterThanOrEqual(2);
      expect(salvaged.some((q) => q.question === 'Questão número um intacta')).toBe(true);
      expect(salvaged.some((q) => q.question === 'Questão número dois intacta')).toBe(true);
    });
  });

  describe('formatQuestionsForAiContext', () => {
    it('filters out blank draft questions and internal UI properties', () => {
      const rawWidgetQuestions = [
        {
          id: 'q_draft_1',
          type: 'multiple_choice',
          question: '',
          options: ['', '', '', ''],
          correctIndex: 0,
          tags: [],
          selectedIndex: null,
          userTypedAnswer: '',
          aiFeedback: null,
          expectedAnswer: '',
          explanation: '',
          showExplanation: false,
          answered: false,
        },
        {
          id: 'q_real_1',
          type: 'multiple_choice',
          question: 'O que é CLR em .NET?',
          options: ['Common Language Runtime', 'Core Language Rule', 'C# Local Runner', 'Common Library Root'],
          correctIndex: 0,
          tags: ['DotNet', 'Runtime'],
          selectedIndex: 2,
          userTypedAnswer: 'respostas antigas',
          aiFeedback: { verdict: 'Correto', feedback: 'ok' },
          expectedAnswer: '',
          explanation: 'O CLR gerencia execução, GC e compilação JIT.',
          showExplanation: true,
          answered: true,
        },
      ];

      const clean = formatQuestionsForAiContext(rawWidgetQuestions);
      expect(clean).toHaveLength(1);
      expect(clean[0]).toEqual({
        type: 'multiple_choice',
        question: 'O que é CLR em .NET?',
        options: ['Common Language Runtime', 'Core Language Rule', 'C# Local Runner', 'Common Library Root'],
        correct_option: 0,
        tags: ['DotNet', 'Runtime'],
        explanation: 'O CLR gerencia execução, GC e compilação JIT.',
      });

      // Verify internal properties are completely stripped
      const cleanObj = clean[0] as Record<string, unknown>;
      expect(cleanObj.id).toBeUndefined();
      expect(cleanObj.selectedIndex).toBeUndefined();
      expect(cleanObj.userTypedAnswer).toBeUndefined();
      expect(cleanObj.aiFeedback).toBeUndefined();
      expect(cleanObj.showExplanation).toBeUndefined();
      expect(cleanObj.answered).toBeUndefined();
    });
  });
});
