import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import PdfReader from './PdfReader';
import type { LibraryBook } from '../../types';

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
}));

vi.mock('pdfjs-dist/build/pdf.worker.mjs?url', () => ({
  default: 'mock-pdf-worker-url',
}));

vi.mock('./pdf/hooks/usePdfDocument', () => ({
  usePdfDocument: vi.fn(() => ({
    pdfDoc: { numPages: 100 },
    totalPages: 100,
    pdfError: null,
    loading: false,
    tocItems: [],
    highlights: [],
    setHighlights: vi.fn(),
    bookmarks: [],
    setBookmarks: vi.fn(),
    toggleBookmark: vi.fn(),
    reload: vi.fn(),
  })),
}));

vi.mock('../../store/useStore', () => ({
  useStore: vi.fn(() => ({
    dispatch: vi.fn(),
  })),
}));

vi.mock('../../utils/settings', () => ({
  getSettings: vi.fn(() => ({
    defaultReadingMode: 'light',
  })),
  saveSettings: vi.fn(),
}));

vi.mock('../../hooks/useTimeTracker', () => ({
  useTimeTracker: vi.fn(),
}));

vi.mock('./pdf/PdfToolbar', () => ({
  PdfToolbar: ({ onBack }: any) => (
    <div data-testid="pdf-toolbar">
      <button onClick={onBack}>Voltar</button>
    </div>
  ),
}));

vi.mock('./pdf/PdfPage', () => ({
  PdfPage: ({ pageNum }: any) => <div data-testid={`pdf-page-${pageNum}`}>Página {pageNum}</div>,
}));

describe('PdfReader Component', () => {
  const mockBook: LibraryBook = {
    id: 'book_pdf_1',
    title: 'Engenharia de Software Moderna',
    author: 'Marco Tulio Valente',
    format: 'pdf',
    total_pages: 390,
    reading_status: 'reading',
    created_at: 1000,
    updated_at: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pdf reader and navigates back on back click', () => {
    const onBack = vi.fn();
    const onUpdateBook = vi.fn();

    const { getByText, getByTestId } = render(
      <PdfReader book={mockBook} onBack={onBack} onUpdateBook={onUpdateBook} />
    );

    expect(getByTestId('pdf-toolbar')).toBeDefined();
    const backBtn = getByText('Voltar');
    fireEvent.click(backBtn);

    expect(onBack).toHaveBeenCalled();
  });
});
