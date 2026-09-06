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

vi.mock('./hooks/usePdfDocument', () => ({
  usePdfDocument: vi.fn(() => ({
    pdfDoc: {
      numPages: 100,
      getPage: vi.fn().mockResolvedValue({
        getViewport: () => ({ width: 600, height: 800 }),
      }),
    },
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

const mockDispatch = vi.fn();

vi.mock('../../../store/useStore', () => ({
  useStore: vi.fn(() => ({
    dispatch: mockDispatch,
  })),
}));

vi.mock('../../../utils/settings', () => ({
  getSettings: vi.fn(() => ({
    defaultReadingMode: 'light',
  })),
  saveSettings: vi.fn(),
}));

vi.mock('../../../hooks/useTimeTracker', () => ({
  useTimeTracker: vi.fn(),
}));

vi.mock('./PdfToolbar', () => ({
  PdfToolbar: ({ onBack }: any) => (
    <div data-testid="pdf-toolbar">
      <button onClick={onBack}>Voltar</button>
    </div>
  ),
}));

vi.mock('./PdfPage', () => ({
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

  it('does not toggle fullscreen on single click, but toggles on double click', () => {
    const onBack = vi.fn();
    const onUpdateBook = vi.fn();

    const { getByTestId } = render(
      <PdfReader book={mockBook} onBack={onBack} onUpdateBook={onUpdateBook} />
    );

    const viewport = getByTestId('pdf-viewport');
    expect(viewport).toBeDefined();

    // Initially, reading mode fullscreen is dispatched
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_READING_MODE_FULLSCREEN',
      isFullScreen: true,
    });
    mockDispatch.mockClear();

    // Single click should NOT trigger fullscreen toggle
    fireEvent.click(viewport);
    expect(mockDispatch).not.toHaveBeenCalled();

    // Double click triggers fullscreen toggle (showing mobile tools / isFullScreen false)
    fireEvent.doubleClick(viewport);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_READING_MODE_FULLSCREEN',
      isFullScreen: false,
    });
  });
});
