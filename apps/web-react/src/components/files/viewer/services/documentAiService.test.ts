import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractMarkdownFromResponse,
  extractGeneratedQuestionsFromResponse,
  sendDocumentAiPrompt,
} from './documentAiService';
import * as geminiClient from '../../../../services/gemini';
import type { ReferencedBattery } from '../../../editor-extensions/quiz/types';

vi.mock('../../../../services/gemini', () => ({
  promptGemini: vi.fn(),
}));

vi.mock('../../../../utils/settings', () => ({
  getSettings: vi.fn(() => ({
    geminiModel: 'gemini-2.0-flash',
    geminiModelChat: 'gemini-2.0-flash',
  })),
}));

describe('documentAiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractMarkdownFromResponse', () => {
    it('extracts chatText and proposedMarkdown from markdown code block', () => {
      const rawText = `Aqui está o documento atualizado com as correções:\n\n\`\`\`markdown\n# Documento Revisado\n\nConteúdo com tópicos.\n\`\`\``;
      const res = extractMarkdownFromResponse(rawText);

      expect(res.chatText).toContain('Aqui está o documento atualizado');
      expect(res.proposedMarkdown).toBe('# Documento Revisado\n\nConteúdo com tópicos.');
    });

    it('handles response without markdown code block as chat only', () => {
      const rawText = 'O documento explica detalhadamente como funcionam os hooks do React.';
      const res = extractMarkdownFromResponse(rawText);

      expect(res.chatText).toBe(rawText);
      expect(res.proposedMarkdown).toBeUndefined();
    });

    it('supports ```md code fence variant', () => {
      const rawText = `Alterações concluídas:\n\`\`\`md\n## Seção 2\nTexto novo.\n\`\`\``;
      const res = extractMarkdownFromResponse(rawText);

      expect(res.proposedMarkdown).toBe('## Seção 2\nTexto novo.');
    });
  });

  describe('extractGeneratedQuestionsFromResponse', () => {
    it('extracts multiple choice and open questions from json code block', () => {
      const rawText = `Aqui estão as questões geradas:\n\`\`\`json
[
  {
    "type": "multiple_choice",
    "question": "O que é useState?",
    "options": ["Um Hook", "Uma Classe", "Um Componente", "Um Seletor"],
    "correctIndex": 0,
    "explanation": "useState é um hook básico do React."
  },
  {
    "type": "open",
    "question": "Explique o ciclo de vida do useEffect.",
    "expectedAnswer": "Executa após o render e limpa na desmontagem."
  }
]
\`\`\``;

      const questions = extractGeneratedQuestionsFromResponse(rawText);
      expect(questions).toHaveLength(2);
      expect(questions[0].question).toBe('O que é useState?');
      expect(questions[0].type).toBe('multiple_choice');
      expect(questions[0].options).toHaveLength(4);
      expect(questions[0].correctIndex).toBe(0);
      expect(questions[0].explanation).toBe('useState é um hook básico do React.');

      expect(questions[1].question).toBe('Explique o ciclo de vida do useEffect.');
      expect(questions[1].type).toBe('open');
      expect(questions[1].expectedAnswer).toBe('Executa após o render e limpa na desmontagem.');
    });

    it('returns empty array when no JSON questions are found', () => {
      expect(extractGeneratedQuestionsFromResponse('Apenas uma resposta em texto puro.')).toEqual([]);
    });
  });

  describe('sendDocumentAiPrompt with referenced battery', () => {
    const mockBattery: ReferencedBattery = {
      id: 'bat_1',
      title: 'Bateria de React',
      pageId: 'page_123',
      pageTitle: 'Conceitos React',
      questionCount: 1,
      questions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: 'O que é JSX?',
          options: ['Sintaxe de extensão', 'CSS', 'Banco de Dados', 'API'],
          correctIndex: 0,
          selectedIndex: null,
          expectedAnswer: '',
          userTypedAnswer: '',
          aiFeedback: null,
          explanation: 'JSX estende JavaScript.',
          showExplanation: false,
          answered: false,
        },
      ],
    };

    it('injects referenced battery context and extracts questions from response', async () => {
      vi.mocked(geminiClient.promptGemini).mockResolvedValueOnce({
        text: `Criei 1 nova questão baseada no documento.\n\`\`\`json\n[\n  {\n    "type": "multiple_choice",\n    "question": "Qual hook previne re-renders desnecessários?",\n    "options": ["useMemo", "useRef", "useEffect", "useId"],\n    "correctIndex": 0,\n    "explanation": "useMemo memoriza valores computados."\n  }\n]\n\`\`\``,
      });

      const res = await sendDocumentAiPrompt({
        documentText: '# React Performance\n\nuseMemo e useCallback...',
        documentTitle: 'react-perf.md',
        userInstruction: 'Adicione uma questão à bateria @Bateria de React',
        referencedBatteries: [mockBattery],
      });

      expect(geminiClient.promptGemini).toHaveBeenCalled();
      const calledPrompt = vi.mocked(geminiClient.promptGemini).mock.calls[0][0];
      expect(calledPrompt).toContain('BATERIA REFERENCIADA (@Bateria de React)');
      expect(calledPrompt).toContain('O que é JSX?');

      expect(res.generatedQuestions).toBeDefined();
      expect(res.generatedQuestions).toHaveLength(1);
      expect(res.generatedQuestions?.[0].question).toBe('Qual hook previne re-renders desnecessários?');
      expect(res.targetBattery?.id).toBe('bat_1');
    });
  });
});
