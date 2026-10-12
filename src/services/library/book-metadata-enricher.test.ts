import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sanitizeBookQuery,
  extractFilenameHeuristics,
  searchOpenLibrary,
  autoEnrichBookMetadata,
} from './book-metadata-enricher';
import type { LibraryBook } from '../../types';

describe('book-metadata-enricher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeBookQuery', () => {
    it('removes file extensions, release group tags and normalize spaces', () => {
      const raw = '[OceanofPDF.com] As 48 Leis do Poder - Robert Greene (2000).epub';
      const clean = sanitizeBookQuery(raw);
      expect(clean).toBe('As 48 Leis do Poder - Robert Greene');
    });

    it('handles filenames with underscores and extra spacing', () => {
      const raw = 'The_48_Laws_of_Power__Robert_Greene.pdf';
      const clean = sanitizeBookQuery(raw);
      expect(clean).toBe('The 48 Laws of Power Robert Greene');
    });
  });

  describe('extractFilenameHeuristics', () => {
    it('splits title and author candidate by hyphen separator', () => {
      const filename = 'As 48 Leis do Poder - Robert Greene.epub';
      const result = extractFilenameHeuristics(filename);
      expect(result.titleCandidate).toBe('As 48 Leis do Poder');
      expect(result.authorCandidate).toBe('Robert Greene');
    });

    it('returns titleCandidate only if no separator exists', () => {
      const filename = 'Clean Architecture.epub';
      const result = extractFilenameHeuristics(filename);
      expect(result.titleCandidate).toBe('Clean Architecture');
      expect(result.authorCandidate).toBeUndefined();
    });
  });

  describe('searchOpenLibrary', () => {
    it('fetches metadata from open library search api', async () => {
      const mockResponse = {
        docs: [
          {
            title: 'As 48 Leis do Poder',
            author_name: ['Robert Greene', 'Joost Elffers'],
            publisher: ['Rocco'],
            first_publish_year: 2000,
            language: ['por'],
            cover_i: 123456,
          },
        ],
      };

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await searchOpenLibrary('As 48 Leis do Poder');
      expect(result).not.toBeNull();
      expect(result?.title).toBe('As 48 Leis do Poder');
      expect(result?.author).toBe('Robert Greene, Joost Elffers');
      expect(result?.publisher).toBe('Rocco');
      expect(result?.published_year).toBe(2000);
      expect(result?.language).toBe('pt');
      expect(result?.cover_image).toBe('https://covers.openlibrary.org/b/id/123456-L.jpg');

      global.fetch = originalFetch;
    });
  });

  describe('autoEnrichBookMetadata', () => {
    it('enriches book with missing author using Open Library results', async () => {
      const incompleteBook: Partial<LibraryBook> = {
        id: 'book-48-leis',
        title: 'As 48 Leis do Poder - Robert Greene',
        author: 'Desconhecido',
        publisher: 'Não informada',
      };

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [
            {
              title: 'As 48 Leis do Poder',
              author_name: ['Robert Greene'],
              publisher: ['Rocco'],
              first_publish_year: 2000,
              language: ['por'],
              cover_i: 99999,
            },
          ],
        }),
      } as Response);

      const updates = await autoEnrichBookMetadata(incompleteBook, { allowAI: false });
      expect(updates).not.toBeNull();
      expect(updates?.author).toBe('Robert Greene');
      expect(updates?.publisher).toBe('Rocco');
      expect(updates?.published_year).toBe(2000);
      expect(updates?.cover_image).toBe('https://covers.openlibrary.org/b/id/99999-L.jpg');

      global.fetch = originalFetch;
    });

    it('falls back to filename heuristic when API returns no results', async () => {
      const incompleteBook: Partial<LibraryBook> = {
        id: 'book-custom',
        title: 'Livro Raro - Maria Silva',
        author: 'Desconhecido',
      };

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ docs: [] }),
      } as Response);

      const updates = await autoEnrichBookMetadata(incompleteBook, { allowAI: false });
      expect(updates).not.toBeNull();
      expect(updates?.author).toBe('Maria Silva');
      expect(updates?.title).toBe('Livro Raro');

      global.fetch = originalFetch;
    });
  });

  describe('extractSnippetFromBook', () => {
    it('returns empty string if book has no id and no file_path', async () => {
      const { extractSnippetFromBook } = await import('./book-metadata-enricher');
      const snippet = await extractSnippetFromBook({});
      expect(snippet).toBe('');
    });
  });

  describe('searchWithAI prompt formatting', () => {
    it('sends prompt with initial snippet, web search instruction and strict JSON guidelines', async () => {
      const keysModule = await import('../gemini/keys');
      vi.spyOn(keysModule, 'getGeminiKeys').mockResolvedValue(['test-api-key']);
      vi.spyOn(keysModule, 'getRotatedActiveKeys').mockReturnValue(['test-api-key']);

      const { searchWithAI } = await import('./book-metadata-enricher');
      const geminiClient = await import('../gemini/client');
      const promptGeminiSpy = vi.spyOn(geminiClient, 'promptGemini').mockResolvedValue({
        text: JSON.stringify({
          title: 'As 48 Leis do Poder',
          author: 'Robert Greene',
          publisher: 'Editora Rocco',
          published_year: 2000,
          language: 'pt',
        }),
      } as any);

      const snippet = 'CIP - Catalogação na Publicação\nGreene, Robert. As 48 Leis do Poder. Rocco, 2000.';
      const result = await searchWithAI('As 48 Leis do Poder', snippet);

      expect(promptGeminiSpy).toHaveBeenCalled();
      const [userPrompt, , , , systemInstruction] = promptGeminiSpy.mock.calls[0];

      // Verifies initial pages snippet is sent
      expect(userPrompt).toContain(snippet);
      expect(userPrompt).toContain('PÁGINAS INICIAIS DA OBRA');
      // Verifies web search instruction
      expect(userPrompt).toContain('Google Search');
      expect(systemInstruction).toContain('Google Search');
      // Verifies zero-hallucination directive
      expect(systemInstruction).toContain('ZERO ALUCINAÇÃO');
      expect(systemInstruction).toContain('Jamais invente ou deduza');

      // Verifies parsed result
      expect(result).not.toBeNull();
      expect(result?.title).toBe('As 48 Leis do Poder');
      expect(result?.author).toBe('Robert Greene');
      expect(result?.publisher).toBe('Editora Rocco');
      expect(result?.published_year).toBe(2000);

      promptGeminiSpy.mockRestore();
    });

    it('instructs AI to strictly preserve edition language and Portuguese titles', async () => {
      const keysModule = await import('../gemini/keys');
      vi.spyOn(keysModule, 'getGeminiKeys').mockResolvedValue(['test-api-key']);
      vi.spyOn(keysModule, 'getRotatedActiveKeys').mockReturnValue(['test-api-key']);

      const { searchWithAI } = await import('./book-metadata-enricher');
      const geminiClient = await import('../gemini/client');
      const promptGeminiSpy = vi.spyOn(geminiClient, 'promptGemini').mockResolvedValue({
        text: JSON.stringify({
          title: 'As 48 Leis do Poder',
          author: 'Robert Greene',
          publisher: 'Rocco',
          published_year: 2000,
          language: 'pt-BR',
        }),
      } as any);

      await searchWithAI('As 48 Leis do Poder', 'Texto da folha de rosto em português');
      const [, , , , systemInstruction] = promptGeminiSpy.mock.calls[0];

      expect(systemInstruction).toContain('PRESERVAÇÃO RIGOROSA DO IDIOMA DA EDIÇÃO E DO TÍTULO');
      expect(systemInstruction).toContain('As 48 Leis do Poder');
      expect(systemInstruction).toContain('The 48 Laws of Power');

      promptGeminiSpy.mockRestore();
    });
  });

  describe('title preservation against English translation', () => {
    it('does not overwrite Portuguese title with English title returned by Open Library', async () => {
      const bookInPt: Partial<LibraryBook> = {
        id: 'book-48-leis',
        title: 'As 48 Leis do Poder - Robert Greene',
        author: 'Desconhecido',
      };

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          docs: [
            {
              title: 'The 48 Laws of Power', // English title from Open Library
              author_name: ['Robert Greene'],
              language: ['rus', 'eng'], // Russian/English editions
              cover_i: 8888,
            },
          ],
        }),
      } as Response);

      const updates = await autoEnrichBookMetadata(bookInPt, { allowAI: false });
      expect(updates).not.toBeNull();
      // Should preserve the Portuguese title "As 48 Leis do Poder", NOT replace with "The 48 Laws of Power"
      expect(updates?.title).toBe('As 48 Leis do Poder');
      // Should NOT set language to 'rus'
      expect(updates?.language).not.toBe('rus');

      global.fetch = originalFetch;
    });
  });
});
