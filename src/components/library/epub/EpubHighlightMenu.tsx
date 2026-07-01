import React, { useLayoutEffect, useState } from 'react';
import { Trash2, Sparkles, BookType, X } from 'lucide-react';
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


  const [dictionaryTarget, setDictionaryTarget] = useState<{ word: string, context: string, selection?: any, preloadedData?: any } | null>(null);
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
    } catch(e) {
      console.warn('Failed to extract epub context', e);
    }
    return selection?.text || '';
  };

  if (!selection && !dictionaryTarget?.selection) {
    if (dictionaryTarget) {
      return (
        <DictionaryModal 
          text={dictionaryTarget.word}
          pageContext={dictionaryTarget.context}
          preloadedData={dictionaryTarget.preloadedData}
          onClose={() => setDictionaryTarget(null)} 
        />
      );
    }
    return null;
  }

  // Se o Modal do Dicionário estiver aberto MAS a seleção foi mantida, renderizamos o modal SOBRE o menu
  // Mas para não renderizar o menu por trás ou perder o foco, na verdade o Floating-UI fica posicionado pela selection
  if (dictionaryTarget) {
    return (
      <DictionaryModal 
        text={dictionaryTarget.word}
        pageContext={dictionaryTarget.context}
        preloadedData={dictionaryTarget.preloadedData}
        onSaveHighlight={(color, note) => handleCreateHighlight(color, note, dictionaryTarget.selection)}
        onClose={() => {
          if (dictionaryTarget.selection) {
             setSelection(dictionaryTarget.selection);
          }
          setDictionaryTarget(null);
        }} 
      />
    );
  }

  const handleCreateHighlight = async (color: string, noteOverride?: string, selOverride?: any) => {
    const activeSelection = selOverride || selection;
    if (!activeSelection || !rendition) return;
    try {
      const colorMap: any = { yellow: '#fbbf24', green: '#34d399', blue: '#60a5fa', pink: '#f472b6' };
      const finalNote = noteOverride !== undefined ? noteOverride : (noteText || undefined);
      
      if (activeSelection.existingHighlightId) {
        await window.api.library.updateHighlight({
          id: activeSelection.existingHighlightId,
          color,
          note: finalNote
        });
        setHighlights((prev: any[]) => prev.map(h => h.id === activeSelection.existingHighlightId ? { ...h, color, note: finalNote } : h));
        rendition.annotations.remove(activeSelection.cfiRange, "highlight");
        rendition.annotations.highlight(activeSelection.cfiRange, {}, (e: any) => {
          // Impede a propagação do clique no SVG do grifo para o iframe do EpubJS, 
          // evitando que o leitor ache que o usuário clicou fora e feche o menu (efeito fantasma).
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          const rect = e.target.getBoundingClientRect();
          setSelection({ cfiRange: activeSelection.cfiRange, text: activeSelection.text, rect, existingHighlightId: activeSelection.existingHighlightId });
          setNoteMode(color);
          setNoteText(finalNote || '');
        }, '', { fill: colorMap[color], 'fill-opacity': '0.3', 'cursor': 'pointer' });
      } else {
        const hl = await window.api.library.createHighlight({
          book_id: book.id,
          page_number: 0,
          text_content: activeSelection.text,
          color,
          rects: activeSelection.cfiRange,
          highlight_type: 'text',
          note: finalNote
        });
        setHighlights((prev: any[]) => [...prev, hl]);

        rendition.annotations.highlight(activeSelection.cfiRange, {}, (e: any) => {
          // Impede a propagação do clique no SVG do grifo para o iframe do EpubJS, 
          // evitando que o leitor ache que o usuário clicou fora e feche o menu (efeito fantasma).
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          const rect = e.target.getBoundingClientRect();
          setSelection({ cfiRange: activeSelection.cfiRange, text: activeSelection.text, rect, existingHighlightId: hl.id });
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
              className="text-2xl opacity-70 hover:opacity-100 p-1.5 rounded-lg hover:bg-black/10 transition-colors"
              title="Copiar texto"
            >📋</button>

            {/* Dicionário */}
            {(!selection.existingHighlightId || selection.text) && (
              <button
                onClick={() => { 
                  let preloadedData = null;
                  if (noteText.startsWith('<!-- AI_DICT -->')) {
                    try { preloadedData = JSON.parse(noteText.replace('<!-- AI_DICT -->', '')); } catch(e){}
                  }
                  setDictionaryTarget({ word: selection.text, context: getPageContext(), selection: { ...selection }, preloadedData });
                  setSelection(null);
                  setNoteMode(null);
                }}
                className="opacity-70 hover:opacity-100 p-1.5 rounded-lg hover:bg-black/10 transition-colors"
                title="Dicionário / Traduzir"
              >
                <BookType size={22} />
              </button>
            )}

            {/* Nota (só para novos grifos) */}
            {!selection.existingHighlightId && (
              <button onClick={() => setNoteMode('yellow')} className="text-sm font-medium opacity-70 hover:opacity-100 px-2 py-1 rounded-lg hover:bg-black/10 transition-colors flex items-center gap-1.5">
                <span className="text-2xl">📝</span> Nota
              </button>
            )}

            {/* Lixeira (grifos existentes) */}
            {selection.existingHighlightId && (
              confirmDelete ? (
                <div className="flex items-center gap-1 bg-red-500/10 rounded-lg px-1 animate-fade-in">
                  <button
                    onClick={() => { handleDeleteHighlight(selection.existingHighlightId!, selection.cfiRange); setSelection(null); setNoteMode(null); setConfirmDelete(false); }}
                    className="text-red-500 text-xs font-bold px-2 py-1.5 hover:bg-red-500/20 rounded-md transition-colors"
                  >
                    Confirmar
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="text-dark-subtext px-1.5 py-1.5 hover:bg-black/10 rounded-md transition-colors">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                  title="Excluir Grifo"
                >
                  <Trash2 size={22} />
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Área de nota */}
      {noteMode && (
        noteText.startsWith('<!-- AI_DICT -->') ? (
          <div className={`mt-2 border-t pt-2 ${noteAreaClass}`}>
            <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-2.5 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-brand-500">
                <Sparkles size={14} />
                <span className="text-xs font-bold uppercase tracking-wider">Tradução Salva</span>
              </div>
              <div className="text-xs opacity-90 italic">
                {(() => {
                  try {
                    const data = JSON.parse(noteText.replace('<!-- AI_DICT -->', ''));
                    return data.portuguese?.translation 
                      ? `"${data.portuguese.translation}"` 
                      : "Tradução disponível no dicionário completo.";
                  } catch(e) {
                    return "Tradução detalhada salva pela IA.";
                  }
                })()}
              </div>
              <div className="flex justify-between mt-1 items-center">
                <button onClick={() => { setNoteMode(null); setNoteText(''); }} className="px-3 py-1.5 text-[11px] font-medium opacity-70 hover:opacity-100 transition-colors">Fechar</button>
                <button 
                  onClick={() => {
                    let preloadedData = null;
                    try { preloadedData = JSON.parse(noteText.replace('<!-- AI_DICT -->', '')); } catch(e){}
                    setDictionaryTarget({ word: selection.text, context: getPageContext(), selection: { ...selection }, preloadedData });
                    setSelection(null);
                    setNoteMode(null);
                  }} 
                  className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-[11px] font-bold hover:bg-brand-600 transition-colors flex items-center gap-1.5"
                >
                  <BookType size={12}/> Ver Dicionário
                </button>
              </div>
            </div>
          </div>
        ) : (
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
        )
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
          <DictionaryModal 
            text={dictionaryTarget.word}
            pageContext={dictionaryTarget.context}
            preloadedData={dictionaryTarget.preloadedData}
            onSaveHighlight={(color, note) => handleCreateHighlight(color, note, dictionaryTarget.selection)}
            onClose={() => setDictionaryTarget(null)} 
          />
        )}
      </>
    );
  }

  // ────────────────────────────────────────────
  // DESKTOP: Floating menu (comportamento anterior)
  // ────────────────────────────────────────────
  return (
    <>
      {/* 
        Correção do Pulo (Flash) no Posicionamento:
        O 'floatingStyles' injeta a posição exata via CSS inline (ex: transform: translate(x,y)).
        Nossa classe 'animate-fade-in' também usa 'transform' (translateY) no CSS.
        Se os dois ficarem na mesma tag, a animação CSS sobrescreve o posicionamento do Floating UI
        durante 0.2s, jogando o menu pra posição (0,0).
        A solução é ter uma div "pai" apenas para a posição e uma div "filha" apenas para a animação.
      */}
      <div
        key={selection?.existingHighlightId || selection?.cfiRange || 'menu'}
        ref={refs.setFloating}
        className={`absolute z-40 ${isPositioned ? 'visible' : 'invisible'}`}
        style={{ ...floatingStyles, pointerEvents: isPositioned ? 'auto' : 'none' }}
      >
        <div className={`shadow-2xl rounded-xl border p-2 flex flex-col gap-2 w-max min-w-[260px] max-w-[320px] ${modeClass} ${isPositioned ? 'animate-fade-in' : ''}`}>
          {menuContent}
        </div>
      </div>

      {dictionaryTarget && (
        <DictionaryModal 
          text={dictionaryTarget.word}
          pageContext={dictionaryTarget.context}
          preloadedData={dictionaryTarget.preloadedData}
          onSaveHighlight={(color, note) => handleCreateHighlight(color, note, dictionaryTarget.selection)}
          onClose={() => setDictionaryTarget(null)} 
        />
      )}
    </>
  );
}
