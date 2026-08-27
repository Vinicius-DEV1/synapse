import { useState, useEffect } from 'react';
import type { LibraryBook, LibraryHighlight } from '../../../../types';

interface UsePdfHighlightsProps {
  book: LibraryBook;
  highlights: LibraryHighlight[];
  setHighlights: React.Dispatch<React.SetStateAction<LibraryHighlight[]>>;
}

export function usePdfHighlights({ book, setHighlights }: UsePdfHighlightsProps) {
  const [activeHighlight, setActiveHighlight] = useState<{ highlight: LibraryHighlight, position: { x: number, y: number } } | null>(null);
  const [selection, setSelection] = useState<{
    text: string;
    pageContext?: string;
    rects: any[];
    pageNum: number;
    position: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.pdf-toolbar') || target.closest('.modal-content') || target.closest('.highlight-toolbar') || target.closest('.dictionary-modal')) {
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
        const pageWrapper = el.closest('.pdf-page-wrapper') as HTMLElement;
        if (pageWrapper && pageWrapper.dataset.pageNumber) {
          pageNum = Number(pageWrapper.dataset.pageNumber);
          textLayer = pageWrapper.querySelector('.pdf-text-layer') || pageWrapper.querySelector('.textLayer') || pageWrapper;
        } else {
          let curr: HTMLElement | null = el;
          while (curr && curr !== document.body) {
            if (curr.dataset?.pageNumber) {
              pageNum = Number(curr.dataset.pageNumber);
              textLayer = curr.querySelector('.pdf-text-layer') || curr.querySelector('.textLayer') || curr;
              break;
            }
            curr = curr.parentElement;
          }
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

      const relativeRects = rects.map(r => ({
        top: (r.top - layerRect.top) / layerRect.height,
        left: (r.left - layerRect.left) / layerRect.width,
        width: r.width / layerRect.width,
        height: r.height / layerRect.height,
      }));

      const lastRect = rects[rects.length - 1];
      
      let pageContext = "";
      const textNodes = Array.from(textLayer.childNodes).filter(n => n.nodeType === Node.ELEMENT_NODE);
      const selText = sel.toString().trim();
      if (!selText) return;
      
      for (let i = 0; i < textNodes.length; i++) {
        if (textNodes[i].textContent?.includes(selText.substring(0, 10))) {
          pageContext = textNodes.map(n => n.textContent).join(" ");
          break;
        }
      }

      setSelection({
        text: selText,
        pageContext: pageContext || selText,
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

  const handleSaveHighlight = async (color: string, note?: string) => {
    if (!selection) return;
    const newHighlight = await window.api.library.createHighlight({
      book_id: book.id,
      page_number: selection.pageNum,
      text_content: selection.text,
      color: color as LibraryHighlight['color'],
      rects: JSON.stringify(selection.rects),
      highlight_type: 'text',
      note: note || '',
    });
    setHighlights(prev => [...prev, newHighlight]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleDeleteHighlight = async (id: string) => {
    await window.api.library.deleteHighlight(id);
    setHighlights(prev => prev.filter(h => h.id !== id));
    setActiveHighlight(null);
  };

  return { activeHighlight, setActiveHighlight, selection, setSelection, handleSaveHighlight, handleDeleteHighlight };
}

