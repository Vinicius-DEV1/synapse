import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEpubContinuousBookmarks } from './useEpubContinuousBookmarks';

const mockCreateBookmark = vi.fn();
const mockDeleteBookmark = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (window as unknown as { api?: unknown }).api = {
    library: {
      createBookmark: mockCreateBookmark,
      deleteBookmark: mockDeleteBookmark,
    },
  };
});

let mockScrollMode = true;
let mockBookmarks: Array<{ id: string; book_id: string; page_number: number; label: string; created_at: string }> = [];
const mockSetBookmarks = vi.fn();

const mockOff = vi.fn();
const mockOn = vi.fn();

vi.mock('../EpubContext', () => ({
  useEpub: () => ({
    book: { id: 'book-1', title: 'Test Book' },
    rendition: {
      getContents: () => [mockContent],
      on: mockOn,
      off: mockOff,
    },
    bookmarks: mockBookmarks,
    setBookmarks: mockSetBookmarks,
    currentPage: 1,
    scrollMode: mockScrollMode,
  }),
}));

const mockDoc = document.implementation.createHTMLDocument('EPUB Doc');
const p1 = mockDoc.createElement('p');
p1.textContent = 'Este é o primeiro parágrafo de leitura contínua.';
mockDoc.body.appendChild(p1);

const mockContent = {
  document: mockDoc,
  cfiFromNode: vi.fn().mockReturnValue('epubcfi(/6/2[p1])'),
};

describe('useEpubContinuousBookmarks Hook', () => {
  it('injects inline bookmark CSS and attaches ghost ribbon to paragraph in continuous mode', () => {
    mockScrollMode = true;
    mockBookmarks = [];

    const { result } = renderHook(() => useEpubContinuousBookmarks());

    act(() => {
      result.current.syncBookmarks();
    });

    const style = mockDoc.getElementById('epub-inline-bookmark-styles');
    expect(style).not.toBeNull();

    const container = p1.querySelector('.epub-inline-bookmark-container');
    expect(container).not.toBeNull();
    expect(container?.dataset.state).toBe('ghost');

    const ghost = container?.querySelector('.epub-inline-bookmark-ghost') as HTMLElement;
    expect(ghost).not.toBeNull();
  });

  it('renders active ribbon when paragraph matches bookmark and handles click to remove', async () => {
    mockScrollMode = true;
    mockBookmarks = [
      {
        id: 'bm-1',
        book_id: 'book-1',
        page_number: 1,
        label: 'epubcfi(/6/2[p1])',
        created_at: new Date().toISOString(),
      },
    ];
    mockDeleteBookmark.mockResolvedValueOnce(true);

    const { result } = renderHook(() => useEpubContinuousBookmarks());

    act(() => {
      result.current.syncBookmarks();
    });

    const container = p1.querySelector('.epub-inline-bookmark-container');
    expect(container?.dataset.state).toBe('bm-1');

    const activeRibbon = container?.querySelector('.epub-inline-bookmark') as HTMLElement;
    expect(activeRibbon).not.toBeNull();

    await act(async () => {
      activeRibbon.click();
    });

    expect(mockDeleteBookmark).toHaveBeenCalledWith('bm-1');
  });

  it('cleans up inline bookmark elements when switching to paginated mode (scrollMode = false)', () => {
    mockScrollMode = false;
    mockBookmarks = [];

    const { result } = renderHook(() => useEpubContinuousBookmarks());

    act(() => {
      result.current.syncBookmarks();
    });

    const container = p1.querySelector('.epub-inline-bookmark-container');
    expect(container).toBeNull();
    expect(mockDoc.getElementById('epub-inline-bookmark-styles')).toBeNull();
  });
});
