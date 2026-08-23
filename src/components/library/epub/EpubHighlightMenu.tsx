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

  const isDark = ['dark', 'midnight', 'nord', 'dim', 'high-contrast'].includes(readingMode);

  const modeClass = (() => {
    switch (readingMode) {
      case 'midnight':
        return 'bg-[#0f172a] border-[#334155] text-[#f1f5f9] shadow-2xl shadow-black/70';
      case 'nord':
        return 'bg-[#2e3440] border-[#4c566a] text-[#eceff4] shadow-2xl shadow-black/50';
      case 'dim':
        return 'bg-[#2d2d30] border-[#454545] text-[#e0e0e0] shadow-2xl shadow-black/50';
      case 'dark':
        return 'bg-[#1a1a1a] border-gray-700 text-white shadow-2xl shadow-black/70';
      case 'high-contrast':
        return 'bg-black border-white/40 text-white shadow-2xl shadow-white/10';
      case 'sepia':
        return 'bg-[#f4ecd8] border-[#d4c6a0] text-[#5b4636] shadow-xl';
      case 'mint':
        return 'bg-[#e8f5e9] border-[#c8e6c9] text-[#2d6a4f] shadow-xl';
      case 'light':
      default:
        return 'bg-white border-gray-200 text-gray-900 shadow-xl';
    }
  })();

  const dividerClass = isDark
    ? 'bg-white/15'
    : readingMode === 'sepia'
    ? 'bg-[#d4c6a0]'
    : readingMode === 'mint'
    ? 'bg-[#c8e6c9]'
    : 'bg-gray-200';

  const noteAreaClass = isDark
    ? 'border-white/10'
    : readingMode === 'sepia'
    ? 'border-[#d4c6a0]'
    : readingMode === 'mint'
    ? 'border-[#c8e6c9]'
    : 'border-gray-100';

  const textareaClass = (() => {
    switch (readingMode) {
      case 'midnight':
        return 'bg-[#1e293b] border-[#334155] text-white placeholder-slate-400';
      case 'nord':
        return 'bg-[#3b4252] border-[#4c566a] text-white placeholder-slate-300';
      case 'dim':
        return 'bg-[#383838] border-[#4c4c4c] text-white placeholder-gray-400';
      case 'dark':
        return 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-400';
      case 'high-contrast':
        return 'bg-black border-white text-white placeholder-gray-400';
      case 'sepia':
        return 'bg-[#e9dec0] border-[#d4c6a0] text-[#5b4636] placeholder-[#8c765f]';
      case 'mint':
        return 'bg-[#d8edd9] border-[#b7dfb9] text-[#2d6a4f] placeholder-[#52796f]';
      case 'light':
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400';
    }
  })();

  const handleOpenDictionary = () => {
    let preloadedData = null;
    if (noteText.startsWith('<!-- AI_DICT -->')) {
      try {
        preloadedData = JSON.parse(noteText.replace('<!-- AI_DICT -->', ''));
      } catch {}
    }
    setDictionaryTarget({ word: selection!.text, context: getPageContext(), selection: { ...selection! }, preloadedData });
    setSelection(null);
    setNoteMode(null);
  };

  const handleOpenDictionaryFull = () => {
    let preloadedData = null;
    try {
      preloadedData = JSON.parse(noteText.replace('<!-- AI_DICT -->', ''));
    } catch {}
    setDictionaryTarget({ word: selection!.text, context: getPageContext(), selection: { ...selection! }, preloadedData });
    setSelection(null);
    setNoteMode(null);
  };

  const menuContent = (
    <>
      {/* Texto Selecionado (Preview) */}
      {selection!.text && (
        <div className={`mb-3 border-l-2 pl-2 pr-1 py-0.5 text-xs italic opacity-85 truncate ${isDark ? 'border-brand-400 text-slate-200' : 'border-brand-500 text-slate-700'}`}>
          "{selection!.text}"
        </div>
      )}

      {/* Barra de cores + ações rápidas */}
      <EpubHighlightColorBar
        noteMode={noteMode}
        selection={selection!}
        dividerClass={dividerClass}
        confirmDelete={confirmDelete}
        onSelectColor={(color) => handleCreateHighlight(color)}
        onCopyText={() => {
          navigator.clipboard.writeText(selection!.text);
          setSelection(null);
        }}
        onOpenDictionary={handleOpenDictionary}
        onOpenNote={() => setNoteMode('yellow')}
        onConfirmDelete={() => {
          handleDeleteHighlight(selection!.existingHighlightId!, selection!.cfiRange);
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
      {!noteMode && !selection!.existingHighlightId && (
        <div className={`flex items-center gap-1 border-t pt-1.5 mt-0.5 ${noteAreaClass}`}>
          <button
            onClick={() => {
              dispatch({ type: 'TOGGLE_AI_SIDEBAR' });
              setSelection(null);
            }}
            className={`flex-1 px-2 py-1.5 bg-brand-500/15 rounded-lg text-[11px] font-bold hover:bg-brand-500 hover:text-white transition-colors flex items-center justify-center gap-1 ${
              isDark ? 'text-brand-300' : 'text-brand-600'
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
    const selectionIsLow = selection!.rect && selection!.rect.top > window.innerHeight * 0.5;

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
            text={(dictionaryTarget as any).word}
            pageContext={(dictionaryTarget as any).context}
            preloadedData={(dictionaryTarget as any).preloadedData}
            onSaveHighlight={(color, note) => handleCreateHighlight(color, note, (dictionaryTarget as any).selection)}
            onClose={() => {
              if ((dictionaryTarget as any).selection) setSelection((dictionaryTarget as any).selection);
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
          text={(dictionaryTarget as any).word}
          pageContext={(dictionaryTarget as any).context}
          preloadedData={(dictionaryTarget as any).preloadedData}
          onSaveHighlight={(color, note) => handleCreateHighlight(color, note, (dictionaryTarget as any).selection)}
          onClose={() => setDictionaryTarget(null)}
        />
      )}
    </>
  );
}
