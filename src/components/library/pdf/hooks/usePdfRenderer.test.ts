import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePdfRenderer } from './usePdfRenderer';
import type { LibraryBook } from '../../../../types';

describe('usePdfRenderer Hook', () => {
  const mockBook: LibraryBook = {
    id: 'book_render_1',
    title: 'Design Patterns',
    author: 'Gang of Four',
    format: 'pdf',
    total_pages: 400,
    last_read_page: 5,
    reading_status: 'reading',
    created_at: 1000,
    updated_at: 1000,
  };

  const mockPdfDoc = {
    numPages: 400,
    getPage: vi.fn().mockResolvedValue({
      getViewport: () => ({ width: 600, height: 800 }),
    }),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes currentPage with book last_read_page', () => {
    const onUpdateBook = vi.fn();
    const { result } = renderHook(() =>
      usePdfRenderer({
        totalPages: 400,
        loading: false,
        book: mockBook,
        onUpdateBook,
        pdfDoc: mockPdfDoc,
      })
    );

    expect(result.current.currentPage).toBe(5);
    expect(result.current.zoom).toBe(1.0);
  });

  it('clamps zoom changes within [0.5, 3.0]', () => {
    const onUpdateBook = vi.fn();
    const { result } = renderHook(() =>
      usePdfRenderer({
        totalPages: 400,
        loading: false,
        book: mockBook,
        onUpdateBook,
        pdfDoc: mockPdfDoc,
      })
    );

    act(() => {
      result.current.handleZoom(3.5);
    });
    expect(result.current.zoom).toBe(3.0);

    act(() => {
      result.current.handleZoom(0.2);
    });
    expect(result.current.zoom).toBe(0.5);

    act(() => {
      result.current.handleZoom((z) => z + 0.5);
    });
    expect(result.current.zoom).toBe(1.0);
  });

  it('updates currentPage when scrollToPage is called', () => {
    const onUpdateBook = vi.fn();
    const { result } = renderHook(() =>
      usePdfRenderer({
        totalPages: 400,
        loading: false,
        book: mockBook,
        onUpdateBook,
        pdfDoc: mockPdfDoc,
      })
    );

    act(() => {
      result.current.scrollToPage(25, false);
    });

    expect(result.current.currentPage).toBe(25);
  });
});
