import { useState, useEffect, useCallback, useRef } from 'react';
import type { LibraryBook, LibraryHighlight } from '../../../../types';
import type { TextSelectionState, ActiveHighlightState } from '../types';
import { mergeHighlightRects } from '../utils/highlightRects';

interface UsePdfHighlightsProps {
  book: LibraryBook;
  highlights: LibraryHighlight[];
  setHighlights: React.Dispatch<React.SetStateAction<LibraryHighlight[]>>;
}

export function usePdfHighlights({ book, highlights, setHighlights }: UsePdfHighlightsProps) {
  const [activeHighlight, setActiveHighlight] = useState<ActiveHighlightState | null>(null);
  const [selection, setSelection] = useState<TextSelectionState | null>(null);
  const highlightsRef = useRef(highlights);
  highlightsRef.current = highlights;
  const isMouseDownRef = useRef(false);

  useEffect(() => {
    let selectionTimeout: ReturnType<typeof setTimeout> | null = null;

    const processSelection = () => {
      // If user is currently focused in an input/textarea (e.g. typing a note), do not disrupt
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelection(null);
        return;
      }

      const selText = sel.toString().trim();
      if (!selText) {
        setSelection(null);
        return;
      }

      if (sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);

      const candidateNodes = [
        range.startContainer,
        range.commonAncestorContainer,
        sel.anchorNode,
        sel.focusNode,
      ];
      let pageNum = -1;
      let textLayer: HTMLElement | null = null;

      for (const n of candidateNodes) {
        if (!n) continue;
        const elem = (n instanceof Element ? n : n.parentElement) as HTMLElement | null;
        const pageWrapper = elem?.closest('.pdf-page-wrapper') as HTMLElement | null;
        if (pageWrapper && pageWrapper.dataset.pageNumber) {
          pageNum = Number(pageWrapper.dataset.pageNumber);
          textLayer =
            pageWrapper.querySelector('.pdf-text-layer') ||
            pageWrapper.querySelector('.textLayer') ||
            pageWrapper;
          break;
        }
      }

      if (!textLayer || pageNum === -1) {
        return;
      }

      let rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
      if (rects.length === 0) {
        const bRect = range.getBoundingClientRect();
        if (bRect.width > 0 && bRect.height > 0) {
          rects = [bRect];
        }
      }
      if (rects.length === 0) return;

      const layerRect = textLayer.getBoundingClientRect();
      if (layerRect.width <= 0 || layerRect.height <= 0) return;

      const relativeRects = rects.map((r) => ({
        top: (r.top - layerRect.top) / layerRect.height,
        left: (r.left - layerRect.left) / layerRect.width,
        width: r.width / layerRect.width,
        height: r.height / layerRect.height,
      }));

      const mergedRects = mergeHighlightRects(relativeRects);
      const lastRect = rects[rects.length - 1];

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
        rects: mergedRects,
        pageNum,
        position: { x: lastRect.right, y: lastRect.bottom + window.scrollY },
      });
    };

    const handleSelectionChange = () => {
      // While mouse is being dragged, wait for mouseup
      if (isMouseDownRef.current) return;
      if (selectionTimeout) clearTimeout(selectionTimeout);
      selectionTimeout = setTimeout(() => {
        processSelection();
      }, 100);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isMouseDownRef.current = true;
      }
    };

    const handleTouchStart = () => {
      isMouseDownRef.current = false;
    };

    const handleMouseUp = (e: MouseEvent | TouchEvent) => {
      isMouseDownRef.current = false;
      const target = (e.target instanceof Element
        ? e.target
        : (e.target as Node | null)?.parentElement) as HTMLElement | null;
      if (!target || typeof target.closest !== 'function') return;

      // Ignore clicks on UI toolbars, modals, inspector popovers and interactive elements
      if (
        target.closest('.pdf-toolbar') ||
        target.closest('.modal-content') ||
        target.closest('.highlight-toolbar-container') ||
        target.closest('.dictionary-modal') ||
        target.closest('.annotation-panel') ||
        target.closest('.bookmark-ribbon') ||
        target.closest('.highlight-popup') ||
        target.closest('.highlight-inspector') ||
        target.closest('.highlight-note-tooltip')
      ) {
        return;
      }

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        if (!target.closest('.highlight-mark') && !target.closest('.pdf-highlight-layer')) {
          // Check if single click hit an existing highlight underneath the text layer
          if ('clientX' in e && typeof document.elementsFromPoint === 'function') {
            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            const highlightEl = elements.find((elem) => elem.classList.contains('pdf-highlight-rect')) as HTMLElement | undefined;
            if (highlightEl && highlightEl.dataset.highlightId) {
              const highlightId = highlightEl.dataset.highlightId;
              const targetHighlight = highlightsRef.current.find((h) => h.id === highlightId);
              if (targetHighlight) {
                const rect = highlightEl.getBoundingClientRect();
                setActiveHighlight({
                  highlight: targetHighlight,
                  position: { x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY },
                });
                setSelection(null);
                return;
              }
            }
          }

          setSelection(null);
          setActiveHighlight(null);
        }
        return;
      }

      processSelection();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const target = (e.target instanceof Element
        ? e.target
        : (e.target as Node | null)?.parentElement) as HTMLElement | null;

      // Ignore clicks on UI toolbars, modals, inspector popovers and interactive elements
      if (
        target?.closest(
          '.pdf-toolbar, .modal-content, .highlight-toolbar-container, .dictionary-modal, .annotation-panel, .bookmark-ribbon, .highlight-popup, .highlight-inspector, .highlight-note-tooltip'
        )
      ) {
        return;
      }

      let hitHighlight = false;
      if (e.changedTouches.length === 1 && typeof document.elementsFromPoint === 'function') {
        const touch = e.changedTouches[0];
        const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
        const highlightEl = elements.find((elem) => elem.classList.contains('pdf-highlight-rect')) as HTMLElement | undefined;
        if (highlightEl && highlightEl.dataset.highlightId) {
          const highlightId = highlightEl.dataset.highlightId;
          const targetHighlight = highlightsRef.current.find((h) => h.id === highlightId);
          if (targetHighlight) {
            hitHighlight = true;
            const rect = highlightEl.getBoundingClientRect();
            setActiveHighlight({
              highlight: targetHighlight,
              position: { x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY },
            });
            setSelection(null);
            return;
          }
        }
      }

      if (!hitHighlight && !target?.closest('.highlight-mark') && !target?.closest('.pdf-highlight-layer')) {
        setActiveHighlight(null);
      }

      // On mobile devices, Android commits long-press text selection asynchronously.
      // Checking after a short 60ms delay ensures Chromium finishes placing selection handles.
      if (selectionTimeout) clearTimeout(selectionTimeout);
      selectionTimeout = setTimeout(() => {
        processSelection();
      }, 60);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      if (selectionTimeout) clearTimeout(selectionTimeout);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('selectionchange', handleSelectionChange);
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
