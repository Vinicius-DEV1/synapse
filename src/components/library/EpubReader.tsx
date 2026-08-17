import React, { useState, useEffect, useRef } from 'react';

import { ArrowLeft } from 'lucide-react';
import type { LibraryBook } from '../../types';
import { useStore } from '../../store/useStore';

import { EpubProvider, useEpub } from './epub/EpubContext';
import EpubTopBar from './epub/EpubTopBar';
import EpubSidebars from './epub/EpubSidebars';
import EpubTypography from './epub/EpubTypography';
import EpubHighlightMenu from './epub/EpubHighlightMenu';
import { useEpubLoader } from './epub/useEpubLoader';
import { useEpubTheme } from './epub/useEpubTheme';
import { useTimeTracker } from '../../hooks/useTimeTracker';

interface EpubReaderProps {
  book: LibraryBook;
  onBack: () => void;
  onUpdateBook: (updates: Partial<LibraryBook>) => void;
}

function EpubCore({ onBack, onUpdateBook, book }: Omit<EpubReaderProps, 'book'> & { book: LibraryBook }) {
  const {
    rendition, readingMode, setReadingMode, fontSize, setFontSize,
    locationsReady, setProgress, setCurrentPage, selection,
    textWidth, epubBook, fontFamily
  } = useEpub();

  const { state, dispatch } = useStore();

  useTimeTracker({
    itemId: book.id,
    itemTitle: book.title,
    module: 'library',
    isActive: true,
    requireInteraction: true
  });

  useEffect(() => {
    const prefs = { fontSize, readingMode, fontFamily, textWidth };
    const str = JSON.stringify(prefs);
    if (str !== (book as any).reading_preferences) {
      const timeout = setTimeout(() => {
        onUpdateBook({ reading_preferences: str } as any);
        (book as any).reading_preferences = str;
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [fontSize, readingMode, fontFamily, textWidth, book, onUpdateBook]);
  const [loading, setLoading] = useState(true);
  const [epubError, setEpubError] = useState<string | null>(null);
  const [modeToast, setModeToast] = useState<string | null>(null);
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const globalLastHighlightClickRef = useRef<number>(0);
  const clearSelectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showMobileTools, setShowMobileTools] = useState(false);
  const toolsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isFullScreenRef = useRef(state.isReadingModeFullScreen);
  useEffect(() => {
    isFullScreenRef.current = state.isReadingModeFullScreen;
  }, [state.isReadingModeFullScreen]);

  const turnPage = (direction: 'next' | 'prev', r: any = rendition!) => {
    if (!r) return;
    if (viewerRef.current) {
      viewerRef.current.style.transition = 'opacity 0.05s ease-out';
      viewerRef.current.style.opacity = '0.3';
    }
    setTimeout(() => {
      if (direction === 'next') r.next();
      else r.prev();
      if (viewerRef.current) {
        viewerRef.current.style.transition = 'opacity 0.15s ease-in';
        viewerRef.current.style.opacity = '1';
      }
    }, 50);
  };

  const handleEpubClick = () => {
    setShowMobileTools(prev => {
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
    viewerRef as React.RefObject<HTMLDivElement>,
    onUpdateBook,
    setLoading,
    setEpubError,
    turnPage,
    handleEpubClick,
    globalLastHighlightClickRef
  );

  useEpubTheme(globalLastHighlightClickRef, clearSelectionTimerRef);

  useEffect(() => {
    if (!selection && rendition) {
      try {
        ((rendition.getContents() as unknown) as any[]).forEach((content: any) => {
          content.window?.getSelection()?.removeAllRanges();
        });
      } catch (e) {}
    }
  }, [selection, rendition]);

  useEffect(() => {
    if (!rendition) return;

    const onRelocated = (location: any) => {
      const updates: Partial<LibraryBook> = { last_read_page: location.start.cfi as any };
      if (locationsReady && epubBook) {
        const percentage = epubBook.locations.percentageFromCfi(location.start.cfi);
        setProgress(percentage);
        const current = epubBook.locations.locationFromCfi(location.start.cfi);
        setCurrentPage(current as unknown as number);
        (updates as any).current_page = current;
      }
      onUpdateBook(updates);
    };

    rendition.on('relocated', onRelocated);
    return () => { rendition.off('relocated', onRelocated); };
  }, [rendition, locationsReady, epubBook, setProgress, setCurrentPage, onUpdateBook]);

  const modeNames: any = {
    'light': 'Tema: Claro',
    'sepia': 'Tema: Sépia',
    'mint': 'Tema: Menta',
    'dim': 'Tema: Cinza (Dim)',
    'nord': 'Tema: Nord',
    'midnight': 'Tema: Meia-noite',
    'dark': 'Tema: Escuro',
    'high-contrast': 'Tema: Alto Contraste'
  };

  const cycleReadingMode = () => {
    setReadingMode((prev: string) => {
      const modes = ['light', 'sepia', 'mint', 'dim', 'nord', 'midnight', 'dark', 'high-contrast'];
      const nextIndex = (modes.indexOf(prev) + 1) % modes.length;
      const nextMode = modes[nextIndex];
      setTimeout(() => setModeToast(modeNames[nextMode]), 0);
      return nextMode as any;
    });
  };

  const changeZoom = (delta: number) => {
    setFontSize((prev: number) => {
      const next = Math.max(50, Math.min(300, prev + delta));
      setTimeout(() => setModeToast(`Zoom: ${next}%`), 0);
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: !isFullScreenRef.current });
        if ((window.api?.app as any)?.toggleFullScreen) {
          (window.api.app as any).toggleFullScreen();
        }
        return;
      }
      if (e.key.toLowerCase() === 'f' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: !isFullScreenRef.current });
        return;
      }

      if (e.key === 'ArrowRight') turnPage('next');
      if (e.key === 'ArrowLeft') turnPage('prev');
      
      const isInput = document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT';
      if (isInput) return;

      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        cycleReadingMode();
      }
      if (e.key === '+' || e.key === '=') {
        changeZoom(10);
      }
      if (e.key === '-') {
        changeZoom(-10);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    if (rendition) {
      rendition.on('keydown', handleKeyDown);
      rendition.on('keyup', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (rendition) {
        rendition.off('keydown', handleKeyDown);
        rendition.off('keyup', handleKeyDown);
      }
    };
  }, [rendition, setReadingMode, setFontSize, dispatch, state.isReadingModeFullScreen]);

  useEffect(() => {
    if (!rendition) return;
    const timer = setTimeout(() => {
      rendition.resize('100%' as any, '100%' as any);
    }, 350);
    return () => clearTimeout(timer);
  }, [textWidth, state.isReadingModeFullScreen, showMobileTools, rendition]);

  const { progress, currentPage, totalPages } = useEpub();
  const progressPercentage = Math.round((progress || 0) * 100);
  const currentPageSafe = currentPage || 0;
  const totalPagesSafe = totalPages || 0;
  const isDark = ['dark', 'dim', 'nord', 'midnight', 'high-contrast'].includes(readingMode);
  
  const bottomBarClasses = readingMode === 'dark' ? 'bg-[#1a1a1a] text-gray-500' : 
    readingMode === 'midnight' ? 'bg-[#0f172a] text-[#475569]' : 
    readingMode === 'nord' ? 'bg-[#2e3440] text-[#4c566a]' : 
    readingMode === 'dim' ? 'bg-[#2d2d30] text-[#808080]' : 
    readingMode === 'high-contrast' ? 'bg-[#000000] text-[#aaaaaa]' : 
    readingMode === 'sepia' ? 'bg-[#e9dec0] text-[#8c765f]' : 
    readingMode === 'mint' ? 'bg-[#c8e6c9] text-[#2d6a4f]' : 
    'bg-white text-gray-400';

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = Number(e.target.value);
    if (!epubBook || !rendition || !locationsReady) return;
    const cfi = epubBook.locations.cfiFromLocation(page);
    if (cfi) rendition.display(cfi);
  };

  return (
    <div className={`h-full flex flex-col relative overflow-hidden reading-mode-${readingMode} ${readingMode === 'dark' ? 'bg-[#1a1a2e]' : readingMode === 'sepia' ? 'bg-[#f4ecd8]' : readingMode === 'mint' ? 'bg-[#e8f5e9]' : readingMode === 'dim' ? 'bg-[#2d2d30]' : readingMode === 'nord' ? 'bg-[#2e3440]' : readingMode === 'midnight' ? 'bg-[#0f172a]' : readingMode === 'high-contrast' ? 'bg-black' : 'bg-white'}`}>
      <div className={`
        transition-all duration-300 z-30
        ${showMobileTools ? 'translate-y-0' : '-translate-y-full md:translate-y-0'}
        ${state.isReadingModeFullScreen ? 'hidden' : ''}
        absolute md:relative top-0 left-0 right-0
      `}>
        <EpubTopBar onBack={onBack} />
      </div>
      <EpubTypography />
      <EpubSidebars />

      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/5 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
          </div>
        )}
        
        {epubError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-red-500 p-8 text-center bg-dark-bg">
            <div className="bg-red-500/10 p-4 rounded-full mb-4">
              <ArrowLeft size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">Erro ao carregar EPUB</h3>
            <p className="opacity-80 max-w-md">{epubError}</p>
            <button onClick={onBack} className="mt-6 px-6 py-2 bg-dark-card hover:bg-dark-border rounded-lg text-dark-text transition-colors">
              Voltar à Biblioteca
            </button>
          </div>
        )}

        <EpubHighlightMenu />

        <div className={`relative w-full h-full flex-1 bg-transparent overflow-hidden ${showMobileTools ? 'z-0' : 'z-10'}`}>
        <button onClick={() => turnPage('prev')} className="hidden sm:block absolute left-0 top-0 bottom-0 w-16 z-10 cursor-pointer group">
          <div className={`absolute left-0 top-0 bottom-0 w-16 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center ${isDark ? 'bg-gradient-to-r from-black/50 to-transparent text-white' : 'bg-gradient-to-r from-black/10 to-transparent text-black'}`}>
            <ArrowLeft size={24} />
          </div>
        </button>
        
        <div ref={viewerRef} 
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

      <div className={`
          group relative flex-shrink-0 h-8 flex items-center justify-between px-6 text-[11px] font-medium tracking-wider uppercase transition-all duration-300 z-[60]
          fixed md:relative bottom-0 left-0 right-0
          ${showMobileTools ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
          ${bottomBarClasses}
        `}>
        <div>
           {locationsReady ? `Página ${currentPageSafe} de ${totalPagesSafe}` : 'Calculando páginas...'}
        </div>

        {locationsReady && totalPagesSafe > 1 && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-[80%] max-w-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-300 pb-2">
            <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 shadow-2xl border border-white/10 flex flex-col items-center gap-2">
              <span className="text-white font-bold text-xs">Página {currentPageSafe}</span>
              <input 
                type="range" 
                min="1" 
                max={totalPagesSafe} 
                value={currentPageSafe} 
                onChange={handleScrub}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>
          </div>
        )}

        <div>
           {locationsReady ? `${progressPercentage}%` : '...'}
        </div>
      </div>

      {modeToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-black/80 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium pointer-events-none transition-all duration-300">
          {modeToast}
        </div>
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



