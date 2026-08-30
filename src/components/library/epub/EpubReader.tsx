import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import { ArrowLeft, CloudDownload } from 'lucide-react';
import type { LibraryBook, ReadingMode } from '../../../types';
import { useStore } from '../../../store/useStore';

import { EpubProvider, useEpub } from './EpubContext';
import EpubTopBar from './EpubTopBar';
import EpubSidebars from './EpubSidebars';
import EpubTypography from './EpubTypography';
import EpubHighlightMenu from './EpubHighlightMenu';
import { EpubErrorState } from './EpubErrorState';
import BookInfoModal from '../modals/BookInfoModal';
import { triggerToast } from '../../ui/ToastContext';
import { useEpubShortcuts } from './hooks/useEpubShortcuts';
import { useEpubLoader } from './useEpubLoader';
import { useEpubTheme } from './useEpubTheme';
import { useTimeTracker } from '../../../hooks/useTimeTracker';
import EpubBottomBar from './components/EpubBottomBar';

interface EpubReaderProps {
  book: LibraryBook;
  onBack: () => void;
  onUpdateBook: (updates: Partial<LibraryBook>) => void;
}

function EpubCore({ onBack, onUpdateBook, book }: Omit<EpubReaderProps, 'book'> & { book: LibraryBook }) {
  const {
    rendition,
    readingMode,
    setReadingMode,
    fontSize,
    setFontSize,
    locationsReady,
    setProgress,
    setCurrentPage,
    selection,
    textWidth,
    epubBook,
    fontFamily,
  } = useEpub();

  const { state, dispatch } = useStore();

  useTimeTracker({
    itemId: book.id,
    itemTitle: book.title,
    module: 'library',
    isActive: true,
    requireInteraction: true,
  });

  useEffect(() => {
    const prefs = { fontSize, readingMode, fontFamily, textWidth };
    const str = JSON.stringify(prefs);
    if (str !== book.reading_preferences) {
      const timeout = setTimeout(() => {
        onUpdateBook({ reading_preferences: str });
        book.reading_preferences = str;
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [fontSize, readingMode, fontFamily, textWidth, book, onUpdateBook]);

  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState<{percent: number, stage: string} | null>(null);
  const [epubError, setEpubError] = useState<string | null>(null);
  const [modeToast, setModeToast] = useState<string | null>(null);
  const [isReattaching, setIsReattaching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reattachError, setReattachError] = useState<string | null>(null);

  const viewerRef = useRef<HTMLDivElement>(null);
  const globalLastHighlightClickRef = useRef<number>(0);
  const clearSelectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showMobileTools, setShowMobileTools] = useState(false);
  const [showBookInfo, setShowBookInfo] = useState(false);
  const toolsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleReattach = async () => {
    try {
      setIsReattaching(true);
      setReattachError(null);
      if (window.api?.library?.reattachBookFile) {
        const newPath = await window.api.library.reattachBookFile(book.id);
        if (newPath) {
          onUpdateBook({ file_path: newPath });
          setEpubError(null);
          setLoading(true);
          triggerToast('Arquivo EPUB reanexado com sucesso!', 'success');
        }
      }
    } catch (err: unknown) {
      console.error('Erro ao reanexar EPUB:', err);
      const msg = err instanceof Error ? err.message : 'Falha ao vincular novo arquivo';
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
    } catch (err: unknown) {
      console.error('Erro ao excluir livro:', err);
      triggerToast(err instanceof Error ? err.message : 'Erro ao excluir livro.', 'error');
      setIsDeleting(false);
    }
  };

  const isFullScreenRef = useRef(state.isReadingModeFullScreen);
  useEffect(() => {
    isFullScreenRef.current = state.isReadingModeFullScreen;
  }, [state.isReadingModeFullScreen]);

  const lastPageTurnTimeRef = useRef<number>(0);

  const turnPage = (direction: 'next' | 'prev', r: unknown = rendition!) => {
    const renditionObj = r as { next: () => void, prev: () => void };
    if (!renditionObj) return;
    const now = Date.now();
    if (now - lastPageTurnTimeRef.current < 200) {
      return;
    }
    lastPageTurnTimeRef.current = now;

    if (viewerRef.current) {
      viewerRef.current.style.transition = 'opacity 0.05s ease-out';
      viewerRef.current.style.opacity = '0.3';
    }
    setTimeout(() => {
      if (direction === 'next') renditionObj.next();
      else renditionObj.prev();
      if (viewerRef.current) {
        viewerRef.current.style.transition = 'opacity 0.15s ease-in';
        viewerRef.current.style.opacity = '1';
      }
    }, 50);
  };

  const handleEpubClick = () => {
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
    return () => {
      dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: false });
    };
  }, [dispatch]);

  useEffect(() => {
    if (modeToast) {
      const timer = setTimeout(() => setModeToast(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [modeToast]);

  useEpubLoader(
    book,
    viewerRef as RefObject<HTMLDivElement>,
    onUpdateBook,
    setLoading,
    setLoadProgress,
    setEpubError,
    turnPage,
    handleEpubClick,
    globalLastHighlightClickRef
  );

  useEpubTheme(globalLastHighlightClickRef, clearSelectionTimerRef);

  useEffect(() => {
    if (!selection && rendition) {
      try {
        ((rendition.getContents() as unknown) as Array<{ window?: { getSelection: () => { removeAllRanges: () => void } } }>).forEach((content) => {
          content.window?.getSelection()?.removeAllRanges();
        });
      } catch (e) {}
    }
  }, [selection, rendition]);

  useEffect(() => {
    if (!rendition) return;

    const onRelocated = (location: { start: { cfi: string } }) => {
      const updates: Partial<LibraryBook> = { last_read_page: location.start.cfi };
      if (locationsReady && epubBook) {
        const percentage = epubBook.locations.percentageFromCfi(location.start.cfi);
        setProgress(percentage);
        const current = epubBook.locations.locationFromCfi(location.start.cfi);
        setCurrentPage(current as unknown as number);
        updates.current_page = current as unknown as number;
      }
      onUpdateBook(updates);
    };

    rendition.on('relocated', onRelocated);
    return () => {
      rendition.off('relocated', onRelocated);
    };
  }, [rendition, locationsReady, epubBook, setProgress, setCurrentPage, onUpdateBook]);

  const modeNames: Record<string, string> = {
    light: 'Tema: Claro',
    sepia: 'Tema: Sépia',
    mint: 'Tema: Menta',
    dim: 'Tema: Cinza (Dim)',
    nord: 'Tema: Nord',
    midnight: 'Tema: Meia-noite',
    dark: 'Tema: Escuro',
    'high-contrast': 'Tema: Alto Contraste',
  };

  const cycleReadingMode = () => {
    setReadingMode((prev: ReadingMode) => {
      const modes: ReadingMode[] = ['light', 'sepia', 'mint', 'dim', 'nord', 'midnight', 'dark', 'high-contrast'];
      const nextIndex = (modes.indexOf(prev) + 1) % modes.length;
      const nextMode = modes[nextIndex];
      setTimeout(() => setModeToast(modeNames[nextMode]), 0);
      return nextMode;
    });
  };

  const changeZoom = (delta: number) => {
    setFontSize((prev: number) => {
      const next = Math.max(50, Math.min(300, prev + delta));
      setTimeout(() => setModeToast(`Zoom: ${next}%`), 0);
      return next;
    });
  };

  const handleScrub = (e: ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value, 10);
    if (!isNaN(page) && epubBook && locationsReady) {
      const cfi = epubBook.locations.cfiFromLocation(page);
      if (cfi && rendition) {
        rendition.display(cfi);
      }
    }
  };

  useEpubShortcuts({
    rendition,
    dispatch,
    isFullScreenRef,
    turnPage,
    cycleReadingMode,
    changeZoom,
  });

  useEffect(() => {
    if (!rendition) return;
    const timer = setTimeout(() => {
      (rendition as unknown as { resize: (w: string, h: string) => void }).resize('100%', '100%');
    }, 350);
    return () => clearTimeout(timer);
  }, [textWidth, state.isReadingModeFullScreen, showMobileTools, rendition]);

  const { progress, currentPage, totalPages } = useEpub();
  const progressPercentage = Math.round((progress || 0) * 100);
  const currentPageSafe = currentPage || 0;
  const totalPagesSafe = totalPages || 0;
  const isDark = ['dark', 'dim', 'nord', 'midnight', 'high-contrast'].includes(readingMode);

  return (
    <div
      className={`h-full flex flex-col relative overflow-hidden reading-mode-${readingMode} ${
        readingMode === 'dark'
          ? 'bg-[#1a1a2e]'
          : readingMode === 'sepia'
          ? 'bg-[#f4ecd8]'
          : readingMode === 'mint'
          ? 'bg-[#e8f5e9]'
          : readingMode === 'dim'
          ? 'bg-[#2d2d30]'
          : readingMode === 'nord'
          ? 'bg-[#2e3440]'
          : readingMode === 'midnight'
          ? 'bg-[#0f172a]'
          : readingMode === 'high-contrast'
          ? 'bg-black'
          : 'bg-white'
      }`}
    >
      <div
        className={`
        transition-all duration-300 z-30
        ${showMobileTools ? 'translate-y-0' : '-translate-y-full md:translate-y-0'}
        ${state.isReadingModeFullScreen ? 'hidden' : ''}
        absolute md:relative top-0 left-0 right-0
      `}
      >
        <EpubTopBar onBack={onBack} onShowInfo={() => setShowBookInfo(true)} />
      </div>
      <EpubTypography />
      <EpubSidebars />

      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {loading && (
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
                  : 'Preparando leitura...'}
              </p>

              <div className="w-full bg-white/5 rounded-full h-2 mb-2 overflow-hidden border border-white/5">
                <div
                  className="bg-gradient-to-r from-brand-500 to-indigo-500 h-full rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${loadProgress ? Math.max(5, Math.min(100, loadProgress.percent)) : 15}%` }}
                />
              </div>

              <div className="w-full flex justify-between items-center text-[11px] text-dark-subtext mb-5">
                <span>
                  {loadProgress?.stage === 'downloading' ? 'Download' : loadProgress?.stage === 'decrypting' ? 'Segurança' : 'Carregando'}
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
        )}

        {epubError && (
          <EpubErrorState
            book={book}
            reattachError={reattachError}
            isReattaching={isReattaching}
            isDeleting={isDeleting}
            confirmDelete={confirmDelete}
            onReattach={handleReattach}
            onReload={() => {
              setEpubError(null);
              setLoading(true);
            }}
            onBack={onBack}
            onDeleteBook={handleDeleteBook}
            setConfirmDelete={setConfirmDelete}
            epubError={epubError}
          />
        )}

        <EpubHighlightMenu />

        <div className={`relative w-full h-full flex-1 bg-transparent overflow-hidden ${showMobileTools ? 'z-0' : 'z-10'}`}>
          <button onClick={() => turnPage('prev')} className="hidden sm:block absolute left-0 top-0 bottom-0 w-16 z-10 cursor-pointer group">
            <div className={`absolute left-0 top-0 bottom-0 w-16 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center ${isDark ? 'bg-gradient-to-r from-black/50 to-transparent text-white' : 'bg-gradient-to-r from-black/10 to-transparent text-black'}`}>
              <ArrowLeft size={24} />
            </div>
          </button>

          <div
            ref={viewerRef}
            className="w-full h-full mx-auto px-2 sm:px-10 transition-all duration-300"
            style={{ maxWidth: textWidth === 'narrow' ? '700px' : textWidth === 'medium' ? '1000px' : '1400px' }}
          />

          <button onClick={() => turnPage('next')} className="hidden sm:block absolute right-0 top-0 bottom-0 w-16 z-10 cursor-pointer group">
            <div className={`absolute right-0 top-0 bottom-0 w-16 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center ${isDark ? 'bg-gradient-to-l from-black/50 to-transparent text-white' : 'bg-gradient-to-l from-black/10 to-transparent text-black'}`}>
              <ArrowLeft size={24} className="rotate-180" />
            </div>
          </button>
        </div>
      </div>

      <EpubBottomBar
        readingMode={readingMode}
        showMobileTools={showMobileTools}
        locationsReady={locationsReady}
        currentPageSafe={currentPageSafe}
        totalPagesSafe={totalPagesSafe}
        progressPercentage={progressPercentage}
        onScrub={handleScrub}
      />

      {modeToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-black/80 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium pointer-events-none transition-all duration-300">
          {modeToast}
        </div>
      )}

      {showBookInfo && (
        <BookInfoModal book={book} onClose={() => setShowBookInfo(false)} />
      )}
    </div>
  );
}

export default function EpubReader({ book, onBack, onUpdateBook }: EpubReaderProps) {
  return (
    <EpubProvider book={book}>
      <EpubCore book={book} onBack={onBack} onUpdateBook={onUpdateBook} />
    </EpubProvider>
  );
}
