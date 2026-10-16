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

  it('activates existing highlight on single click when selection is collapsed', async () => {
    const highlights = [...initialHighlights];
    const setHighlights = vi.fn();

    const { result } = renderHook(() =>
      usePdfHighlights({
        book: mockBook,
        highlights,
        setHighlights,
      })
    );

    // Mock collapsed window.getSelection()
    const mockSelection = {
      isCollapsed: true,
      toString: () => '',
    };
    vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection as any);

    // Create a mock highlight element returned by elementsFromPoint
    const mockHighlightEl = document.createElement('div');
    mockHighlightEl.classList.add('pdf-highlight-rect');
    mockHighlightEl.dataset.highlightId = 'hl_1';
    vi.spyOn(mockHighlightEl, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      width: 50,
      bottom: 200,
    } as DOMRect);

    document.elementsFromPoint = vi.fn().mockReturnValue([mockHighlightEl]);

    // Dispatch mouseup event from a page element
    await act(async () => {
      const pageEl = document.createElement('div');
      document.body.appendChild(pageEl);
      const mouseEvent = new MouseEvent('mouseup', { clientX: 120, clientY: 150, bubbles: true });
      pageEl.dispatchEvent(mouseEvent);
      document.body.removeChild(pageEl);
    });

    expect(result.current.activeHighlight).toEqual({
      highlight: initialHighlights[0],
      position: { x: 125, y: 200 },
    });
  });

  it('triggers selection state on selectionchange when user selects text', async () => {
    vi.useFakeTimers();
    const setHighlights = vi.fn();
    const { result } = renderHook(() =>
      usePdfHighlights({
        book: mockBook,
        highlights: initialHighlights,
        setHighlights,
      })
    );

    // Setup DOM tree for a PDF page wrapper and text layer
    const pageWrapper = document.createElement('div');
    pageWrapper.className = 'pdf-page-wrapper';
    pageWrapper.dataset.pageNumber = '5';
    const textLayer = document.createElement('div');
    textLayer.className = 'pdf-text-layer';
    vi.spyOn(textLayer, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      left: 50,
      width: 400,
      height: 600,
      bottom: 700,
      right: 450,
    } as DOMRect);

    const span = document.createElement('span');
    span.textContent = 'Arquitetura Limpa';
    textLayer.appendChild(span);
    pageWrapper.appendChild(textLayer);
    document.body.appendChild(pageWrapper);

    const mockRange = {
      commonAncestorContainer: span,
      startContainer: span,
      getClientRects: () => [
        {
          top: 120,
          left: 60,
          width: 100,
          height: 20,
          bottom: 140,
          right: 160,
        } as DOMRect,
      ],
      getBoundingClientRect: () =>
        ({
          top: 120,
          left: 60,
          width: 100,
          height: 20,
          bottom: 140,
          right: 160,
        } as DOMRect),
    };

    const mockSel = {
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => mockRange,
      toString: () => 'Arquitetura Limpa',
      anchorNode: span,
      focusNode: span,
    };
    vi.spyOn(window, 'getSelection').mockReturnValue(mockSel as unknown as Selection);

    await act(async () => {
      document.dispatchEvent(new Event('selectionchange'));
      vi.advanceTimersByTime(150);
    });

    expect(result.current.selection).not.toBeNull();
    expect(result.current.selection?.text).toBe('Arquitetura Limpa');
    expect(result.current.selection?.pageNum).toBe(5);

    document.body.removeChild(pageWrapper);
    vi.useRealTimers();
  });
});
