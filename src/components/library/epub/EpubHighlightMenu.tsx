import React, { useLayoutEffect } from 'react';
import { Trash2, Sparkles } from 'lucide-react';
import { useFloating, offset, flip, shift } from '@floating-ui/react';
import { useEpub } from './EpubContext';
import { useStore } from '../../../store/useStore';

export default function EpubHighlightMenu() {
  const { dispatch } = useStore();
  const {
    book, rendition, selection, setSelection,
    noteMode, setNoteMode, noteText, setNoteText,
    readingMode, setHighlights
  } = useEpub();

  const { refs, floatingStyles } = useFloating({
    placement: 'top',
    middleware: [offset(10), flip(), shift({ padding: 10 })],
  });

  useLayoutEffect(() => {
    if (selection?.rect) {
      refs.setPositionReference({
        getBoundingClientRect: () => selection.rect,
      });
    }
  }, [selection?.rect, refs]);

  if (!selection) return null;

  const handleCreateHighlight = async (color: string) => {
    if (!selection || !rendition) return;
    try {
      const colorMap: any = { yellow: '#fbbf24', green: '#34d399', blue: '#60a5fa', pink: '#f472b6' };
      
      if (selection.existingHighlightId) {
        await window.api.library.updateHighlight({
          id: selection.existingHighlightId,
          color,
          note: noteText || undefined
        });
        setHighlights((prev: any[]) => prev.map(h => h.id === selection.existingHighlightId ? { ...h, color, note: noteText || undefined } : h));
        rendition.annotations.remove(selection.cfiRange, "highlight");
        rendition.annotations.highlight(selection.cfiRange, {}, (e: any) => {
          const rect = e.target.getBoundingClientRect();
          setSelection({ cfiRange: selection.cfiRange, text: selection.text, rect, existingHighlightId: selection.existingHighlightId });
          setNoteMode(color);
          setNoteText(noteText || '');
        }, '', { fill: colorMap[color], 'fill-opacity': '0.3', 'cursor': 'pointer' });
      } else {
        const hl = await window.api.library.createHighlight({
          book_id: book.id,
          page_number: 0,
          text_content: selection.text,
          color,
          rects: selection.cfiRange,
          highlight_type: 'text',
          note: noteText || undefined
        });
        setHighlights((prev: any[]) => [...prev, hl]);

        rendition.annotations.highlight(selection.cfiRange, {}, (e: any) => {
          const rect = e.target.getBoundingClientRect();
          setSelection({ cfiRange: selection.cfiRange, text: selection.text, rect, existingHighlightId: hl.id });
          setNoteMode(color);
          setNoteText(hl.note || '');
        }, '', { fill: colorMap[color], 'fill-opacity': '0.3', 'cursor': 'pointer' });
      }
    } catch (e) {
      console.error(e);
    }
    setSelection(null);
    setNoteMode(null);
    setNoteText('');
  };

  const handleDeleteHighlight = async (id: string, cfi: string) => {
    await window.api.library.deleteHighlight(id);
    setHighlights((prev: any[]) => prev.filter(h => h.id !== id));
    rendition?.annotations.remove(cfi, "highlight");
  };

  return (
    <div 
      ref={refs.setFloating}
      className={`absolute z-40 shadow-2xl rounded-xl border p-2 flex flex-col gap-2 w-56 animate-fade-in ${readingMode === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : readingMode === 'sepia' ? 'bg-[#f4ecd8] border-[#d4c6a0] text-[#5b4636]' : 'bg-white border-gray-200 text-gray-900'}`}
      style={floatingStyles}
    >
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button onClick={() => handleCreateHighlight('yellow')} className={`w-6 h-6 rounded-full bg-yellow-400 hover:scale-110 transition-transform shadow-sm ${noteMode === 'yellow' || (!noteMode && selection.existingHighlightId) ? 'ring-2 ring-brand-500' : ''}`} />
            <button onClick={() => handleCreateHighlight('green')} className={`w-6 h-6 rounded-full bg-green-400 hover:scale-110 transition-transform shadow-sm ${noteMode === 'green' ? 'ring-2 ring-brand-500' : ''}`} />
            <button onClick={() => handleCreateHighlight('blue')} className={`w-6 h-6 rounded-full bg-blue-400 hover:scale-110 transition-transform shadow-sm ${noteMode === 'blue' ? 'ring-2 ring-brand-500' : ''}`} />
            <button onClick={() => handleCreateHighlight('pink')} className={`w-6 h-6 rounded-full bg-pink-400 hover:scale-110 transition-transform shadow-sm ${noteMode === 'pink' ? 'ring-2 ring-brand-500' : ''}`} />
          </div>
          
          {!noteMode && !selection.existingHighlightId && (
              <div className="flex items-center gap-1.5">
                <div className={`w-px h-5 mx-1 ${readingMode === 'dark' ? 'bg-gray-700' : readingMode === 'sepia' ? 'bg-[#d4c6a0]' : 'bg-gray-200'}`} />
                <button onClick={() => setNoteMode('yellow')} className="text-xs font-medium opacity-80 hover:opacity-100 px-1 py-1 flex items-center gap-1">
                  📝 Nota
                </button>
              </div>
          )}
      </div>

      {(noteMode || selection.existingHighlightId) && (
        <div className={`flex flex-col gap-1.5 mt-1 border-t pt-2 ${readingMode === 'dark' ? 'border-gray-700' : readingMode === 'sepia' ? 'border-[#d4c6a0]' : 'border-gray-100'}`}>
          <textarea
            autoFocus
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Escreva sua nota aqui..."
            className={`w-full text-xs p-2 border rounded-lg resize-none focus:outline-brand-500 ${readingMode === 'dark' ? 'bg-[#2a2a2a] border-gray-600 text-white' : readingMode === 'sepia' ? 'bg-[#e9dec0] border-[#d4c6a0] text-[#5b4636]' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            rows={3}
          />
          <div className="flex justify-between items-center mt-1">
            {selection.existingHighlightId ? (
              <button 
                onClick={() => {
                  handleDeleteHighlight(selection.existingHighlightId!, selection.cfiRange);
                  setSelection(null);
                  setNoteMode(null);
                }}
                className="text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors"
                title="Excluir Grifo"
              >
                <Trash2 size={14} />
              </button>
            ) : (
                <div />
            )}
            <div className="flex gap-1.5 ml-auto">
              <button onClick={() => { setNoteMode(null); setNoteText(''); }} className="px-2 py-1 text-xs opacity-70 hover:opacity-100">Cancelar</button>
              <button onClick={() => handleCreateHighlight(noteMode || 'yellow')} className="px-2 py-1 bg-brand-500 text-white rounded-md text-xs font-bold hover:bg-brand-600">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {!noteMode && !selection.existingHighlightId && (
        <div className={`flex items-center gap-1 border-t pt-1.5 mt-0.5 ${readingMode === 'dark' ? 'border-gray-700' : readingMode === 'sepia' ? 'border-[#d4c6a0]' : 'border-gray-100'}`}>
            <button 
              onClick={() => {
                dispatch({ type: 'TOGGLE_AI_SIDEBAR' });
                setSelection(null);
              }}
              className={`flex-1 px-2 py-1 bg-brand-500/10 rounded-md text-[11px] font-bold hover:bg-brand-500 hover:text-white transition-colors flex items-center justify-center gap-1 ${readingMode === 'dark' ? 'text-brand-400' : 'text-brand-600'}`}
            >
              <Sparkles size={11} />
              Explicar com IA
            </button>
        </div>
      )}
    </div>
  );
}
