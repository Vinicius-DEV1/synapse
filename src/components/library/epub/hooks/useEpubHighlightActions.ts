import { useState, useCallback } from 'react';
import { useEpub } from '../EpubContext';

export function useEpubHighlightActions() {
  const {
    book, rendition, selection, setSelection,
    noteMode, setNoteMode, noteText, setNoteText,
    setHighlights
  } = useEpub();

  const [dictionaryTarget, setDictionaryTarget] = useState<{
    word: string;
    context: string;
    selection?: any;
    preloadedData?: any;
  } | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const getPageContext = () => {
    try {
      if (!rendition || !selection?.text) return selection?.text || '';
      const contents = (rendition as any).getContents();
      if (contents && contents.length > 0) {
        const bodyText = contents[0].document.body.innerText;
        if (bodyText) {
          const idx = bodyText.indexOf(selection.text);
          if (idx !== -1) {
            const start = Math.max(0, idx - 1600);
            const end = Math.min(bodyText.length, idx + 1600);
            return bodyText.substring(start, end);
          }
          return bodyText.substring(0, 3200);
        }
      }
    } catch (e) {
      console.warn('Failed to extract epub context', e);
    }
    return selection?.text || '';
  };

  const handleCreateHighlight = useCallback(async (color: string, noteOverride?: string, selOverride?: any) => {
    const activeSelection = selOverride || selection;
    if (!activeSelection || !rendition) return;
    try {
      const colorMap: any = { yellow: '#fbbf24', green: '#34d399', blue: '#60a5fa', pink: '#f472b6' };
      const finalNote = noteOverride !== undefined ? noteOverride : (noteText || undefined);

      if (activeSelection.existingHighlightId) {
        await window.api.library.updateHighlight({
          id: activeSelection.existingHighlightId,
          color,
          note: finalNote,
        });
        setHighlights((prev: any[]) => prev.map(h => h.id === activeSelection.existingHighlightId ? { ...h, color, note: finalNote } : h));
        rendition.annotations.remove(activeSelection.cfiRange, 'highlight');
        rendition.annotations.highlight(activeSelection.cfiRange, {}, (e: any) => {
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          window.__lastHighlightClick = Date.now();
          const rawRect = e.target.getBoundingClientRect();
          let offsetX = 0; let offsetY = 0;
          const iframe = e.target.ownerDocument?.defaultView?.frameElement;
          if (iframe) {
            const iframeRect = iframe.getBoundingClientRect();
            offsetX = iframeRect.left; offsetY = iframeRect.top;
          }
          const rect = {
            top: rawRect.top + offsetY, left: rawRect.left + offsetX,
            bottom: rawRect.bottom + offsetY, right: rawRect.right + offsetX,
            x: rawRect.x + offsetX, y: rawRect.y + offsetY,
            width: rawRect.width, height: rawRect.height, toJSON: rawRect.toJSON,
          } as DOMRect;
          setSelection({ cfiRange: activeSelection.cfiRange, text: activeSelection.text, rect, existingHighlightId: activeSelection.existingHighlightId });
          setNoteMode(color);
          setNoteText(finalNote || '');
        }, '', { fill: colorMap[color], 'fill-opacity': '0.3', cursor: 'pointer' });
      } else {
        const hl = await window.api.library.createHighlight({
          book_id: book.id,
          page_number: 0,
          text_content: activeSelection.text,
          color,
          rects: activeSelection.cfiRange,
          highlight_type: 'text',
          note: finalNote,
        });
        setHighlights((prev: any[]) => [...prev, hl]);
        rendition.annotations.highlight(activeSelection.cfiRange, {}, (e: any) => {
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          window.__lastHighlightClick = Date.now();
          const rawRect = e.target.getBoundingClientRect();
          let offsetX = 0; let offsetY = 0;
          const iframe = e.target.ownerDocument?.defaultView?.frameElement;
          if (iframe) {
            const iframeRect = iframe.getBoundingClientRect();
            offsetX = iframeRect.left; offsetY = iframeRect.top;
          }
          const rect = {
            top: rawRect.top + offsetY, left: rawRect.left + offsetX,
            bottom: rawRect.bottom + offsetY, right: rawRect.right + offsetX,
            x: rawRect.x + offsetX, y: rawRect.y + offsetY,
            width: rawRect.width, height: rawRect.height, toJSON: rawRect.toJSON,
          } as DOMRect;
          setSelection({ cfiRange: activeSelection.cfiRange, text: activeSelection.text, rect, existingHighlightId: hl.id });
          setNoteMode(color);
          setNoteText(hl.note || '');
        }, '', { fill: colorMap[color], 'fill-opacity': '0.3', cursor: 'pointer' });
      }
    } catch (e) {
      console.error(e);
    }
    setSelection(null);
    setNoteMode(null);
    setNoteText('');
  }, [selection, rendition, book.id, noteText, setHighlights, setSelection, setNoteMode, setNoteText]);

  const handleDeleteHighlight = async (id: string, cfi: string) => {
    await window.api.library.deleteHighlight(id);
    setHighlights((prev: any[]) => prev.filter(h => h.id !== id));
    rendition?.annotations.remove(cfi, 'highlight');
  };

  return {
    selection,
    setSelection,
    noteMode,
    setNoteMode,
    noteText,
    setNoteText,
    dictionaryTarget,
    setDictionaryTarget,
    confirmDelete,
    setConfirmDelete,
    getPageContext,
    handleCreateHighlight,
    handleDeleteHighlight,
  };
}
