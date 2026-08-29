import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sanitizeExpectedAnswer,
  promptGeminiForQuestion,
  promptGeminiForOpenQuestionEvaluation,
  promptGeminiToGenerateBlockQuestion,
  promptGeminiToGenerateBatchQuestions,
  promptGeminiQuizAssistant,
  promptGeminiToParseDocumentToQuizJSON,
  promptGeminiToRefineImportedQuestions,
  getCadernoQuizJsonSchemaPrompt,
  splitDocumentIntoChunks,
} from './quiz';
import * as clientModule from './client';

describe('Quiz Service & Prompt Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('sanitizeExpectedAnswer', () => {
    it('sanitizes Portuguese meta-prefixes', () => {
      expect(
        sanitizeExpectedAnswer('O aluno deve explicar que o React usa Virtual DOM.')
      ).toBe('O React usa Virtual DOM.');

      expect(
        sanitizeExpectedAnswer('Espera-se que a aluna demonstre que closures capturam variáveis.')
      ).toBe('Closures capturam variáveis.');

      expect(
        sanitizeExpectedAnswer('O gabarito esperado é que Promises tratam assincronismo.')
      ).toBe('Promises tratam assincronismo.');

      expect(
        sanitizeExpectedAnswer('Gabarito: TypeScript adiciona tipos estáticos ao JavaScript.')
      ).toBe('TypeScript adiciona tipos estáticos ao JavaScript.');
    });

    it('sanitizes English meta-prefixes', () => {
      expect(
        sanitizeExpectedAnswer('The student should explain that React uses Virtual DOM.')
      ).toBe('React uses Virtual DOM.');

      expect(
        sanitizeExpectedAnswer('It is expected that the student describes how event loops work.')
      ).toBe('Event loops work.');

      expect(
        sanitizeExpectedAnswer('The expected answer is that SQL is declarative.')
      ).toBe('SQL is declarative.');

      expect(
        sanitizeExpectedAnswer('Expected Answer: REST APIs use HTTP methods.')
      ).toBe('REST APIs use HTTP methods.');
    });

    it('preserves direct answers unchanged and capitalizes first letter', () => {
      expect(sanitizeExpectedAnswer('node.js é um runtime.')).toBe('Node.js é um runtime.');
      expect(sanitizeExpectedAnswer('')).toBe('');
    });
  });

  describe('promptGeminiForQuestion', () => {
    it('parses question json and normalizes keys', async () => {
      vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
        text: JSON.stringify({
          enunciado: 'Qual a principal vantagem de usar TypeScript?',
          opcoes: ['Tipagem estática', 'Mais rápido em runtime', 'Sem compilação', 'Apenas para backend'],
          correta: 0,
        }),
      } as any);

      const result = await promptGeminiForQuestion('Gere uma questão sobre TypeScript');
      expect(result.enunciado).toBe('Qual a principal vantagem de usar TypeScript?');
      expect(result.opcoes).toHaveLength(4);
      expect(result.correta).toBe(0);
    });

    it('handles fallback English keys (question, options, correctIndex)', async () => {
      vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
        text: JSON.stringify({
          question: 'What is the main feature of TypeScript?',
          options: ['Static typing', 'Faster runtime', 'No compilation', 'Backend only'],
          correctIndex: 0,
        }),
      } as any);

      const result = await promptGeminiForQuestion('Generate a question about TypeScript');
      expect(result.enunciado).toBe('What is the main feature of TypeScript?');
      expect(result.opcoes).toEqual(['Static typing', 'Faster runtime', 'No compilation', 'Backend only']);
      expect(result.correta).toBe(0);
    });
  });

  describe('promptGeminiForOpenQuestionEvaluation', () => {
    it('evaluates open response and normalizes Portuguese verdict', async () => {
      vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
        text: JSON.stringify({
          verdict: 'Correto',
          feedback: 'Excelente resposta demonstrando compreensão clara.',
        }),
      } as any);

      const result = await promptGeminiForOpenQuestionEvaluation(
        'Explique o que é JSX.',
        'JSX é uma extensão de sintaxe para JavaScript.',
        'É uma sintaxe que parece HTML dentro do React.'
      );

      expect(result.verdict).toBe('Correto');
      expect(result.feedback).toContain('Excelente');
    });

    it('maps English verdicts (Correct, Partial, Incorrect) to standard Portuguese verdict types', async () => {
      vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
        text: JSON.stringify({
          verdict: 'Partial',
          feedback: 'You explained the concept well but missed mention of the call stack.',
        }),
      } as any);

      const partialRes = await promptGeminiForOpenQuestionEvaluation(
        'Explain event loop',
        'Event loop handles async callbacks from queue to call stack.',
        'Event loop handles async callbacks.'
      );
      expect(partialRes.verdict).toBe('Parcial');

      vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
        text: JSON.stringify({
          verdict: 'Incorrect',
          feedback: 'The answer is mistaken.',
        }),
      } as any);

      const incorrectRes = await promptGeminiForOpenQuestionEvaluation(
        'Explain event loop',
        'Event loop handles async callbacks.',
        'It is a database index.'
      );
      expect(incorrectRes.verdict).toBe('Incorreto');
    });
  });

  describe('promptGeminiToGenerateBlockQuestion & Batch', () => {
    it('generates block question with sanitized expected answer', async () => {
      vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
        text: JSON.stringify({
          enunciado: 'O que é Docker?',
          respostaEsperada: 'O aluno deve explicar que Docker é uma plataforma de conteinerização.',
          explicacao: 'Containers isolam processos e dependências.',
        }),
      } as any);

      const result = await promptGeminiToGenerateBlockQuestion('Docker', 'open');
      expect(result.enunciado).toBe('O que é Docker?');
      expect(result.respostaEsperada).toBe('Docker é uma plataforma de conteinerização.');
      expect(result.explicacao).toBe('Containers isolam processos e dependências.');
    });

    it('generates batch questions correctly', async () => {
      vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
        text: JSON.stringify([
          {
            type: 'multiple_choice',
            question: 'Qual comando inicia o Git?',
            options: ['git init', 'git start', 'git create', 'git new'],
            correctIndex: 0,
            explanation: 'git init inicializa um repositório.',
          },
          {
            type: 'open',
            question: 'O que é commit no Git?',
            expectedAnswer: 'The student should explain that commit is a snapshot of tracked changes.',
            explanation: 'Commits registram o histórico de modificações.',
          },
        ]),
      } as any);

      const result = await promptGeminiToGenerateBatchQuestions('Git básico', 2);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('multiple_choice');
      expect(result[0].correctIndex).toBe(0);
      expect(result[1].type).toBe('open');
      expect(result[1].expectedAnswer).toBe('Commit is a snapshot of tracked changes.');
    });
  });

  describe('promptGeminiQuizAssistant', () => {
    it('parses assistant actions and sanitizes expected answers in actions', async () => {
      vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
        text: JSON.stringify({
          message: 'Aqui estão 2 questões sugeridas para sua bateria:',
          suggestedActions: [
            {
              actionType: 'create',
              type: 'open',
              question: 'Explique o princípio Open/Closed do SOLID.',
              expectedAnswer: 'O aluno deve explicar que entidades devem ser abertas para extensão e fechadas para modificação.',
              explanation: 'Permite estender comportamento sem alterar código fonte testado.',
            },
            {
              actionType: 'edit',
              targetQuestionIndex: 1,
              changes: {
                question: 'Pergunta aprimorada',
                expectedAnswer: 'The expected answer is that inheritance is a mechanism of code reuse.',
              },
            },
          ],
        }),
      } as any);

      const result = await promptGeminiQuizAssistant([], [], 'Adicione questões de SOLID', undefined, 'Arquitetura', 'Princípios SOLID');
      expect(result.message).toContain('Aqui estão 2 questões');
      expect(result.suggestedActions).toHaveLength(2);
      expect(result.suggestedActions?.[0].expectedAnswer).toBe(
        'Entidades devem ser abertas para extensão e fechadas para modificação.'
      );
      expect(result.suggestedActions?.[1].changes?.expectedAnswer).toBe(
        'Inheritance is a mechanism of code reuse.'
      );
    });

    it('recovers gracefully from raw text with embedded JSON', async () => {
      vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
        text: '```json\n{"message": "Analisei sua bateria com sucesso.", "suggestedActions": []}\n```',
      } as any);

      const result = await promptGeminiQuizAssistant([], [], 'Analise a bateria');
      expect(result.message).toBe('Analisei sua bateria com sucesso.');
    });

    it('includes referenced batteries in prompt and forwards anti-duplication context', async () => {
      const promptSpy = vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
        text: JSON.stringify({
          message: 'Gerei questões complementares inéditas.',
          suggestedActions: [
            {
              actionType: 'create',
              type: 'multiple_choice',
              question: 'Qual camada do modelo OSI lida com roteamento?',
              options: ['Rede', 'Transporte', 'Enlace', 'Física'],
              correctIndex: 0,
              explanation: 'A camada de rede (camada 3) é responsável pelo roteamento de pacotes.',
            },
          ],
        }),
      } as any);

      const referencedBatteries = [
        {
          title: 'Bateria de Redes I',
          pageTitle: 'Redes de Computadores',
          questionCount: 1,
          questions: [
            {
              id: 'q1',
              type: 'multiple_choice',
              question: 'O que é TCP?',
              options: ['Protocolo', 'Hardware'],
              correctIndex: 0,
            } as any,
          ],
        },
      ];

      const result = await promptGeminiQuizAssistant(
        [],
        [],
        'Crie 1 questão nova',
        undefined,
        'Bateria de Redes II',
        undefined,
        referencedBatteries
      );

      expect(result.message).toBe('Gerei questões complementares inéditas.');
      expect(promptSpy).toHaveBeenCalled();
      const promptArg = promptSpy.mock.calls[0][0];
      expect(promptArg).toContain('REFERENCED EXERCISE BATTERIES');
      expect(promptArg).toContain('Bateria de Redes I');
      expect(promptArg).toContain('O que é TCP?');
      expect(promptArg).toContain('STRICT NON-REPETITION');
    });

    it('throws descriptive error when API call fails', async () => {
      vi.spyOn(clientModule, 'promptGemini').mockRejectedValueOnce(
        new Error('Network connection failure')
      );

      await expect(
        promptGeminiQuizAssistant([], [], 'Gere questões')
      ).rejects.toThrow('Network connection failure');
    });
  });

  describe('Error handling across quiz functions', () => {
    it('throws user-friendly error when question evaluation API fails', async () => {
      vi.spyOn(clientModule, 'promptGemini').mockRejectedValueOnce(
        new Error('Todas as chaves ativas falharam ao processar o pedido. Limite de cota excedido.')
      );

      await expect(
        promptGeminiForOpenQuestionEvaluation('Pergunta', 'Gabarito', 'Resposta')
      ).rejects.toThrow('Limite de cota excedido');
    });

    it('throws descriptive error when question generation returns invalid JSON', async () => {
      vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
        text: 'Não consegui gerar o formato solicitado.',
      } as any);

      await expect(
        promptGeminiForQuestion('Gere uma questão')
      ).rejects.toThrow();
    });
  });

  describe('promptGeminiToParseDocumentToQuizJSON', () => {
    it('parses questions correctly from document content', async () => {
      vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
        text: JSON.stringify([
          {
            type: 'multiple_choice',
            question: 'O que é polimorfismo?',
            options: ['A) Capacidade de assumir várias formas', 'B) Herança única', 'C) Encapsulamento', 'D) Tipagem dinâmica'],
            correctIndex: 0,
            tags: ['POO', 'Conceitos'],
            explanation: 'Polimorfismo permite que objetos respondam de formas diferentes à mesma mensagem.',
          },
          {
            type: 'open',
            question: 'Explique o conceito de coesão.',
            expectedAnswer: 'Coesão mede o quanto as responsabilidades de um módulo estão relacionadas.',
            tags: ['Arquitetura'],
            explanation: 'Alta coesão é um objetivo de bom design.',
          },
        ]),
      } as any);

      const result = await promptGeminiToParseDocumentToQuizJSON(
        '# Documento de Estudo sobre POO',
        'markdown'
      );

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('multiple_choice');
      expect(result[0].question).toBe('O que é polimorfismo?');
      expect(result[0].options).toEqual([
        'Capacidade de assumir várias formas',
        'Herança única',
        'Encapsulamento',
        'Tipagem dinâmica',
      ]);
      expect(result[0].correctIndex).toBe(0);
      expect(result[0].tags).toEqual(['POO', 'Conceitos']);

      expect(result[1].type).toBe('open');
      expect(result[1].expectedAnswer).toBe(
        'Coesão mede o quanto as responsabilidades de um módulo estão relacionadas.'
      );
    });

    it('throws error when no questions are extracted', async () => {
      vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
        text: '[]',
      } as any);

      await expect(
        promptGeminiToParseDocumentToQuizJSON('texto sem questões', 'pdf')
      ).rejects.toThrow('Nenhuma questão válida encontrada');
    });
  });

  describe('promptGeminiToRefineImportedQuestions', () => {
    it('refines question list based on user instruction', async () => {
      vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
        text: JSON.stringify([
          {
            type: 'multiple_choice',
            question: 'Questão única não duplicada',
            options: ['A', 'B', 'C', 'D'],
            correctIndex: 1,
            explanation: 'Explicacao',
          },
        ]),
      } as any);

      const result = await promptGeminiToRefineImportedQuestions(
        [{ question: 'Questão repetida 1' }, { question: 'Questão repetida 1' }],
        'Remover questões duplicadas'
      );

      expect(result).toHaveLength(1);
      expect(result[0].question).toBe('Questão única não duplicada');
    });
  });

  describe('getCadernoQuizJsonSchemaPrompt', () => {
    it('generates prompt template containing schema', () => {
      const prompt = getCadernoQuizJsonSchemaPrompt();
      expect(prompt).toContain('multiple_choice');
      expect(prompt).toContain('correct_option');
      expect(prompt).toContain('expected_answer');
    });

    it('includes existing widget questions context when provided', () => {
      const prompt = getCadernoQuizJsonSchemaPrompt([
        { question: 'Questão Existente 1', options: ['A', 'B'] },
      ]);
      expect(prompt).toContain('QUESTÕES ATUAIS DO WIDGET');
      expect(prompt).toContain('Questão Existente 1');
    });
  });

  describe('splitDocumentIntoChunks', () => {
    it('returns single chunk when document is within size threshold', () => {
      const shortText = '# PHP Basics\n1. What is PHP?';
      const chunks = splitDocumentIntoChunks(shortText, 1000);
      expect(chunks).toEqual([shortText]);
    });

    it('splits large document along question boundaries', () => {
      const q1 = '### Questão 1\nO que é uma closure em PHP?';
      const q2 = '### Questão 2\nComo funciona o Composer?';
      const fullText = `${q1}\n\n${q2}`;

      const chunks = splitDocumentIntoChunks(fullText, 40);
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]).toContain('Questão 1');
      expect(chunks[1]).toContain('Questão 2');
    });
  });
});

