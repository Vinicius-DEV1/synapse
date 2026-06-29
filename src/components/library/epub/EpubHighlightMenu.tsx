import React, { useLayoutEffect, useState } from 'react';
import { Trash2, Sparkles, BookType } from 'lucide-react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import DictionaryModal from '../DictionaryModal';
import { useEpub } from './EpubContext';
import { useStore } from '../../../store/useStore';

const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

export default function EpubHighlightMenu() {
  const { dispatch } = useStore();
  const {
    book, rendition, selection, setSelection,
    noteMode, setNoteMode, noteText, setNoteText,
    readingMode, setHighlights
  } = useEpub();

  // Floating (desktop only)
  const { refs, floatingStyles, isPositioned } = useFloating({
    placement: 'top',
    middleware: [offset(10), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
  });

  useLayoutEffect(() => {
    if (selection?.rect && !isMobile) {
      refs.setPositionReference({
        getBoundingClientRect: () => selection.rect,
      });
    }
  }, [selection?.rect, refs]);

  const openTimeRef = React.useRef<number>(0);
  React.useEffect(() => {
    if (selection) {
      openTimeRef.current = Date.now();
    }
  }, [selection]);


  const [dictionaryTarget, setDictionaryTarget] = useState<{ word: string, context: string } | null>(null);

  if (!selection) {
    if (dictionaryTarget) {
      return <DictionaryModal target={dictionaryTarget} onClose={() => setDictionaryTarget(null)} />;
    }
    return null;
  }

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

  const modeClass = readingMode === 'dark'
    ? 'bg-[#1a1a1a] border-gray-700 text-white'
    : readingMode === 'sepia'
    ? 'bg-[#f4ecd8] border-[#d4c6a0] text-[#5b4636]'
    : 'bg-white border-gray-200 text-gray-900';

  const dividerClass = readingMode === 'dark' ? 'bg-gray-700' : readingMode === 'sepia' ? 'bg-[#d4c6a0]' : 'bg-gray-200';
  const noteAreaClass = readingMode === 'dark' ? 'border-gray-700' : readingMode === 'sepia' ? 'border-[#d4c6a0]' : 'border-gray-100';
  const textareaClass = readingMode === 'dark'
    ? 'bg-[#2a2a2a] border-gray-600 text-white'
    : readingMode === 'sepia'
    ? 'bg-[#e9dec0] border-[#d4c6a0] text-[#5b4636]'
    : 'bg-gray-50 border-gray-200 text-gray-900';

  // ────────────────────────────────────────────
  // Conteúdo do menu (igual nos dois layouts)
  // ────────────────────────────────────────────
  const menuContent = (
    <>
      {/* Texto Selecionado (Preview) */}
      {selection.text && (
        <div className={`mb-3 border-l-2 pl-2 pr-1 py-0.5 text-xs italic opacity-80 truncate ${readingMode === 'dark' ? 'border-brand-400' : 'border-brand-500'}`}>
          "{selection.text}"
        </div>
      )}

      {/* Barra de cores + ações rápidas */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => handleCreateHighlight('yellow')} className={`w-7 h-7 rounded-full bg-yellow-400 hover:scale-110 active:scale-95 transition-transform shadow-sm ${noteMode === 'yellow' || (!noteMode && selection.existingHighlightId) ? 'ring-2 ring-offset-2 ring-yellow-500' : ''}`} />
          <button onClick={() => handleCreateHighlight('green')}  className={`w-7 h-7 rounded-full bg-green-400 hover:scale-110 active:scale-95 transition-transform shadow-sm ${noteMode === 'green'  ? 'ring-2 ring-offset-2 ring-green-500'  : ''}`} />
          <button onClick={() => handleCreateHighlight('blue')}   className={`w-7 h-7 rounded-full bg-blue-400  hover:scale-110 active:scale-95 transition-transform shadow-sm ${noteMode === 'blue'   ? 'ring-2 ring-offset-2 ring-blue-500'   : ''}`} />
          <button onClick={() => handleCreateHighlight('pink')}   className={`w-7 h-7 rounded-full bg-pink-400  hover:scale-110 active:scale-95 transition-transform shadow-sm ${noteMode === 'pink'   ? 'ring-2 ring-offset-2 ring-pink-500'   : ''}`} />
        </div>

        {!noteMode && (
          <div className="flex items-center gap-1">
            <div className={`w-px h-5 mx-1 ${dividerClass}`} />
            {/* Copiar */}
            <button
              onClick={() => { navigator.clipboard.writeText(selection.text); setSelection(null); }}
              className="text-sm opacity-70 hover:opacity-100 p-1.5 rounded-lg hover:bg-black/10 transition-colors"
              title="Copiar texto"
            >📋</button>

            {/* Dicionário */}
            {(!selection.existingHighlightId || selection.text) && (
              <button
                onClick={() => setDictionaryTarget({ word: selection.text, context: selection.text })}
                className="opacity-70 hover:opacity-100 p-1.5 rounded-lg hover:bg-black/10 transition-colors"
                title="Dicionário / Traduzir"
              >
                <BookType size={15} />
              </button>
            )}

            {/* Nota (só para novos grifos) */}
            {!selection.existingHighlightId && (
              <button onClick={() => setNoteMode('yellow')} className="text-xs font-medium opacity-70 hover:opacity-100 px-2 py-1 rounded-lg hover:bg-black/10 transition-colors flex items-center gap-1">
                📝 Nota
              </button>
            )}

            {/* Lixeira (grifos existentes) */}
            {selection.existingHighlightId && (
              <button
                onClick={() => { handleDeleteHighlight(selection.existingHighlightId!, selection.cfiRange); setSelection(null); setNoteMode(null); }}
                className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                title="Excluir Grifo"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Área de nota */}
      {noteMode && (
        <div className={`flex flex-col gap-1.5 mt-2 border-t pt-2 ${noteAreaClass}`}>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Escreva sua nota aqui..."
            className={`w-full text-xs p-2 border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 ${textareaClass}`}
            rows={3}
          />
          <div className="flex justify-end gap-1.5">
            <button onClick={() => { setNoteMode(null); setNoteText(''); }} className="px-3 py-1.5 text-xs opacity-70 hover:opacity-100 rounded-lg hover:bg-black/10 transition-colors">Cancelar</button>
            <button onClick={() => handleCreateHighlight(noteMode || 'yellow')} className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-bold hover:bg-brand-600 transition-colors">Salvar</button>
          </div>
        </div>
      )}

      {/* Botão de IA (só para novos grifos, sem nota aberta) */}
      {!noteMode && !selection.existingHighlightId && (
        <div className={`flex items-center gap-1 border-t pt-1.5 mt-0.5 ${noteAreaClass}`}>
          <button
            onClick={() => { dispatch({ type: 'TOGGLE_AI_SIDEBAR' }); setSelection(null); }}
            className={`flex-1 px-2 py-1.5 bg-brand-500/10 rounded-lg text-[11px] font-bold hover:bg-brand-500 hover:text-white transition-colors flex items-center justify-center gap-1 ${readingMode === 'dark' ? 'text-brand-400' : 'text-brand-600'}`}
          >
            <Sparkles size={11} />
            Explicar com IA
          </button>
        </div>
      )}
    </>
  );

  // ────────────────────────────────────────────
  // MOBILE: Bottom Sheet deslizante (ou Top Sheet se seleção for na base)
  // ────────────────────────────────────────────
  if (isMobile) {
    // Se o texto selecionado está na metade inferior da tela, exibir o menu no topo
    const selectionIsLow = selection.rect && selection.rect.top > window.innerHeight * 0.5;

    return (
      <>
        {/* Overlay acima do iframe para fechar ao tocar fora */}
        <div
          className="fixed inset-0 z-[100]"
          onClick={() => { 
            if (Date.now() - openTimeRef.current < 400) return; // Ignorar ghost clicks do Android
            setSelection(null); 
            setNoteMode(null); 
            setNoteText(''); 
          }}
        />

        {selectionIsLow ? (
          /* Top Sheet — seleção está na base da tela */
          <div
            className={`fixed top-0 left-0 right-0 z-[101] border-b rounded-b-2xl shadow-2xl p-4 pt-6 flex flex-col gap-2 animate-slide-down ${modeClass}`}
          >
            {menuContent}
            <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mt-1 opacity-60" />
          </div>
        ) : (
          /* Bottom Sheet — seleção está na parte superior da tela */
          <div
            className={`fixed bottom-0 left-0 right-0 z-[101] border-t rounded-t-2xl shadow-2xl p-4 pb-6 flex flex-col gap-2 animate-slide-up ${modeClass}`}
          >
            <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-1 opacity-60" />
            {menuContent}
          </div>
        )}

        {dictionaryTarget && (
          <DictionaryModal target={dictionaryTarget} onClose={() => setDictionaryTarget(null)} />
        )}
      </>
    );
  }

  // ────────────────────────────────────────────
  // DESKTOP: Floating menu (comportamento anterior)
  // ────────────────────────────────────────────
  return (
    <>
      <div
        ref={refs.setFloating}
        className={`absolute z-40 shadow-2xl rounded-xl border p-2 flex flex-col gap-2 w-56 ${isPositioned ? 'animate-fade-in' : ''} ${modeClass}`}
        style={{ ...floatingStyles, visibility: isPositioned ? 'visible' : 'hidden' }}
      >
        {menuContent}
      </div>

      {dictionaryTarget && (
        <DictionaryModal target={dictionaryTarget} onClose={() => setDictionaryTarget(null)} />
      )}
    </>
  );
}
