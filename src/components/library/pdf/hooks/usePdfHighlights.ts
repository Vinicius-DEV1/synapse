import { useState, useEffect, useCallback } from 'react';
import type { LibraryBook, LibraryHighlight } from '../../../../types';
import type { TextSelectionState, ActiveHighlightState } from '../types';

interface UsePdfHighlightsProps {
  book: LibraryBook;
  highlights: LibraryHighlight[];
  setHighlights: React.Dispatch<React.SetStateAction<LibraryHighlight[]>>;
}

export function usePdfHighlights({ book, setHighlights }: UsePdfHighlightsProps) {
  const [activeHighlight, setActiveHighlight] = useState<ActiveHighlightState | null>(null);
  const [selection, setSelection] = useState<TextSelectionState | null>(null);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore clicks on UI toolbars and interactive elements
      if (
        target.closest('.pdf-toolbar') ||
        target.closest('.modal-content') ||
        target.closest('.highlight-toolbar-container') ||
        target.closest('.dictionary-modal') ||
        target.closest('.annotation-panel') ||
        target.closest('.bookmark-ribbon')
      ) {
        return;
      }

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        if (!target.closest('.highlight-mark') && !target.closest('.pdf-highlight-layer')) {
          setSelection(null);
          setActiveHighlight(null);
        }
        return;
      }

      let pageNum = -1;
      let textLayer: HTMLElement | null = null;
      const el = sel.anchorNode instanceof HTMLElement ? sel.anchorNode : sel.anchorNode?.parentElement;

      if (el) {
        const pageWrapper = el.closest('.pdf-page-wrapper') as HTMLElement | null;
        if (pageWrapper && pageWrapper.dataset.pageNumber) {
          pageNum = Number(pageWrapper.dataset.pageNumber);
          textLayer =
            pageWrapper.querySelector('.pdf-text-layer') ||
            pageWrapper.querySelector('.textLayer') ||
            pageWrapper;
        }
      }

      if (!textLayer || pageNum === -1) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rects = Array.from(range.getClientRects());
      if (rects.length === 0) return;

      const layerRect = textLayer.getBoundingClientRect();
      if (layerRect.width <= 0 || layerRect.height <= 0) return;

      const relativeRects = rects.map((r) => ({
        top: (r.top - layerRect.top) / layerRect.height,
        left: (r.left - layerRect.left) / layerRect.width,
        width: r.width / layerRect.width,
        height: r.height / layerRect.height,
      }));

      const lastRect = rects[rects.length - 1];
      const selText = sel.toString().trim();
      if (!selText) return;

      // Extract brief page context efficiently without joining full document DOM
      let pageContext = selText;
      const textNodes = textLayer.children;
      if (textNodes.length > 0) {
        const sample = selText.substring(0, 15);
        for (let i = 0; i < textNodes.length; i++) {
          const itemText = textNodes[i].textContent;
          if (itemText && itemText.includes(sample)) {
            const startIdx = Math.max(0, i - 2);
            const endIdx = Math.min(textNodes.length, i + 3);
            const contextParts: string[] = [];
            for (let j = startIdx; j < endIdx; j++) {
              contextParts.push(textNodes[j].textContent || '');
            }
            pageContext = contextParts.join(' ').trim();
            break;
          }
        }
      }

      setSelection({
        text: selText,
        pageContext,
        rects: relativeRects,
        pageNum,
        position: { x: lastRect.right, y: lastRect.bottom + window.scrollY },
      });
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  const handleSaveHighlight = useCallback(
    async (color: string, note?: string) => {
      if (!selection || !window.api?.library) return;
      const newHighlight = await window.api.library.createHighlight({
        book_id: book.id,
        page_number: selection.pageNum,
        text_content: selection.text,
        color: color as LibraryHighlight['color'],
        rects: JSON.stringify(selection.rects),
        highlight_type: 'text',
        note: note || '',
      });
      setHighlights((prev) => [...prev, newHighlight]);
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    },
    [book.id, selection, setHighlights]
  );

  const handleDeleteHighlight = useCallback(
    async (id: string) => {
      if (!window.api?.library) return;
      await window.api.library.deleteHighlight(id);
      setHighlights((prev) => prev.filter((h) => h.id !== id));
      setActiveHighlight(null);
    },
    [setHighlights]
  );

  return {
    activeHighlight,
    setActiveHighlight,
    selection,
    setSelection,
    handleSaveHighlight,
    handleDeleteHighlight,
  };
}
