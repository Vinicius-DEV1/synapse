import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { ArrowLeft, Search, Bookmark, BookmarkCheck, Sun, Moon, ZoomIn, ZoomOut, StickyNote } from 'lucide-react';
import type { LibraryBook, LibraryHighlight, LibraryBookmark } from '../../types';

import HighlightToolbar from './HighlightToolbar';
import AnnotationPanel from './AnnotationPanel';
import PdfSearchBar from './PdfSearchBar';
import DictionaryModal from './DictionaryModal';
import { getSettings, saveSettings } from '../../utils/settings';
import { useStore } from '../../store/useStore';
import { PdfPage } from './pdf/PdfPage';
import { PdfToolbar } from './pdf/PdfToolbar';

import { usePdfDocument } from './pdf/hooks/usePdfDocument';
import { usePdfRenderer } from './pdf/hooks/usePdfRenderer';
import { usePdfHighlights } from './pdf/hooks/usePdfHighlights';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfReaderProps {
  book: LibraryBook;
  onBack: () => void;
  onUpdateBook: (updates: Partial<LibraryBook>) => void;
}

export default function PdfReader({ book, onBack, onUpdateBook }: PdfReaderProps) {
  const { state, dispatch } = useStore();
  const settings = getSettings();
  
  const [readingMode, setReadingMode] = useState<'light' | 'sepia' | 'mint' | 'dim' | 'nord' | 'midnight' | 'dark' | 'high-contrast'>(
    (settings.defaultReadingMode as any) || 'light'
  );
  
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileTools, setShowMobileTools] = useState(false);
  const toolsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [dictionaryTarget, setDictionaryTarget] = useState<{ word: string, context?: string, preloadedData?: any, selection?: any } | null>(null);
  const [modeToast, setModeToast] = useState<string | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState<Set<number>>(new Set());

  // Hook 1: Document Loading & Sync
  const { 
    pdfDoc, totalPages, pdfError, loading, tocItems, 
    highlights, setHighlights, bookmarks, toggleBookmark 
  } = usePdfDocument(book, onUpdateBook, book.last_read_page || 1);

  // Hook 2: Virtualization & Zoom
  const { 
    scrollRef, zoom, handleZoom, currentPage, scrollToPage, 
    virtualWindow, renderedPages, measuredHeights, getPageHeight, PAGE_GAP 
  } = usePdfRenderer({ totalPages, loading, book, onUpdateBook, pdfDoc });

  // Hook 3: Highlights & Selection
  const { 
    activeHighlight, setActiveHighlight, selection, setSelection, 
    handleSaveHighlight, handleDeleteHighlight 
  } = usePdfHighlights({ book, highlights, setHighlights });

  const handlePdfClick = () => {
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
    dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: !showMobileTools });
    return () => dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: false });
  }, [showMobileTools, dispatch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      } else if (e.key === 'Escape') {
        if (showSearch) setShowSearch(false);
        else if (showAnnotations) setShowAnnotations(false);
        else onBack();
      } else if (e.key === 'b' && !e.ctrlKey && !e.metaKey && e.target === document.body) {
        toggleBookmark(currentPage);
      } else if (e.key === 's' && !e.ctrlKey && !e.metaKey && e.target === document.body) {
        setShowAnnotations(prev => !prev);
      } else if (e.key === 'm' && !e.ctrlKey && !e.metaKey && e.target === document.body) {
        cycleReadingMode();
      } else if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoom(z => Math.min(3, z + 0.25));
      } else if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        handleZoom(z => Math.max(0.5, z - 0.25));
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        handleZoom(1.0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, showAnnotations, currentPage, handleZoom, onBack, toggleBookmark]);

  useEffect(() => {
    if (modeToast) {
      const timer = setTimeout(() => setModeToast(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [modeToast]);

  const cycleReadingMode = () => {
    setReadingMode(prev => {
      const modes: Array<typeof readingMode> = ['light', 'sepia', 'mint', 'dim', 'nord', 'midnight', 'dark', 'high-contrast'];
      const currentIndex = modes.indexOf(prev);
      const next = modes[(currentIndex + 1) % modes.length];
      saveSettings({ ...getSettings(), defaultReadingMode: next });
      
      const modeNames: Record<string, string> = {
        'light': 'Modo Claro', 'sepia': 'Sépia', 'mint': 'Menta Pastel', 
        'dim': 'Suave (Dim)', 'nord': 'Nord', 'midnight': 'Azul Meia-Noite', 
        'dark': 'Modo Escuro', 'high-contrast': 'Alto Contraste'
      };
      setModeToast(modeNames[next]);
      return next;
    });
  };

  if (pdfError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-dark-bg text-dark-text p-6">
        <div className="text-red-400 mb-4 text-xl">⚠️ Erro ao abrir PDF</div>
        <div className="text-white/60 mb-8 max-w-lg text-center">{pdfError}</div>
        <button onClick={onBack} className="btn-primary px-6 py-2">Voltar à Biblioteca</button>
      </div>
    );
  }

  const isDarkMode = ['dim', 'nord', 'midnight', 'dark', 'high-contrast'].includes(readingMode);
  
  const themeClasses: Record<string, string> = {
    'light': 'bg-[#f4f4f4] text-[#1a1a1a]',
    'sepia': 'bg-[#f4ecd8] text-[#5b4636]',
    'mint': 'bg-[#e2f0cb] text-[#2c4c3b]',
    'dim': 'bg-[#2d2d2d] text-[#e0e0e0]',
    'nord': 'bg-[#2e3440] text-[#eceff4]',
    'midnight': 'bg-[#0f172a] text-[#e2e8f0]',
    'dark': 'bg-[#121212] text-[#cccccc]',
    'high-contrast': 'bg-black text-white'
  };

  const cssFilter = isDarkMode 
    ? (readingMode === 'high-contrast' 
        ? 'invert(1) contrast(1.2)' 
        : (readingMode === 'midnight' 
            ? 'invert(0.9) hue-rotate(180deg) brightness(0.9)' 
            : 'invert(0.9) hue-rotate(180deg)')) 
    : 'none';

  const spacerHeights = {
    top: 0,
    bottom: 0
  };
  for (let i = 1; i < virtualWindow.start; i++) {
    spacerHeights.top += getPageHeight(i) + PAGE_GAP;
  }
  for (let i = virtualWindow.end + 1; i <= totalPages; i++) {
    spacerHeights.bottom += getPageHeight(i) + PAGE_GAP;
  }

  const pagesToRender = [];
  for (let i = virtualWindow.start; i <= virtualWindow.end; i++) {
    pagesToRender.push(i);
  }

  return (
    <div className={`flex h-full relative font-sans transition-colors duration-300 ${themeClasses[readingMode]}`}>
      
      {/* Sidebar de Anotações */}
      {showAnnotations && (
        <div className="w-80 flex-shrink-0 border-r border-black/10 dark:border-white/10 flex flex-col bg-white/5 backdrop-blur-md">
          <AnnotationPanel
            highlights={highlights}
            bookmarks={bookmarks}
            toc={tocItems}
            onClose={() => setShowAnnotations(false)}
            onNavigate={(page) => scrollToPage(page, false)}
            onDeleteHighlight={handleDeleteHighlight}
            onDeleteBookmark={(id) => {
              window.api.library.deleteBookmark(id).then(() => {
                setBookmarks(prev => prev.filter(b => b.id !== id));
              }).catch(console.error);
            }}
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
              
              {spacerHeights.top > 0 && (
                <div style={{ height: spacerHeights.top, width: '100%' }} />
              )}
              
              {pagesToRender.map(pageNum => (
                <PdfPage
                  key={pageNum}
                  pageNum={pageNum}
                  pdfDoc={pdfDoc}
                  zoom={zoom}
                  isRendered={renderedPages.has(pageNum)}
                  cssFilter={cssFilter}
                  highlights={highlights.filter(h => h.page_number === pageNum)}
                  activeHighlight={activeHighlight}
                  ocrProcessing={ocrProcessing.has(pageNum)}
                  onHeightMeasured={(h) => { measuredHeights.current.set(pageNum, h); }}
                  onHighlightClick={(h, pos) => setActiveHighlight({ highlight: h, position: pos })}
                  onOcrRequest={async (pageBuffer) => {
                    setOcrProcessing(prev => new Set(prev).add(pageNum));
                    try {
                      // Process OCR logic here if needed (e.g. using Tesseract)
                    } catch (e) {
                      console.error("OCR falhou na página", pageNum, e);
                    } finally {
                      setOcrProcessing(prev => {
                        const n = new Set(prev);
                        n.delete(pageNum);
                        return n;
                      });
                    }
                  }}
                />
              ))}

              {spacerHeights.bottom > 0 && (
                <div style={{ height: spacerHeights.bottom, width: '100%' }} />
              )}
            </div>
          )}
        </div>

        {/* Toolbar Superior / Mobile */}
        <div className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none transition-opacity duration-300 ${(showMobileTools || showAnnotations) ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
          <div className="pointer-events-auto flex gap-2">
            <button onClick={onBack} className="p-3 md:p-2 rounded-xl bg-white/10 backdrop-blur-md shadow-lg hover:bg-white/20 transition-colors text-current">
              <ArrowLeft size={24} />
            </button>
            <button onClick={() => setShowAnnotations(!showAnnotations)} className={`p-3 md:p-2 rounded-xl backdrop-blur-md shadow-lg transition-colors ${showAnnotations ? 'bg-brand-primary text-white' : 'bg-white/10 hover:bg-white/20 text-current'}`}>
              <StickyNote size={24} />
            </button>
          </div>
          
          <div className="pointer-events-auto flex gap-2">
            <button onClick={() => setShowSearch(!showSearch)} className="p-3 md:p-2 rounded-xl bg-white/10 backdrop-blur-md shadow-lg hover:bg-white/20 transition-colors text-current">
              <Search size={24} />
            </button>
            <button onClick={() => toggleBookmark(currentPage)} className="p-3 md:p-2 rounded-xl bg-white/10 backdrop-blur-md shadow-lg hover:bg-white/20 transition-colors text-current">
              {bookmarks.some(b => b.page_number === currentPage) ? <BookmarkCheck size={24} className="text-brand-primary" /> : <Bookmark size={24} />}
            </button>
          </div>
        </div>

        {/* Barra de Busca Flutuante */}
        {showSearch && (
          <div className="absolute top-20 right-4 w-80 shadow-2xl rounded-2xl overflow-hidden pointer-events-auto animate-in slide-in-from-top-4">
             <PdfSearchBar 
                pdfDoc={pdfDoc} 
                totalPages={totalPages} 
                onResultClick={(page) => scrollToPage(page, false)} 
                onClose={() => setShowSearch(false)}
             />
          </div>
        )}

        {/* Toolbar Inferior (Zoom & Pager) */}
        {!loading && (
          <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none transition-opacity duration-300 ${showMobileTools ? 'opacity-100' : 'opacity-0 md:opacity-100'}`}>
            <PdfToolbar
              currentPage={currentPage}
              totalPages={totalPages}
              zoom={zoom}
              onPageChange={(p) => scrollToPage(p, false)}
              onZoomIn={() => handleZoom(z => Math.min(3, z + 0.25))}
              onZoomOut={() => handleZoom(z => Math.max(0.5, z - 0.25))}
              onToggleMode={cycleReadingMode}
              readingMode={readingMode}
            />
          </div>
        )}

        {/* Toolbars Contextuais (Highlight) */}
        {selection && (
          <HighlightToolbar
            position={selection.position}
            onColorSelect={handleSaveHighlight}
            onDictionary={() => {
              setDictionaryTarget({ word: selection.text, context: selection.pageContext });
            }}
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
            word={dictionaryTarget.word}
            context={dictionaryTarget.context}
            onClose={() => setDictionaryTarget(null)}
          />
        )}

        {/* Toast de Modo de Leitura */}
        {modeToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-4 z-50">
            {modeToast}
          </div>
        )}
        
      </div>
    </div>
  );
}
