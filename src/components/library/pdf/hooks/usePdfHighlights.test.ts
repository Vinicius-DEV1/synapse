import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePdfHighlights } from './usePdfHighlights';
import type { LibraryBook, LibraryHighlight } from '../../../../types';

describe('usePdfHighlights Hook', () => {
  const mockBook: LibraryBook = {
    id: 'book_1',
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    format: 'pdf',
    total_pages: 350,
    reading_status: 'reading',
    created_at: 1000,
    updated_at: 1000,
  };

  const initialHighlights: LibraryHighlight[] = [
    {
      id: 'hl_1',
      book_id: 'book_1',
      page_number: 12,
      text_content: 'Dependency Inversion Principle',
      color: 'yellow',
      rects: '[]',
      created_at: 1000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      library: {
        createHighlight: vi.fn().mockImplementation(async (hl) => ({
          ...hl,
          id: 'hl_new_99',
          created_at: Date.now(),
        })),
        deleteHighlight: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('deletes an existing highlight and removes from state', async () => {
    let highlights = [...initialHighlights];
    const setHighlights = vi.fn((updater) => {
      if (typeof updater === 'function') {
        highlights = updater(highlights);
      }
    });

    const { result } = renderHook(() =>
      usePdfHighlights({
        book: mockBook,
        highlights,
        setHighlights,
      })
    );

    await act(async () => {
      await result.current.handleDeleteHighlight('hl_1');
    });

    expect(window.api.library.deleteHighlight).toHaveBeenCalledWith('hl_1');
    expect(setHighlights).toHaveBeenCalled();
  });
});
