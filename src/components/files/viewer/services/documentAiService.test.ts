import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractMarkdownFromResponse, sendDocumentAiPrompt } from './documentAiService';
import * as geminiClient from '../../../../services/gemini';

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

  describe('sendDocumentAiPrompt', () => {
    it('throws error when user instruction is empty', async () => {
      await expect(
        sendDocumentAiPrompt({
          documentText: '# Test',
          documentTitle: 'test.md',
          userInstruction: '   ',
        })
      ).rejects.toThrow('A instrução para a IA não pode estar vazia.');
    });

    it('injects document context and calls promptGemini', async () => {
      vi.mocked(geminiClient.promptGemini).mockResolvedValueOnce({
        text: `Adicionei a introdução.\n\`\`\`markdown\n# Introdução\nNovo texto.\n\`\`\``,
      });

      const result = await sendDocumentAiPrompt({
        documentText: '# Original',
        documentTitle: 'guia.md',
        userInstruction: 'Adicione uma introdução',
      });

      expect(geminiClient.promptGemini).toHaveBeenCalled();
      expect(result.chatText).toContain('Adicionei a introdução.');
      expect(result.proposedMarkdown).toBe('# Introdução\nNovo texto.');
      expect(result.hasChanges).toBe(true);
    });
  });
});
