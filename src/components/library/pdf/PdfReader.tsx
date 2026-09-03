import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { CloudDownload } from 'lucide-react';

import type { LibraryBook, LibraryHighlight } from '../../../types';
import type { ReadingMode, DictionaryTargetState } from './types';
import HighlightToolbar from './components/HighlightToolbar';
import AnnotationPanel from './components/AnnotationPanel';
import PdfSearchBar from './components/PdfSearchBar';
import DictionaryModal from '../modals/DictionaryModal';
import { getSettings, saveSettings } from '../../../utils/settings';
import { useStore } from '../../../store/useStore';
import { PdfPage } from './PdfPage';
import { PdfToolbar } from './PdfToolbar';
import { PdfErrorState } from './PdfErrorState';
import BookInfoModal from '../modals/BookInfoModal';
import { triggerToast } from '../../ui/ToastContext';
import { usePdfKeyboardShortcuts } from './hooks/usePdfKeyboardShortcuts';
import { usePdfDocument } from './hooks/usePdfDocument';
import { usePdfRenderer } from './hooks/usePdfRenderer';
import { usePdfHighlights } from './hooks/usePdfHighlights';
import { useTimeTracker } from '../../../hooks/useTimeTracker';
import { MODE_NAMES, THEME_CLASSES, getPdfCssFilter } from './utils/pdfThemes';

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

  const [readingMode, setReadingMode] = useState<ReadingMode>(() => {
    try {
      const savedTheme = JSON.parse(book.reading_preferences || '{}')?.theme as ReadingMode | undefined;
      if (savedTheme) return savedTheme;
    } catch {
      // Ignore JSON parse error and fallback
    }
    return (settings.defaultReadingMode as ReadingMode) || 'light';
  });

  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileTools, setShowMobileTools] = useState(false);
  const [isReattaching, setIsReattaching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reattachError, setReattachError] = useState<string | null>(null);
  const [showBookInfo, setShowBookInfo] = useState(false);

  const toolsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dictionaryTarget, setDictionaryTarget] = useState<DictionaryTargetState | null>(null);
  const [modeToast, setModeToast] = useState<string | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState<Set<number>>(new Set());

  const initialPage = useMemo(() => {
    return typeof book.last_read_page === 'number'
      ? book.last_read_page
      : parseInt(String(book.last_read_page || 1), 10) || 1;
  }, [book.id]);

  // Hook 1: Document Loading, Metadata & Synchronization
  const {
    pdfDoc,
    totalPages,
    pdfError,
    loading,
    loadProgress,
    tocItems,
    highlights,
    setHighlights,
    bookmarks,
    setBookmarks,
    toggleBookmark,
    reload,
  } = usePdfDocument(book, onUpdateBook, initialPage);

  // Hook 2: Virtualization, Stable Offsets & Centered Zoom
  const {
    scrollRef,
    zoom,
    handleZoom,
    currentPage,
    scrollToPage,
    virtualWindow,
    renderedPages,
    dimensionCache,
    PAGE_GAP,
  } = usePdfRenderer({ totalPages, loading, book, onUpdateBook, pdfDoc });

  // Hook 3: Highlights & Text Selection
  const {
    activeHighlight,
    setActiveHighlight,
    selection,
    setSelection,
    handleSaveHighlight,
    handleDeleteHighlight,
  } = usePdfHighlights({ book, highlights, setHighlights });

  const handleReattach = async () => {
    if (!window.api?.library?.reattachBookFile) return;
    try {
      setIsReattaching(true);
      setReattachError(null);
      const newPath = await window.api.library.reattachBookFile(book.id);
      if (newPath) {
        onUpdateBook({ file_path: newPath });
        reload();
        triggerToast('Arquivo PDF reanexado com sucesso!', 'success');
      }
    } catch (err: unknown) {
      console.error('Erro ao reanexar PDF:', err);
      const msg = err instanceof Error ? err.message : 'Falha ao vincular novo arquivo';
      setReattachError(msg);
      triggerToast(msg, 'error');
    } finally {
      setIsReattaching(false);
    }
  };

  const handleDeleteBook = async () => {
    if (!window.api?.library?.deleteBook) return;
    try {
      setIsDeleting(true);
      await window.api.library.deleteBook(book.id);
      triggerToast('Livro excluído da biblioteca.', 'info');
      onBack();
    } catch (err: unknown) {
      console.error('Erro ao excluir livro:', err);
      triggerToast(err instanceof Error ? err.message : 'Erro ao excluir livro.', 'error');
      setIsDeleting(false);
    }
  };

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

  const cycleReadingMode = useCallback(() => {
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
  }, []);

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
        onReload={reload}
        onBack={onBack}
        onDeleteBook={handleDeleteBook}
        setConfirmDelete={setConfirmDelete}
        pdfError={pdfError}
      />
    );
  }

  const isDarkMode = ['dim', 'nord', 'midnight', 'dark', 'high-contrast'].includes(readingMode);
  const cssFilter = getPdfCssFilter(readingMode);

  // Group highlights by page for O(1) rendering lookup
  const highlightsByPage = useMemo(() => {
    const map = new Map<number, LibraryHighlight[]>();
    for (const h of highlights) {
      const list = map.get(h.page_number) || [];
      list.push(h);
      map.set(h.page_number, list);
    }
    return map;
  }, [highlights]);

  // Set of bookmarked page numbers for O(1) checks
  const bookmarkedPages = useMemo(() => {
    return new Set(bookmarks.map((b) => b.page_number));
  }, [bookmarks]);

  // Memoized page measurement callback
  const handleMeasurePage = useCallback(
    (pageNum: number, unscaledW: number, unscaledH: number) => {
      dimensionCache.current.setPageDimension(pageNum, unscaledW, unscaledH);
    },
    [dimensionCache]
  );

  // Memoized highlight click callback
  const handleHighlightClick = useCallback(
    (h: LibraryHighlight, rect: DOMRect) => {
      setActiveHighlight({
        highlight: h,
        position: { x: rect.left + rect.width / 2, y: rect.bottom + window.scrollY },
      });
    },
    [setActiveHighlight]
  );

  // Calculate stable spacers without layout thrashing
  let topSpacerHeight = 0;
  for (let i = 1; i < virtualWindow.start; i++) {
    topSpacerHeight += dimensionCache.current.getPageHeight(i, zoom) + PAGE_GAP;
  }

  let bottomSpacerHeight = 0;
  for (let i = virtualWindow.end + 1; i <= totalPages; i++) {
    bottomSpacerHeight += dimensionCache.current.getPageHeight(i, zoom) + PAGE_GAP;
  }

  const pagesToRender: number[] = [];
  for (let i = virtualWindow.start; i <= virtualWindow.end; i++) {
    pagesToRender.push(i);
  }

  return (
    <div
      className={`flex h-full relative font-sans transition-colors duration-300 ${THEME_CLASSES[readingMode]}`}
    >
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
            onUpdateHighlight={async (id: string, updates: Partial<LibraryHighlight>) => {
              if (!window.api?.library) return;
              try {
                const existing = highlights.find((h) => h.id === id);
                if (existing) {
                  const merged = { ...existing, ...updates };
                  await window.api.library.updateHighlight({
                    id,
                    note: merged.note,
                    color: merged.color,
                  });
                  setHighlights((prev) => prev.map((h) => (h.id === id ? merged : h)));
                }
              } catch (err) {
                console.error('Falha ao atualizar destaque', err);
              }
            }}
            onDeleteHighlight={handleDeleteHighlight}
            onUpdateBookmark={async (id: string, label: string) => {
              if (!window.api?.library) return;
              try {
                await window.api.library.updateBookmark({ id, label });
                setBookmarks((prev) => prev.map((b) => (b.id === id ? { ...b, label } : b)));
              } catch (err) {
                console.error('Falha ao atualizar marcador', err);
              }
            }}
            onDeleteBookmark={(id: string) => {
              if (!window.api?.library) return;
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
          style={{
            scrollBehavior: 'auto',
            backgroundColor: isDarkMode ? 'transparent' : 'rgba(0,0,0,0.03)',
          }}
        >
          {loading ? (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center">
                <div className="p-3.5 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 mb-4 animate-pulse">
                  <CloudDownload size={28} />
                </div>
                <h3 className="text-base font-semibold text-white mb-1 line-clamp-1">
                  {book.title}
                </h3>
                <p className="text-xs text-dark-subtext mb-5">
                  {loadProgress?.stage === 'downloading'
                    ? 'Baixando arquivo do Google Drive...'
                    : loadProgress?.stage === 'decrypting'
                    ? 'Descriptografando com segurança...'
                    : 'Processando documento...'}
                </p>

                <div className="w-full bg-white/5 rounded-full h-2 mb-2 overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-brand-500 to-indigo-500 h-full rounded-full transition-all duration-300 shadow-sm"
                    style={{
                      width: `${loadProgress ? Math.max(5, Math.min(100, loadProgress.percent)) : 15}%`,
                    }}
                  />
                </div>

                <div className="w-full flex justify-between items-center text-[11px] text-dark-subtext mb-5">
                  <span>
                    {loadProgress?.stage === 'downloading'
                      ? 'Download'
                      : loadProgress?.stage === 'decrypting'
                      ? 'Segurança'
                      : 'Carregando'}
                  </span>
                  <span className="font-mono font-medium text-white">
                    {loadProgress ? `${Math.round(loadProgress.percent)}%` : '...'}
                  </span>
                </div>

                <button
                  onClick={onBack}
                  className="w-full py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-dark-subtext hover:text-white transition-colors"
                >
                  Cancelar e Voltar
                </button>
              </div>
            </div>
          ) : (
            <div className="pdf-container pb-32 pt-8 flex flex-col items-center">
              {topSpacerHeight > 0 && <div style={{ height: topSpacerHeight, width: '100%' }} />}

              {pagesToRender.map((pageNum) => (
                <PdfPage
                  key={pageNum}
                  pageNum={pageNum}
                  pdfDoc={pdfDoc}
                  zoom={zoom}
                  isRendered={renderedPages.has(pageNum)}
                  cssFilter={cssFilter}
                  highlights={highlightsByPage.get(pageNum) || []}
                  readingMode={readingMode}
                  bookId={book.id}
                  isBookmarked={bookmarkedPages.has(pageNum)}
                  onToggleBookmark={() => toggleBookmark(pageNum)}
                  ocrProcessing={ocrProcessing}
                  setOcrProcessing={setOcrProcessing}
                  onMeasure={(unscaledW, unscaledH) => handleMeasurePage(pageNum, unscaledW, unscaledH)}
                  onHighlightClick={handleHighlightClick}
                  pageWidth={dimensionCache.current.getPageWidth(pageNum, zoom)}
                  pageHeight={dimensionCache.current.getPageHeight(pageNum, zoom)}
                />
              ))}

              {bottomSpacerHeight > 0 && (
                <div style={{ height: bottomSpacerHeight, width: '100%' }} />
              )}
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

        {/* Floating Contextual Highlight Toolbar */}
        {selection && (
          <HighlightToolbar
            position={selection.position}
            selectedText={selection.text}
            onHighlight={handleSaveHighlight}
            onDictionary={(text, preloadedData) => {
              setDictionaryTarget({
                word: text,
                context: selection.pageContext,
                preloadedData,
              });
            }}
            onDismiss={() => setSelection(null)}
          />
        )}

        {activeHighlight && (
          <div
            className="absolute z-[100] animate-in fade-in slide-in-from-bottom-2"
            style={{
              top: activeHighlight.position.y + 10,
              left: activeHighlight.position.x - 75,
            }}
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
