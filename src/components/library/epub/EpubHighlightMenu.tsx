import React, { useLayoutEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import DictionaryModal from '../DictionaryModal';
import { useEpub } from './EpubContext';
import { useStore } from '../../../store/useStore';
import { useEpubHighlightActions } from './hooks/useEpubHighlightActions';
import { EpubHighlightColorBar } from './ui/EpubHighlightColorBar';
import { EpubHighlightNoteEditor } from './ui/EpubHighlightNoteEditor';

const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

export default function EpubHighlightMenu() {
  const { dispatch } = useStore();
  const { readingMode } = useEpub();
  const {
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
  } = useEpubHighlightActions();

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

  if (!selection && !dictionaryTarget?.selection) {
    if (dictionaryTarget) {
      return (
        <DictionaryModal
          text={dictionaryTarget.word}
          pageContext={dictionaryTarget.context}
          preloadedData={dictionaryTarget.preloadedData}
          onSaveHighlight={dictionaryTarget.selection ? (color, note) => handleCreateHighlight(color, note, dictionaryTarget.selection) : undefined}
          onClose={() => setDictionaryTarget(null)}
        />
      );
    }
    return null;
  }

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

  const handleOpenDictionary = () => {
    let preloadedData = null;
    if (noteText.startsWith('<!-- AI_DICT -->')) {
      try {
        preloadedData = JSON.parse(noteText.replace('<!-- AI_DICT -->', ''));
      } catch {}
    }
    setDictionaryTarget({ word: selection.text, context: getPageContext(), selection: { ...selection }, preloadedData });
    setSelection(null);
    setNoteMode(null);
  };

  const handleOpenDictionaryFull = () => {
    let preloadedData = null;
    try {
      preloadedData = JSON.parse(noteText.replace('<!-- AI_DICT -->', ''));
    } catch {}
    setDictionaryTarget({ word: selection.text, context: getPageContext(), selection: { ...selection }, preloadedData });
    setSelection(null);
    setNoteMode(null);
  };

  const menuContent = (
    <>
      {/* Texto Selecionado (Preview) */}
      {selection.text && (
        <div className={`mb-3 border-l-2 pl-2 pr-1 py-0.5 text-xs italic opacity-80 truncate ${readingMode === 'dark' ? 'border-brand-400' : 'border-brand-500'}`}>
          "{selection.text}"
        </div>
      )}

      {/* Barra de cores + ações rápidas */}
      <EpubHighlightColorBar
        noteMode={noteMode}
        selection={selection}
        dividerClass={dividerClass}
        confirmDelete={confirmDelete}
        onSelectColor={(color) => handleCreateHighlight(color)}
        onCopyText={() => {
          navigator.clipboard.writeText(selection.text);
          setSelection(null);
        }}
        onOpenDictionary={handleOpenDictionary}
        onOpenNote={() => setNoteMode('yellow')}
        onConfirmDelete={() => {
          handleDeleteHighlight(selection.existingHighlightId!, selection.cfiRange);
          setSelection(null);
          setNoteMode(null);
          setConfirmDelete(false);
        }}
        onRequestDelete={() => setConfirmDelete(true)}
        onCancelDelete={() => setConfirmDelete(false)}
      />

      {/* Área de nota */}
      <EpubHighlightNoteEditor
        noteText={noteText}
        noteMode={noteMode}
        noteAreaClass={noteAreaClass}
        textareaClass={textareaClass}
        onChangeNoteText={(txt) => setNoteText(txt)}
        onCloseNote={() => {
          setNoteMode(null);
          setNoteText('');
        }}
        onSaveNote={() => handleCreateHighlight(noteMode || 'yellow')}
        onOpenDictionaryFull={handleOpenDictionaryFull}
      />

      {/* Botão de IA */}
      {!noteMode && !selection.existingHighlightId && (
        <div className={`flex items-center gap-1 border-t pt-1.5 mt-0.5 ${noteAreaClass}`}>
          <button
            onClick={() => {
              dispatch({ type: 'TOGGLE_AI_SIDEBAR' });
              setSelection(null);
            }}
            className={`flex-1 px-2 py-1.5 bg-brand-500/10 rounded-lg text-[11px] font-bold hover:bg-brand-500 hover:text-white transition-colors flex items-center justify-center gap-1 ${
              readingMode === 'dark' ? 'text-brand-400' : 'text-brand-600'
            }`}
          >
            <Sparkles size={11} />
            Explicar com IA
          </button>
        </div>
      )}
    </>
  );

  // MOBILE: Bottom Sheet
  if (isMobile) {
    const selectionIsLow = selection.rect && selection.rect.top > window.innerHeight * 0.5;

    return (
      <>
        <div
          className="fixed inset-0 z-[100]"
          onClick={() => {
            if (Date.now() - openTimeRef.current < 400) return;
            setSelection(null);
            setNoteMode(null);
            setNoteText('');
          }}
        />

        {selectionIsLow ? (
          <div className={`fixed top-0 left-0 right-0 z-[101] border-b rounded-b-2xl shadow-2xl p-4 pt-6 flex flex-col gap-2 animate-slide-down ${modeClass}`}>
            {menuContent}
            <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mt-1 opacity-60" />
          </div>
        ) : (
          <div className={`fixed bottom-0 left-0 right-0 z-[101] border-t rounded-t-2xl shadow-2xl p-4 pb-6 flex flex-col gap-2 animate-slide-up ${modeClass}`}>
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
            onClose={() => {
              if (dictionaryTarget.selection) setSelection(dictionaryTarget.selection);
              setDictionaryTarget(null);
            }}
          />
        )}
      </>
    );
  }

  // DESKTOP: Floating menu
  return (
    <>
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
