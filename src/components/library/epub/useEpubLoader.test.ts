import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEpubLoader } from './useEpubLoader';
import type { LibraryBook } from '../../../types';

const mockRenderTo = vi.fn();
const mockLocationsSave = vi.fn().mockReturnValue('[]');
const mockContentRegister = vi.fn();

vi.mock('epubjs', () => ({
  default: vi.fn().mockImplementation(() => ({
    ready: Promise.resolve(),
    locations: {
      generate: vi.fn().mockResolvedValue([]),
      save: mockLocationsSave,
      load: vi.fn(),
    },
    renderTo: mockRenderTo.mockImplementation(() => ({
      display: vi.fn().mockResolvedValue(undefined),
      themes: { register: vi.fn(), select: vi.fn(), fontSize: vi.fn() },
      on: vi.fn(),
      destroy: vi.fn(),
      hooks: {
        content: {
          register: mockContentRegister,
        },
      },
    })),
    loaded: {
      navigation: Promise.resolve({ toc: [] }),
      metadata: Promise.resolve({}),
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

let currentScrollMode = false;

vi.mock('./EpubContext', () => ({
  useEpub: vi.fn(() => ({
    scrollMode: currentScrollMode,
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
    currentSectionHref: null,
    setCurrentSectionHref: vi.fn(),
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
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    file_path: '/path/to/book.epub',
    original_name: 'book.epub',
    cover_image: '',
    last_read_page: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    currentScrollMode = false;
    const windowWithApi = window as unknown as {
      api: {
        library: {
          getBookFile: ReturnType<typeof vi.fn>;
          getHighlights?: ReturnType<typeof vi.fn>;
          getBookmarks?: ReturnType<typeof vi.fn>;
        };
      };
    };
    windowWithApi.api = {
      library: {
        getBookFile: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
        getHighlights: vi.fn().mockResolvedValue([]),
        getBookmarks: vi.fn().mockResolvedValue([]),
      },
    };
  });

  it('loads epub file via window.api.library.getBookFile and configures paginated mode by default', async () => {
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
      const windowWithApi = window as unknown as { api: { library: { getBookFile: ReturnType<typeof vi.fn> } } };
      expect(windowWithApi.api.library.getBookFile).toHaveBeenCalledWith('book_epub_loader');
    });

    await waitFor(() => {
      expect(mockRenderTo).toHaveBeenCalledWith(
        viewerRef.current,
        expect.objectContaining({
          manager: 'default',
          flow: 'paginated',
        })
      );
    });
  });

  it('configures rendition with continuous manager and scrolled flow when scrollMode is true', async () => {
    currentScrollMode = true;
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

    await waitFor(() => {
      expect(mockRenderTo).toHaveBeenCalledWith(
        viewerRef.current,
        expect.objectContaining({
          manager: 'continuous',
          flow: 'scrolled',
        })
      );
    });

    // Content hook must be registered to attach the wheel forwarding bridge
    expect(mockContentRegister).toHaveBeenCalled();
  });

  it('registers content hooks with mousedown and mouseup listeners to prevent premature selection toolbars', async () => {
    const viewerRef = { current: document.createElement('div') };
    renderHook(() =>
      useEpubLoader(
        mockBook,
        viewerRef,
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        { current: 0 }
      )
    );

    await waitFor(() => {
      expect(mockContentRegister).toHaveBeenCalled();
    });

    const registeredHook = mockContentRegister.mock.calls[0][0];
    expect(typeof registeredHook).toBe('function');

    const mockDoc = {
      addEventListener: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn().mockReturnValue([]),
    };
    const mockWin = {
      addEventListener: vi.fn(),
    };

    await registeredHook({ document: mockDoc, window: mockWin });

    expect(mockDoc.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(mockDoc.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(mockWin.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
  });
});
