import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import type { LibraryBook } from '../../types';

import HighlightToolbar from './HighlightToolbar';
import AnnotationPanel from './AnnotationPanel';
import PdfSearchBar from './PdfSearchBar';
import DictionaryModal from './DictionaryModal';
import { getSettings, saveSettings } from '../../utils/settings';
import { useStore } from '../../store/useStore';
import { PdfPage } from './pdf/PdfPage';
import { PdfToolbar } from './pdf/PdfToolbar';
import { PdfErrorState } from './pdf/PdfErrorState';
import BookInfoModal from './BookInfoModal';
import { triggerToast } from '../ui/ToastContext';
import { usePdfKeyboardShortcuts } from './pdf/hooks/usePdfKeyboardShortcuts';

import { usePdfDocument } from './pdf/hooks/usePdfDocument';
import { usePdfRenderer } from './pdf/hooks/usePdfRenderer';
import { usePdfHighlights } from './pdf/hooks/usePdfHighlights';
import { useTimeTracker } from '../../hooks/useTimeTracker';
import {
  MODE_NAMES,
  THEME_CLASSES,
  getPdfCssFilter,
  type ReadingMode,
} from './pdf/utils/pdfThemes';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfReaderProps {
  book: LibraryBook;
  onBack: () => void;
  onUpdateBook: (updates: Partial<LibraryBook>) => void;
}

export default function PdfReader({ book, onBack, onUpdateBook }: PdfReaderProps) {
  const { dispatch } = useStore();
  const settings = getSettings();

  useTimeTracker({
    itemId: book.id,
    itemTitle: book.title,
    module: 'library',
    isActive: true,
    requireInteraction: true,
  });

  const [readingMode, setReadingMode] = useState<ReadingMode>(
    (() => {
      try {
        return JSON.parse(book.reading_preferences || '{}')?.theme;
      } catch {
        return undefined;
      }
    })() ||
      (settings.defaultReadingMode as ReadingMode) ||
      'light'
  );

  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileTools, setShowMobileTools] = useState(false);
  const [isReattaching, setIsReattaching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reattachError, setReattachError] = useState<string | null>(null);
  const [showBookInfo, setShowBookInfo] = useState(false);

  const toolsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const [dictionaryTarget, setDictionaryTarget] = useState<{
    word: string;
    context?: string;
    preloadedData?: any;
    selection?: any;
  } | null>(null);
  const [modeToast, setModeToast] = useState<string | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState<Set<number>>(new Set());

  // Hook 1: Document Loading & Sync
  const {
    pdfDoc,
    totalPages,
    pdfError,
    loading,
    tocItems,
    highlights,
    setHighlights,
    bookmarks,
    setBookmarks,
    toggleBookmark,
    reload,
  } = usePdfDocument(book, onUpdateBook, book.last_read_page || 1);

  const handleReattach = async () => {
    try {
      setIsReattaching(true);
      setReattachError(null);
      if (window.api?.library?.reattachBookFile) {
        const newPath = await window.api.library.reattachBookFile(book.id);
        if (newPath) {
          onUpdateBook({ file_path: newPath });
          reload();
          triggerToast('Arquivo PDF reanexado com sucesso!', 'success');
        }
      }
    } catch (err: any) {
      console.error('Erro ao reanexar PDF:', err);
      const msg = err.message || 'Falha ao vincular novo arquivo';
      setReattachError(msg);
      triggerToast(msg, 'error');
    } finally {
      setIsReattaching(false);
    }
  };

  const handleDeleteBook = async () => {
    try {
      setIsDeleting(true);
      await window.api?.library?.deleteBook(book.id);
      triggerToast('Livro excluído da biblioteca.', 'info');
      onBack();
    } catch (err: any) {
      console.error('Erro ao excluir livro:', err);
      triggerToast(err?.message || 'Erro ao excluir livro.', 'error');
      setIsDeleting(false);
    }
  };

  // Hook 2: Virtualization & Zoom
  const {
    scrollRef,
    zoom,
    handleZoom,
    currentPage,
    scrollToPage,
    virtualWindow,
    renderedPages,
    measuredHeights,
    getPageHeight,
    PAGE_GAP,
  } = usePdfRenderer({ totalPages, loading, book, onUpdateBook, pdfDoc });

  // Hook 3: Highlights & Selection
  const {
    activeHighlight,
    setActiveHighlight,
    selection,
    setSelection,
    handleSaveHighlight,
    handleDeleteHighlight,
  } = usePdfHighlights({ book, highlights, setHighlights });

  const handlePdfClick = () => {
    setShowMobileTools((prev) => {
      const nextState = !prev;
      if (toolsTimeoutRef.current) clearTimeout(toolsTimeoutRef.current);
      if (nextState) {
        toolsTimeoutRef.current = setTimeout(() => setShowMobileTools(false), 15000);
      }
      return nextState;
    });
  };

  useEffect(() => {
    dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: !showMobileTools });
    return () => dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: false });
  }, [showMobileTools, dispatch]);

  const cycleReadingMode = () => {
    setReadingMode((prev) => {
      const modes: ReadingMode[] = [
        'light',
        'sepia',
        'mint',
        'dim',
        'nord',
        'midnight',
        'dark',
        'high-contrast',
      ];
      const currentIndex = modes.indexOf(prev);
      const next = modes[(currentIndex + 1) % modes.length];
      saveSettings({ ...getSettings(), defaultReadingMode: next });
      setModeToast(MODE_NAMES[next]);
      return next;
    });
  };

  usePdfKeyboardShortcuts({
    showSearch,
    showAnnotations,
    currentPage,
    setShowSearch,
    setShowAnnotations,
    onBack,
    toggleBookmark,
    cycleReadingMode,
    handleZoom,
  });

  useEffect(() => {
    if (modeToast) {
      const timer = setTimeout(() => setModeToast(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [modeToast]);

  if (pdfError) {
    return (
      <PdfErrorState
        book={book}
        reattachError={reattachError}
        isReattaching={isReattaching}
        isDeleting={isDeleting}
        confirmDelete={confirmDelete}
        onReattach={handleReattach}
        onReload={() => reload()}
        onBack={onBack}
        onDeleteBook={handleDeleteBook}
        setConfirmDelete={setConfirmDelete}
      />
    );
  }

  const isDarkMode = ['dim', 'nord', 'midnight', 'dark', 'high-contrast'].includes(readingMode);
  const cssFilter = getPdfCssFilter(readingMode);

  const spacerHeights = {
    top: 0,
    bottom: 0,
  };
  for (let i = 1; i < virtualWindow.start; i++) {
    spacerHeights.top += getPageHeight(i) + PAGE_GAP;
  }
  for (let i = virtualWindow.end + 1; i <= totalPages; i++) {
    spacerHeights.bottom += getPageHeight(i) + PAGE_GAP;
  }

  const pagesToRender: number[] = [];
  for (let i = virtualWindow.start; i <= virtualWindow.end; i++) {
    pagesToRender.push(i);
  }

  return (
    <div className={`flex h-full relative font-sans transition-colors duration-300 ${THEME_CLASSES[readingMode]}`}>
      {/* Sidebar de Anotações */}
      {showAnnotations && (
        <div className="w-80 flex-shrink-0 border-r border-black/10 dark:border-white/10 flex flex-col bg-white/5 backdrop-blur-md">
          <AnnotationPanel
            bookId={book.id}
            highlights={highlights}
            bookmarks={bookmarks}
            tocItems={tocItems}
            currentPage={currentPage}
            onNavigateToPage={(page: number) => scrollToPage(page, false)}
            onUpdateHighlight={() => {}}
            onDeleteHighlight={handleDeleteHighlight}
            onUpdateBookmark={() => {}}
            onDeleteBookmark={(id: string) => {
              window.api.library
                .deleteBookmark(id)
                .then(() => {
                  setBookmarks((prev) => prev.filter((b) => b.id !== id));
                })
                .catch(console.error);
            }}
            onClose={() => setShowAnnotations(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* PDF Viewport */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden relative"
          onClick={handlePdfClick}
          style={{ scrollBehavior: 'auto', backgroundColor: isDarkMode ? 'transparent' : 'rgba(0,0,0,0.03)' }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mb-4"></div>
              <p className="opacity-60">Processando documento...</p>
            </div>
          ) : (
            <div className="pdf-container pb-32 pt-8 flex flex-col items-center">
              {spacerHeights.top > 0 && <div style={{ height: spacerHeights.top, width: '100%' }} />}

              {pagesToRender.map((pageNum) => (
                <PdfPage
                  key={pageNum}
                  pageNum={pageNum}
                  pdfDoc={pdfDoc}
                  zoom={zoom}
                  isRendered={renderedPages.has(pageNum)}
                  cssFilter={cssFilter}
                  highlights={highlights.filter((h) => h.page_number === pageNum)}
                  activeHighlight={activeHighlight}
                  ocrProcessing={ocrProcessing}
                  setOcrProcessing={setOcrProcessing}
                  readingMode={readingMode}
                  bookId={book.id}
                  isBookmarked={bookmarks.some((b) => b.page_number === pageNum)}
                  onToggleBookmark={() => toggleBookmark(pageNum)}
                  pageRefs={pageRefs}
                  canvasRefs={canvasRefs}
                  onMeasure={(h) => {
                    measuredHeights.current.set(pageNum, h);
                  }}
                  onHighlightClick={(h, pos) => setActiveHighlight({ highlight: h, position: pos })}
                />
              ))}

              {spacerHeights.bottom > 0 && <div style={{ height: spacerHeights.bottom, width: '100%' }} />}
            </div>
          )}
        </div>

        {/* Floating Search Bar */}
        {showSearch && (
          <div className="absolute top-4 right-16 z-50 w-80 shadow-2xl rounded-2xl overflow-hidden pointer-events-auto animate-in slide-in-from-top-4">
            <PdfSearchBar
              pdfDoc={pdfDoc}
              bookId={book.id}
              totalPages={totalPages}
              currentPage={currentPage}
              onNavigateToPage={(page) => scrollToPage(page, false)}
              onHighlightResults={() => {}}
              onClose={() => setShowSearch(false)}
            />
          </div>
        )}

        {/* Floating Toolbars */}
        {!loading && (
          <PdfToolbar
            bookTitle={book.title}
            onBack={onBack}
            showMobileTools={showMobileTools}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => scrollToPage(p, false)}
            zoom={zoom}
            onZoom={handleZoom}
            showSearch={showSearch}
            onToggleSearch={() => setShowSearch(!showSearch)}
            isBookmarked={bookmarks.some((b) => b.page_number === currentPage)}
            onToggleBookmark={() => toggleBookmark(currentPage)}
            readingMode={readingMode}
            onCycleReadingMode={cycleReadingMode}
            showAnnotations={showAnnotations}
            onToggleAnnotations={() => setShowAnnotations(!showAnnotations)}
            onShowInfo={() => setShowBookInfo(true)}
          />
        )}

        {/* Toolbars Contextuais (Highlight) */}
        {selection && (
          <HighlightToolbar
            position={selection.position}
            onHighlight={handleSaveHighlight}
            onDictionary={() => {
              setDictionaryTarget({ word: selection.text, context: selection.pageContext });
            }}
            onDismiss={() => setSelection(null)}
          />
        )}

        {activeHighlight && (
          <div
            className="absolute z-[100] animate-in fade-in slide-in-from-bottom-2"
            style={{ top: activeHighlight.position.y + 10, left: activeHighlight.position.x - 75 }}
          >
            <div className="bg-dark-bg/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-2 flex gap-2">
              <button
                onClick={() => handleDeleteHighlight(activeHighlight.highlight.id)}
                className="px-3 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 text-sm font-medium transition-colors"
              >
                Remover
              </button>
            </div>
          </div>
        )}

        {/* Dicionário Modal */}
        {dictionaryTarget && (
          <DictionaryModal
            text={dictionaryTarget.word}
            pageContext={dictionaryTarget.context}
            onClose={() => setDictionaryTarget(null)}
          />
        )}

        {/* Toast de Modo de Leitura */}
        {modeToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-4 z-50">
            {modeToast}
          </div>
        )}

        {/* Book Info Modal */}
        {showBookInfo && (
          <BookInfoModal book={book} onClose={() => setShowBookInfo(false)} />
        )}
      </div>
    </div>
  );
}
