import { describe, it, expect, vi } from 'vitest';
import { extractTextFromPdf } from './pdf-text-extractor';

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn().mockImplementation(() => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: vi.fn().mockImplementation((pageNum: number) =>
        Promise.resolve({
          getTextContent: vi.fn().mockResolvedValue({
            items: [
              { str: `Texto da questão da página ${pageNum}` },
              { str: `(Alternativa A e B)` },
            ],
          }),
        })
      ),
    }),
  })),
}));

vi.mock('pdfjs-dist/build/pdf.worker.mjs?url', () => ({
  default: 'mock-worker-url',
}));

describe('pdf-text-extractor', () => {
  it('extracts all pages and formats them with page markers', async () => {
    const buffer = new ArrayBuffer(8);
    const result = await extractTextFromPdf(buffer);

    expect(result).toContain('--- Página 1 ---');
    expect(result).toContain('Texto da questão da página 1 (Alternativa A e B)');
    expect(result).toContain('--- Página 2 ---');
    expect(result).toContain('Texto da questão da página 2 (Alternativa A e B)');
  });

  it('respects maxPages limit when provided', async () => {
    const buffer = new Uint8Array([1, 2, 3]);
    const result = await extractTextFromPdf(buffer, 1);

    expect(result).toContain('--- Página 1 ---');
    expect(result).not.toContain('--- Página 2 ---');
  });
});
