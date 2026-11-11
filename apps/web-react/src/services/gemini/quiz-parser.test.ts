import { describe, it, expect } from 'vitest';
import {
  cleanJsonBlock,
  stripOuterMarkdownFence,
  repairMalformedJson,
  normalizeCandidateAction,
  extractPartialSuggestedActions,
  sanitizeExpectedAnswer,
  parseEvaluationVerdict,
} from './quiz-parser';

describe('quiz-parser Unit Tests', () => {
  describe('stripOuterMarkdownFence & cleanJsonBlock', () => {
    it('strips outer markdown code fence without destroying inner code backticks', () => {
      const rawWithInnerCode = [
        '```json',
        '{',
        '  "message": "Aqui está sua questão com código:",',
        '  "suggestedActions": [',
        '    {',
        '      "actionType": "create",',
        '      "question": "Qual a saída deste código?\\n```csharp\\nConsole.WriteLine(\\"Hello World\\");\\n```",',
        '      "options": ["Hello World", "Erro", "null", "undefined"],',
        '      "correctIndex": 0',
        '    }',
        '  ]',
        '}',
        '```',
      ].join('\n');

      const cleaned = cleanJsonBlock(rawWithInnerCode);
      const parsed = JSON.parse(cleaned);

      expect(parsed.message).toContain('Aqui está sua questão');
      expect(parsed.suggestedActions[0].question).toContain('```csharp');
      expect(parsed.suggestedActions[0].question).toContain('Console.WriteLine');
    });

    it('extracts JSON object when surrounded by conversational text before and after', () => {
      const text = 'Claro! Aqui estão as questões:\n{"message": "Olá", "suggestedActions": []}\nEspero que goste!';
      const cleaned = cleanJsonBlock(text);
      expect(cleaned).toBe('{"message": "Olá", "suggestedActions": []}');
      const parsed = JSON.parse(cleaned);
      expect(parsed.message).toBe('Olá');
    });
  });

  describe('repairMalformedJson', () => {
    it('removes trailing commas before closing braces and brackets', () => {
      const malformed = '{ "a": 1, "b": [2, 3, ], }';
      const repaired = repairMalformedJson(malformed);
      expect(JSON.parse(repaired)).toEqual({ a: 1, b: [2, 3] });
    });

    it('adds missing commas between adjacent objects in arrays', () => {
      const malformed = '[{"id": 1} {"id": 2}]';
      const repaired = repairMalformedJson(malformed);
      expect(JSON.parse(repaired)).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('normalizeCandidateAction', () => {
    it('normalizes Portuguese field aliases correctly', () => {
      const rawPortugueseAction = {
        tipoAcao: 'criar',
        tipo: 'multipla_escolha',
        enunciado: 'O que é LINQ em C#?',
        opcoes: [
          'Language Integrated Query',
          'Linear Integrated Network',
          'Link Interface Node',
          'Nenhuma das anteriores',
        ],
        correta: 'A',
        respostaEsperada: 'O aluno deve responder Language Integrated Query',
        explicacao: 'LINQ significa Language Integrated Query.',
      };

      const normalized = normalizeCandidateAction(rawPortugueseAction);

      expect(normalized.actionType).toBe('create');
      expect(normalized.type).toBe('multiple_choice');
      expect(normalized.question).toBe('O que é LINQ em C#?');
      expect(normalized.options).toHaveLength(4);
      expect(normalized.correctIndex).toBe(0);
      expect(normalized.expectedAnswer).toBe('Language Integrated Query');
      expect(normalized.explanation).toContain('Language Integrated Query');
    });

    it('converts 1-based targetQuestionIndex to 0-based index safely', () => {
      const editAction = {
        actionType: 'edit',
        targetQuestionIndex: 2, // 1-based: Question 2
        question: 'Enunciado melhorado',
      };

      const normalized = normalizeCandidateAction(editAction, 5);
      expect(normalized.targetQuestionIndex).toBe(1); // 0-based
    });

    it('preserves index 0 if already 0-based', () => {
      const editAction = {
        actionType: 'edit',
        targetQuestionIndex: 0,
      };

      const normalized = normalizeCandidateAction(editAction, 5);
      expect(normalized.targetQuestionIndex).toBe(0);
    });

    it('normalizes reorder action and converts 1-based order array to 0-based', () => {
      const rawReorder = {
        actionType: 'reorder',
        order: [3, 1, 2],
        reason: 'Sequência pedagógica do mais básico ao avançado',
      };

      const normalized = normalizeCandidateAction(rawReorder, 3);
      expect(normalized.actionType).toBe('reorder');
      expect(normalized.order).toEqual([2, 0, 1]);
      expect(normalized.reason).toContain('Sequência pedagógica');
    });
  });

  describe('extractPartialSuggestedActions', () => {
    it('rescues valid question actions from broken/truncated JSON responses', () => {
      const corruptedResponse = `
        {
          "message": "Aqui estão as questões solicitadas",
          "suggestedActions": [
            {
              "actionType": "create",
              "question": "Questão 1 sobre Tipos Primitivos em C#",
              "options": ["int", "string", "bool", "todas"],
              "correctIndex": 3,
              "explanation": "Todas são tipos fundamentais."
            },
            {
              "actionType": "create",
              "question": "Questão 2 com Syntax Error que quebra o parse
      `;

      const actions = extractPartialSuggestedActions(corruptedResponse);
      expect(actions.length).toBeGreaterThanOrEqual(1);
      expect(actions[0].question).toBe('Questão 1 sobre Tipos Primitivos em C#');
      expect(actions[0].correctIndex).toBe(3);
    });
  });

  describe('sanitizeExpectedAnswer', () => {
    it('strips redundant meta-phrasing in Portuguese and English', () => {
      expect(
        sanitizeExpectedAnswer('O aluno deve explicar que herança permite reutilizar código.')
      ).toBe('Herança permite reutilizar código.');

      expect(
        sanitizeExpectedAnswer('The student should explain that polymorphism enables dynamic dispatch.')
      ).toBe('Polymorphism enables dynamic dispatch.');

      expect(
        sanitizeExpectedAnswer('Gabarito: Encapsulamento protege o estado interno.')
      ).toBe('Encapsulamento protege o estado interno.');
    });
  });

  describe('parseEvaluationVerdict', () => {
    it('classifies correct, partial, and incorrect across variations', () => {
      expect(parseEvaluationVerdict('Correto')).toBe('Correto');
      expect(parseEvaluationVerdict('correct')).toBe('Correto');
      expect(parseEvaluationVerdict('Parcialmente correto')).toBe('Parcial');
      expect(parseEvaluationVerdict('Incorreto')).toBe('Incorreto');
      expect(parseEvaluationVerdict('wrong answer')).toBe('Incorreto');
    });
  });
});
