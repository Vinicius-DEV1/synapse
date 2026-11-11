import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { PdfPageTextLayer } from './PdfPageTextLayer';
import type { PDFPageProxy } from 'pdfjs-dist';

describe('PdfPageTextLayer Component', () => {
  const createMockPage = (items: any[] = []): PDFPageProxy => {
    return {
      getViewport: vi.fn(({ scale }: { scale: number }) => ({
        scale,
        convertToViewportPoint: (x: number, y: number) => [x * scale, y * scale],
      })),
      getTextContent: vi.fn().mockResolvedValue({
        items,
      }),
    } as unknown as PDFPageProxy;
  };

  it('renders selectable container with correct classes and attributes', async () => {
    const mockPage = createMockPage([
      {
        str: 'Hello Caderno',
        transform: [1, 0, 0, 12, 50, 100],
        width: 80,
        hasEOL: false,
      },
    ]);

    const setOcrProcessing = vi.fn();
    const { container } = render(
      <PdfPageTextLayer
        page={mockPage}
        pageNum={1}
        zoom={1}
        bookId="book_1"
        ocrProcessing={new Set()}
        setOcrProcessing={setOcrProcessing}
      />
    );

    const layer = container.querySelector('.pdf-text-layer');
    expect(layer).not.toBeNull();
    expect(layer?.classList.contains('select-text')).toBe(true);
    expect(layer?.getAttribute('data-selectable')).toBe('true');

    await waitFor(() => {
      const span = container.querySelector('span');
      expect(span).not.toBeNull();
      expect(span?.textContent).toBe('Hello Caderno');
      expect(span?.style.userSelect).toBe('text');
    });
  });

  it('renders multiple text items properly', async () => {
    const mockPage = createMockPage([
      {
        str: 'Linha 1',
        transform: [1, 0, 0, 14, 10, 20],
        width: 50,
        hasEOL: true,
      },
      {
        str: 'Linha 2',
        transform: [1, 0, 0, 14, 10, 40],
        width: 50,
        hasEOL: false,
      },
    ]);

    const setOcrProcessing = vi.fn();
    const { container } = render(
      <PdfPageTextLayer
        page={mockPage}
        pageNum={1}
        zoom={1.5}
        bookId="book_1"
        ocrProcessing={new Set()}
        setOcrProcessing={setOcrProcessing}
      />
    );

    await waitFor(() => {
      const spans = container.querySelectorAll('.pdf-text-layer span');
      expect(spans.length).toBe(2);
      expect(spans[0].textContent).toBe('Linha 1 ');
      expect(spans[1].textContent).toBe('Linha 2');
    });
  });
});
