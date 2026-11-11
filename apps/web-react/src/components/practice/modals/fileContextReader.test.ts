import { describe, it, expect, vi } from 'vitest';
import { extractTextFromFile } from './fileContextReader';

vi.mock('../../../utils/pdf-text-extractor', () => ({
  extractTextFromPdf: vi.fn().mockResolvedValue('Texto extraído do PDF simulado de currículo.'),
}));

describe('fileContextReader', () => {
  it('extracts plain text from a txt file', async () => {
    const file = new File(['Conteúdo do currículo do candidato'], 'curriculo.txt', {
      type: 'text/plain',
    });

    const result = await extractTextFromFile(file);
    expect(result.fileName).toBe('curriculo.txt');
    expect(result.text).toBe('Conteúdo do currículo do candidato');
    expect(result.size).toBeGreaterThan(0);
  });

  it('extracts text from a markdown file', async () => {
    const file = new File(['# Descrição da Vaga\nRequisitos: React, TypeScript'], 'vaga.md', {
      type: 'text/markdown',
    });

    const result = await extractTextFromFile(file);
    expect(result.fileName).toBe('vaga.md');
    expect(result.text).toContain('Requisitos: React, TypeScript');
  });

  it('delegates to extractTextFromPdf for pdf files', async () => {
    const file = new File(['%PDF-1.4 dummy binary'], 'curriculo.pdf', {
      type: 'application/pdf',
    });

    const result = await extractTextFromFile(file);
    expect(result.fileName).toBe('curriculo.pdf');
    expect(result.text).toBe('Texto extraído do PDF simulado de currículo.');
  });
});
