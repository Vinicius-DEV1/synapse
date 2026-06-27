import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import Tesseract from 'tesseract.js';
import { ArrowLeft, Search, Bookmark, BookmarkCheck, Sun, Moon, ZoomIn, ZoomOut, StickyNote } from 'lucide-react';
import type { LibraryBook, LibraryHighlight, LibraryBookmark, ReadingMode } from '../../types';
import HighlightToolbar from './HighlightToolbar';
import AnnotationPanel from './AnnotationPanel';
import PdfSearchBar from './PdfSearchBar';
import DictionaryModal from './DictionaryModal';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfReaderProps {
  book: LibraryBook;
  onBack: () => void;
  onUpdateBook: (updates: Partial<LibraryBook>) => void;
}

export default function PdfReader({ book, onBack, onUpdateBook }: PdfReaderProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(book.last_read_page || 1);
  const [zoom, setZoom] = useState(1.0);
  const [readingMode, setReadingMode] = useState<ReadingMode>('light');
  const [highlights, setHighlights] = useState<LibraryHighlight[]>([]);
  const [bookmarks, setBookmarks] = useState<LibraryBookmark[]>([]);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [dictionaryWord, setDictionaryWord] = useState<string | null>(null);
  const [tocItems, setTocItems] = useState<any[]>([]);
  const [selection, setSelection] = useState<{text: string; rects: any[]; pageNum: number; position: {x: number; y: number}} | null>(null);
  const [loading, setLoading] = useState(true);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const [ocrProcessing, setOcrProcessing] = useState<Set<number>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<any>(null);

  // Load PDF document
  useEffect(() => {
    let active = true;
    const loadPdf = async () => {
      try {
        setLoading(true);
        const fileData = await window.api.library.getBookFile(book.id);
        const loadingTask = pdfjsLib.getDocument({ data: fileData });
        const pdf = await loadingTask.promise;
        
        if (!active) return;
        
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        
        if (book.total_pages !== pdf.numPages || book.reading_status === 'not_started') {
          onUpdateBook({ 
            id: book.id, 
            total_pages: pdf.numPages,
            reading_status: book.reading_status === 'not_started' ? 'reading' : book.reading_status 
          });
        }

        // Load Outline (TOC)
        const outline = await pdf.getOutline();
        if (outline) {
          const processOutline = async (items: any[], level = 0) => {
            const result = [];
            for (const item of items) {
              let pageNumber = 1;
              if (item.dest) {
                const dest = typeof item.dest === 'string' ? await pdf.getDestination(item.dest) : item.dest;
                if (dest && dest[0]) {
                  try {
                    const pageIndex = await pdf.getPageIndex(dest[0]);
                    pageNumber = pageIndex + 1;
                  } catch (e) {
                    console.error("Failed to get page index for TOC item", e);
                  }
                }
              }
              const processedItem: any = {
                title: item.title,
                pageNumber,
                level
              };
              if (item.items && item.items.length > 0) {
                processedItem.children = await processOutline(item.items, level + 1);
              }
              result.push(processedItem);
            }
            return result;
          };
          setTocItems(await processOutline(outline));
        }

        // Load highlights and bookmarks
        const loadedHighlights = await window.api.library.getHighlights(book.id);
        const loadedBookmarks = await window.api.library.getBookmarks(book.id);
        setHighlights(loadedHighlights);
        setBookmarks(loadedBookmarks);

        // Start session
        const session = await window.api.library.startReadingSession({
          book_id: book.id,
          start_page: book.last_read_page || 1
        });
        sessionIdRef.current = session.id;

        setLoading(false);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setLoading(false);
      }
    };
    
    loadPdf();
    return () => { active = false; };
  }, [book.id]);

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        window.api.library.endReadingSession({
          id: sessionIdRef.current,
          end_page: currentPage,
          pages_read: 1 // Simplified for now
        });
      }
    };
  }, [currentPage]);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (!scrollRef.current || totalPages === 0 || loading) return;

    observerRef.current = new IntersectionObserver((entries) => {
      let mostVisiblePage = currentPage;
      let maxRatio = 0;

      entries.forEach(entry => {
        const pageNum = parseInt(entry.target.getAttribute('data-page-number') || '1', 10);
        
        if (entry.isIntersecting) {
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            mostVisiblePage = pageNum;
          }
          
          setRenderedPages(prev => {
            const next = new Set(prev);
            next.add(pageNum);
            // Render +/- 2 pages for buffer
            for (let i = Math.max(1, pageNum - 2); i <= Math.min(totalPages, pageNum + 2); i++) {
              next.add(i);
            }
            return next;
          });
        }
      });

      if (mostVisiblePage !== currentPage && maxRatio > 0.3) {
        setCurrentPage(mostVisiblePage);
        
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          onUpdateBook({ id: book.id, last_read_page: mostVisiblePage, last_read_at: new Date().toISOString() });
        }, 2000);
      }
    }, {
      root: scrollRef.current,
      rootMargin: '100% 0px 100% 0px',
      threshold: [0, 0.1, 0.5, 0.9, 1.0]
    });

    pageRefs.current.forEach(ref => {
      if (ref) observerRef.current?.observe(ref);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [totalPages, loading, zoom, currentPage, book.id]); // Added zoom to trigger re-observe

  // Scroll to initial page
  useEffect(() => {
    if (!loading && pdfDoc && book.last_read_page > 1) {
      setTimeout(() => {
        scrollToPage(book.last_read_page);
      }, 500);
    }
  }, [loading, pdfDoc]);

  const scrollToPage = (pageNum: number) => {
    const el = pageRefs.current.get(pageNum);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setCurrentPage(pageNum);
    }
  };

  // Keyboard shortcuts
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
        toggleBookmark();
      } else if (e.key === 's' && !e.ctrlKey && !e.metaKey && e.target === document.body) {
        setShowAnnotations(prev => !prev);
      } else if (e.key === 'm' && !e.ctrlKey && !e.metaKey && e.target === document.body) {
        cycleReadingMode();
      } else if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setZoom(z => Math.min(3, z + 0.25));
      } else if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        setZoom(z => Math.max(0.5, z - 0.25));
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        setZoom(1.0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, showAnnotations, currentPage]);

  const cycleReadingMode = () => {
    setReadingMode(prev => prev === 'light' ? 'sepia' : prev === 'sepia' ? 'dark' : 'light');
  };

  const toggleBookmark = async () => {
    const existing = bookmarks.find(b => b.page_number === currentPage);
    if (existing) {
      await window.api.library.deleteBookmark(existing.id);
      setBookmarks(prev => prev.filter(b => b.id !== existing.id));
    } else {
      const newBookmark = await window.api.library.createBookmark({
        book_id: book.id,
        page_number: currentPage,
        label: `Página ${currentPage}`
      });
      setBookmarks(prev => [...prev, newBookmark]);
    }
  };

  // Handle text selection
  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelection(null);
        return;
      }
      
      const range = sel.getRangeAt(0);
      const rects = range.getClientRects();
      if (rects.length === 0) return;
      
      const rect = range.getBoundingClientRect();
      
      // Find the page number and page element
      let node: Node | null = range.commonAncestorContainer;
      let pageNum = currentPage;
      let pageElement: HTMLElement | null = null;
      
      while (node && node !== document.body) {
        if (node instanceof HTMLElement && node.hasAttribute('data-page-number')) {
          pageNum = parseInt(node.getAttribute('data-page-number') || '1', 10);
          pageElement = node;
          break;
        }
        node = node.parentNode;
      }

      if (!pageElement) return;

      const pageRect = pageElement.getBoundingClientRect();
      
      // Calculate relative rects (percentages) to be scale-invariant
      const relativeRects = Array.from(rects).map(r => ({
        left: (r.left - pageRect.left) / pageRect.width,
        top: (r.top - pageRect.top) / pageRect.height,
        width: r.width / pageRect.width,
        height: r.height / pageRect.height
      }));

      setSelection({
        text: sel.toString(),
        rects: relativeRects,
        pageNum,
        position: { x: rect.left + rect.width / 2, y: rect.top - 10 }
      });
    };
    
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [currentPage]);

  const handleCreateHighlight = async (color: string, note?: string) => {
    if (!selection) return;
    try {
      const newHighlight = await window.api.library.createHighlight({
        book_id: book.id,
        page_number: selection.pageNum,
        text_content: selection.text,
        color: color as any,
        rects: JSON.stringify(selection.rects),
        highlight_type: 'text',
        note: note || ''
      });
      setHighlights(prev => [...prev, newHighlight]);
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      console.error('Failed to create highlight', err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-dark-bg text-dark-subtext">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p>Carregando PDF...</p>
      </div>
    );
  }

  const isBookmarked = bookmarks.some(b => b.page_number === currentPage);

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-bg overflow-hidden relative">
      {/* Header */}
      <div className="library-header flex-shrink-0 h-14 border-b border-white/5 bg-dark-card/50 flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 rounded-lg text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="font-medium text-sm truncate max-w-[200px]" title={book.title}>
            {book.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1">
            <span className="text-xs text-dark-subtext">Pág</span>
            <input 
              type="number"
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= totalPages) {
                  scrollToPage(val);
                }
              }}
              className="w-12 bg-transparent text-center text-sm focus:outline-none focus:bg-white/5 rounded"
              min={1}
              max={totalPages}
            />
            <span className="text-xs text-dark-subtext">/ {totalPages}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
            className="p-1.5 rounded-lg text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all"
            title="Diminuir (Ctrl+-)"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-dark-subtext w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={() => setZoom(z => Math.min(3, z + 0.25))}
            className="p-1.5 rounded-lg text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all"
            title="Aumentar (Ctrl++)"
          >
            <ZoomIn size={16} />
          </button>
          
          <div className="w-px h-4 bg-white/10 mx-1" />
          
          <button 
            onClick={() => setShowSearch(prev => !prev)}
            className={`p-1.5 rounded-lg transition-all ${showSearch ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'}`}
            title="Buscar (Ctrl+F)"
          >
            <Search size={16} />
          </button>
          
          <button 
            onClick={toggleBookmark}
            className={`p-1.5 rounded-lg transition-all ${isBookmarked ? 'bg-red-500/20 text-red-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'}`}
            title="Marcar página (B)"
          >
            {isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
          
          <button 
            onClick={cycleReadingMode}
            className="p-1.5 rounded-lg text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all"
            title="Modo de leitura (M)"
          >
            {readingMode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          
          <div className="w-px h-4 bg-white/10 mx-1" />
          
          <button 
            onClick={() => setShowAnnotations(prev => !prev)}
            className={`p-1.5 rounded-lg transition-all ${showAnnotations ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'}`}
            title="Anotações e Sumário (S)"
          >
            <StickyNote size={16} />
          </button>
        </div>
      </div>

      {showSearch && (
        <PdfSearchBar 
          pdfDoc={pdfDoc} 
          bookId={book.id}
          totalPages={totalPages}
          currentPage={currentPage}
          onNavigateToPage={scrollToPage}
          onHighlightResults={() => {/* Optional: pass to PdfPage to render search highlights */}}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* PDF Scroll Container */}
        <div 
          ref={scrollRef}
          className={`flex-1 overflow-y-auto pdf-scroll-container p-4 pb-20 reading-mode-${readingMode}`}
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
            <PdfPage
              key={pageNum}
              pageNum={pageNum}
              pdfDoc={pdfDoc}
              zoom={zoom}
              isRendered={renderedPages.has(pageNum)}
              bookId={book.id}
              highlights={highlights.filter(h => h.page_number === pageNum)}
              isBookmarked={bookmarks.some(b => b.page_number === pageNum)}
              onToggleBookmark={toggleBookmark}
              pageRefs={pageRefs}
              canvasRefs={canvasRefs}
              ocrProcessing={ocrProcessing}
              setOcrProcessing={setOcrProcessing}
            />
          ))}
        </div>

        {/* Annotation Panel */}
        {showAnnotations && (
          <AnnotationPanel
            bookId={book.id}
            highlights={highlights}
            bookmarks={bookmarks}
            tocItems={tocItems}
            currentPage={currentPage}
            onNavigateToPage={scrollToPage}
            onUpdateHighlight={async (id, updates) => {
              await window.api.library.updateHighlight({ id, ...updates });
              setHighlights(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
            }}
            onDeleteHighlight={async (id) => {
              await window.api.library.deleteHighlight(id);
              setHighlights(prev => prev.filter(h => h.id !== id));
            }}
            onUpdateBookmark={async (id, label) => {
              await window.api.library.updateBookmark({ id, label });
              setBookmarks(prev => prev.map(b => b.id === id ? { ...b, label } : b));
            }}
            onDeleteBookmark={async (id) => {
              await window.api.library.deleteBookmark(id);
              setBookmarks(prev => prev.filter(b => b.id !== id));
            }}
            onClose={() => setShowAnnotations(false)}
          />
        )}
      </div>

      {/* Highlight Toolbar */}
      {selection && (
        <HighlightToolbar
          position={selection.position}
          selectedText={selection.text}
          onHighlight={handleCreateHighlight}
          onDictionary={(text) => setDictionaryWord(text)}
          onDismiss={() => {
            setSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}

      {/* Dictionary Modal */}
      {dictionaryWord && (
        <DictionaryModal 
          text={dictionaryWord} 
          onClose={() => setDictionaryWord(null)} 
        />
      )}
    </div>
  );
}

// Child Component for rendering a single page
interface PdfPageProps {
  pageNum: number;
  pdfDoc: any;
  zoom: number;
  isRendered: boolean;
  bookId: string;
  highlights: LibraryHighlight[];
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  pageRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  canvasRefs: React.MutableRefObject<Map<number, HTMLCanvasElement>>;
  ocrProcessing: Set<number>;
  setOcrProcessing: React.Dispatch<React.SetStateAction<Set<number>>>;
}

const PdfPage = React.memo(({
  pageNum, pdfDoc, zoom, isRendered, bookId, highlights: _highlights, isBookmarked,
  onToggleBookmark, pageRefs, canvasRefs, ocrProcessing, setOcrProcessing
}: PdfPageProps) => {
  const [dimensions, setDimensions] = useState({ width: 600, height: 800 }); // Default
  const [textItems, setTextItems] = useState<any[]>([]);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    const initPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom });
        if (active) {
          setDimensions({ width: viewport.width, height: viewport.height });
        }
      } catch (e) {
        console.error("Failed to init page", e);
      }
    };
    initPage();
    return () => { active = false; };
  }, [pdfDoc, pageNum, zoom]);

  useEffect(() => {
    if (!isRendered) return;
    
    let active = true;
    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom });
        
        const canvas = canvasRefs.current.get(pageNum);
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Cancel previous render
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderContext = { canvasContext: context, viewport };
        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        
        await renderTask.promise;
        
        if (!active) return;

        // Get text content
        const textContent = await page.getTextContent();
        if (textContent.items.length > 0) {
          setTextItems(textContent.items.map((item: any) => {
            if ('transform' in item) {
              const tx = item.transform[4];
              const ty = item.transform[5];
              const [x, y] = viewport.convertToViewportPoint(tx, ty);
              const fontSize = Math.abs(item.transform[3]) * viewport.scale;
              return {
                str: item.str,
                left: x,
                top: y - fontSize,
                width: item.width * viewport.scale,
                height: fontSize,
                isPdf: true,
                transform: item.transform
              };
            }
            return item;
          }));
        } else {
          // No text layer, try OCR
          const cache = await window.api.library.getOcrCache(bookId, pageNum);
          if (cache) {
            setTextItems(JSON.parse(cache.word_boxes));
          } else if (!ocrProcessing.has(pageNum)) {
            // Trigger OCR
            setOcrProcessing(prev => new Set(prev).add(pageNum));
            
            try {
              const imgData = canvas.toDataURL('image/png');
              const result = await Tesseract.recognize(imgData, 'por');
              
              const words = (result.data as any).words.map((w: any) => ({
                str: w.text,
                left: w.bbox.x0,
                top: w.bbox.y0,
                width: w.bbox.x1 - w.bbox.x0,
                height: w.bbox.y1 - w.bbox.y0
              }));
              
              if (active) {
                setTextItems(words);
                await window.api.library.saveOcrCache({
                  book_id: bookId,
                  page_number: pageNum,
                  text_content: result.data.text,
                  word_boxes: JSON.stringify(words)
                });
              }
            } catch (err) {
              console.error("OCR failed for page", pageNum, err);
            } finally {
              if (active) {
                setOcrProcessing(prev => {
                  const next = new Set(prev);
                  next.delete(pageNum);
                  return next;
                });
              }
            }
          }
        }
      } catch (e: any) {
        if (e.name !== 'RenderingCancelledException') {
          console.error("Failed to render page", pageNum, e);
        }
      }
    };
    
    renderPage();
    return () => { 
      active = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [isRendered, pdfDoc, pageNum, zoom, bookId]); // Intentionally omitting ocrProcessing and setOcrProcessing to prevent loops

  return (
    <div 
      ref={(el) => { if (el) pageRefs.current.set(pageNum, el); }}
      data-page-number={pageNum}
      className="pdf-page-wrapper"
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      {isRendered ? (
        <>
          <canvas 
            ref={(el) => { if (el) canvasRefs.current.set(pageNum, el); }}
            className="w-full h-full block"
          />
          
          <div className="pdf-text-layer">
            {textItems.map((item, idx) => (
              <span 
                key={idx}
                style={{
                  position: 'absolute',
                  left: item.left,
                  top: item.top,
                  width: item.width,
                  height: item.height,
                  fontSize: item.height * 0.8,
                  fontFamily: 'sans-serif'
                }}
              >
                {item.str}
              </span>
            ))}
          </div>

          <div className="pdf-highlight-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {_highlights.map((h, i) => {
              try {
                const rects = JSON.parse(h.rects);
                return rects.map((r: any, j: number) => {
                  let colorHex = '#fbbf24'; // yellow
                  if (h.color === 'green') colorHex = '#34d399';
                  if (h.color === 'blue') colorHex = '#60a5fa';
                  if (h.color === 'pink') colorHex = '#f472b6';
                  if (h.color === 'orange') colorHex = '#fb923c';

                  return (
                    <div 
                      key={`${i}-${j}`}
                      style={{
                        position: 'absolute',
                        left: `${r.left * 100}%`,
                        top: `${r.top * 100}%`,
                        width: `${r.width * 100}%`,
                        height: `${r.height * 100}%`,
                        backgroundColor: colorHex,
                        opacity: 0.35,
                        mixBlendMode: 'multiply'
                      }}
                    />
                  );
                });
              } catch (e) {
                return null;
              }
            })}
          </div>

          <div 
            className={`bookmark-ribbon ${!isBookmarked ? 'bookmark-ribbon-empty' : ''}`}
            onClick={onToggleBookmark}
            title={isBookmarked ? 'Remover marcador' : 'Adicionar marcador'}
          />

          {ocrProcessing.has(pageNum) && (
            <div className="ocr-processing-badge">
              <div className="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
              Processando texto...
            </div>
          )}

          <div className="page-number-badge">
            Pág {pageNum}
          </div>
        </>
      ) : (
        <div className="w-full h-full bg-black/5 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin opacity-50" />
        </div>
      )}
    </div>
  );
});
