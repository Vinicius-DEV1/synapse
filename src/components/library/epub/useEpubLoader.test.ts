import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEpubLoader } from './useEpubLoader';
import type { LibraryBook } from '../../../types';

vi.mock('epubjs', () => ({
  default: vi.fn().mockImplementation(() => ({
    ready: Promise.resolve(),
    locations: { generate: vi.fn().mockResolvedValue([]) },
    renderTo: vi.fn().mockReturnValue({
      display: vi.fn().mockResolvedValue(undefined),
      themes: { register: vi.fn(), select: vi.fn(), fontSize: vi.fn() },
      on: vi.fn(),
    }),
    loaded: {
      navigation: Promise.resolve({ toc: [] }),
    },
    destroy: vi.fn(),
  })),
}));

vi.mock('../../../store/useStore', () => ({
  useStore: vi.fn(() => ({
    state: { moduleKeys: {} },
    dispatch: vi.fn(),
  })),
}));

vi.mock('./EpubContext', () => ({
  useEpub: vi.fn(() => ({
    scrollMode: false,
    setEpubBook: vi.fn(),
    epubBook: null,
    setRendition: vi.fn(),
    setLocationsReady: vi.fn(),
    setTotalPages: vi.fn(),
    setProgress: vi.fn(),
    setCurrentPage: vi.fn(),
    setHighlights: vi.fn(),
    setBookmarks: vi.fn(),
    setToc: vi.fn(),
    setSelection: vi.fn(),
    setNoteMode: vi.fn(),
    setShowSettings: vi.fn(),
    originalFontName: null,
    setOriginalFontName: vi.fn(),
    detectedFontSizePx: null,
    setDetectedFontSizePx: vi.fn(),
  })),
}));

describe('useEpubLoader Hook', () => {
  const mockBook: LibraryBook = {
    id: 'book_epub_loader',
    title: 'Domain-Driven Design',
    author: 'Eric Evans',
    format: 'epub',
    total_pages: 500,
    reading_status: 'reading',
    created_at: 1000,
    updated_at: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      library: {
        getBookFile: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      },
    };
  });

  it('loads epub file via window.api.library.getBookFile', async () => {
    const viewerRef = { current: document.createElement('div') };
    const onUpdateBook = vi.fn();
    const setLoading = vi.fn();
    const setEpubError = vi.fn();
    const turnPage = vi.fn();
    const handleEpubClick = vi.fn();
    const globalLastHighlightClickRef = { current: 0 };

    renderHook(() =>
      useEpubLoader(
        mockBook,
        viewerRef,
        onUpdateBook,
        setLoading,
        setEpubError,
        turnPage,
        handleEpubClick,
        globalLastHighlightClickRef
      )
    );

    expect(setLoading).toHaveBeenCalledWith(true);
    await waitFor(() => {
      expect(window.api.library.getBookFile).toHaveBeenCalledWith('book_epub_loader');
    });
  });
});
