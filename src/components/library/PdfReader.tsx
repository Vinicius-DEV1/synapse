import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import Tesseract from 'tesseract.js';
import { ArrowLeft, Search, Bookmark, BookmarkCheck, Sun, Moon, ZoomIn, ZoomOut, StickyNote } from 'lucide-react';
import type { LibraryBook, LibraryHighlight, LibraryBookmark, ReadingMode } from '../../types';
import HighlightToolbar from './HighlightToolbar';
import AnnotationPanel from './AnnotationPanel';
import PdfSearchBar from './PdfSearchBar';
import DictionaryModal from './DictionaryModal';
import { getSettings, saveSettings } from '../../utils/settings';
import { getValidAccessToken, downloadFromDrive } from '../../services/drive';
import { decryptFile } from '../../services/storage';
import { useStore } from '../../store/useStore';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfReaderProps {
  book: LibraryBook;
  onBack: () => void;
  onUpdateBook: (updates: Partial<LibraryBook>) => void;
}

export default function PdfReader({ book, onBack, onUpdateBook }: PdfReaderProps) {
  const { state } = useStore();
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const settings = getSettings();
  const [totalPages, setTotalPages] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(book.last_read_page || 1);
  const [zoom, setZoom] = useState(1.0);
  const [readingMode, setReadingMode] = useState<'light' | 'sepia' | 'mint' | 'dim' | 'nord' | 'midnight' | 'dark' | 'high-contrast'>(
    (settings.defaultReadingMode as any) || 'light'
  );
  const [highlights, setHighlights] = useState<LibraryHighlight[]>([]);
  const [bookmarks, setBookmarks] = useState<LibraryBookmark[]>([]);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileTools, setShowMobileTools] = useState(false);
  const toolsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePdfClick = () => {
    setShowMobileTools(true);
    if (toolsTimeoutRef.current) {
      clearTimeout(toolsTimeoutRef.current);
    }
    toolsTimeoutRef.current = setTimeout(() => {
      setShowMobileTools(false);
    }, 3000);
  };

  const [zoomInputActive, setZoomInputActive] = useState(false);
  const [zoomInputValue, setZoomInputValue] = useState('');
  const zoomInputRef = useRef<HTMLInputElement>(null);
  const [dictionaryTarget, setDictionaryTarget] = useState<{ word: string, context?: string } | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<{ highlight: LibraryHighlight, position: { x: number, y: number } } | null>(null);
  const [tocItems, setTocItems] = useState<any[]>([]);
  const [selection, setSelection] = useState<{
    text: string;
    pageContext?: string;
    rects: any[];
    pageNum: number;
    position: { x: number; y: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const [ocrProcessing, setOcrProcessing] = useState<Set<number>>(new Set());
  const [modeToast, setModeToast] = useState<string | null>(null);

  // Virtual scroll state — estimated page height used for spacers
  const PAGE_GAP = 16; // gap between pages in px
  const estimatedPageHeightRef = useRef(800);
  const [virtualWindow, setVirtualWindow] = useState<{ start: number; end: number }>({ start: 1, end: 1 });

  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<any>(null);
  const measuredHeights = useRef<Map<number, number>>(new Map());

  // Load PDF document
  useEffect(() => {
    let active = true;
    const loadPdf = async () => {
      try {
        setLoading(true);
        setPdfError(null);
        let fileData;
        try {
          fileData = await window.api.library.getBookFile(book.id);
        } catch (localErr) {
          console.log("Arquivo local não encontrado. Tentando nuvem...", localErr);
        }
        
        if (!fileData && book.drive_file_id) {
          console.log("Baixando do Google Drive: ", book.drive_file_id);
          const token = await getValidAccessToken();
          if (token) {
             const encryptedData = await downloadFromDrive(token, book.drive_file_id);
             const masterKey = state.masterKey;
             if (masterKey) {
               fileData = await decryptFile(encryptedData, masterKey);
             } else {
               throw new Error("Chave mestra não encontrada para descriptografar.");
             }
          } else {
             throw new Error("Você precisa conectar sua conta do Google Drive primeiro para baixar este livro.");
          }
        }

        if (!fileData) {
          throw new Error("Arquivo PDF vazio ou não encontrado. Verifique se o arquivo existe na nuvem.");
        }
        
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
      } catch (err: any) {
        console.error("Error loading PDF:", err);
        setPdfError(err.message || "Falha desconhecida ao carregar o PDF.");
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
  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Sophisticated Zoom Handling (maintains exact relative center)
  const scrollRatioRef = useRef<number>(0);
  const zoomAnimRef = useRef<number>(0);

  const handleZoom = useCallback((updater: number | ((z: number) => number)) => {
    if (!scrollRef.current) {
      setZoom(updater);
      return;
    }
    
    const el = scrollRef.current;
    // Calculate what is exactly in the center of the viewport right now
    const centerOffset = el.scrollTop + (el.clientHeight / 2);
    const ratio = centerOffset / el.scrollHeight;
    scrollRatioRef.current = ratio;

    setZoom(updater);

    if (zoomAnimRef.current) cancelAnimationFrame(zoomAnimRef.current);

    // Reapply this ratio across multiple frames while the async PDF rendering updates page heights
    const startTime = Date.now();
    let lastScrollHeight = el.scrollHeight;
    let expectedScrollTop = el.scrollTop;

    const applyScroll = () => {
      if (Date.now() - startTime < 800 && scrollRef.current) {
        const currentEl = scrollRef.current;
        
        // Se o usuário rolou a página manualmente (mouse/scroll) durante a animação, aborta o ajuste do zoom!
        if (Math.abs(currentEl.scrollTop - expectedScrollTop) > 10) {
          return;
        }

        // Só recalcula e ajusta se a altura total realmente mudou (quando uma página termina de renderizar)
        if (currentEl.scrollHeight !== lastScrollHeight) {
          const newCenterOffset = scrollRatioRef.current * currentEl.scrollHeight;
          expectedScrollTop = newCenterOffset - (currentEl.clientHeight / 2);
          currentEl.scrollTop = expectedScrollTop;
          lastScrollHeight = currentEl.scrollHeight;
        }
        
        zoomAnimRef.current = requestAnimationFrame(applyScroll);
      }
    };
    zoomAnimRef.current = requestAnimationFrame(applyScroll);
  }, []);

  // Ctrl + Mouse Wheel for zoom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading) return;
    
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoom(z => Math.min(3, z + 0.1));
        } else {
          handleZoom(z => Math.max(0.5, z - 0.1));
        }
      }
    };
    
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleZoom, loading]);

  // --- TRUE VIRTUALIZATION ---
  // Helper: get the height of a page (measured or estimated)
  const getPageHeight = useCallback((pageNum: number) => {
    return measuredHeights.current.get(pageNum) || estimatedPageHeightRef.current;
  }, []);

  // Helper: get scroll offset for a given page number
  const getPageOffset = useCallback((targetPage: number) => {
    let offset = 0;
    for (let i = 1; i < targetPage; i++) {
      offset += getPageHeight(i) + PAGE_GAP;
    }
    return offset;
  }, [getPageHeight, PAGE_GAP]);

  // Scroll-based virtualizer: determines which pages to mount in the DOM
  useEffect(() => {
    if (!scrollRef.current || totalPages === 0 || loading) return;

    const BUFFER = 3; // extra pages above/below viewport

    const recalculate = () => {
      const container = scrollRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;

      // Find the first visible page
      let accum = 0;
      let firstVisible = 1;
      for (let i = 1; i <= totalPages; i++) {
        const h = getPageHeight(i) + PAGE_GAP;
        if (accum + h > scrollTop) {
          firstVisible = i;
          break;
        }
        accum += h;
      }

      // Find the last visible page
      let lastVisible = firstVisible;
      let visibleAccum = accum;
      for (let i = firstVisible; i <= totalPages; i++) {
        lastVisible = i;
        visibleAccum += getPageHeight(i) + PAGE_GAP;
        if (visibleAccum > scrollTop + viewportHeight) break;
      }

      const windowStart = Math.max(1, firstVisible - BUFFER);
      const windowEnd = Math.min(totalPages, lastVisible + BUFFER);

      setVirtualWindow(prev => {
        if (prev.start === windowStart && prev.end === windowEnd) return prev;
        return { start: windowStart, end: windowEnd };
      });

      setRenderedPages(() => {
        const next = new Set<number>();
        for (let i = windowStart; i <= windowEnd; i++) {
          next.add(i);
        }
        return next;
      });

      // Track current page (most visible)
      if (firstVisible !== currentPageRef.current) {
        setCurrentPage(firstVisible);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          onUpdateBook({ id: book.id, last_read_page: firstVisible, last_read_at: new Date().toISOString() });
        }, 2000);
      }
    };

    recalculate();

    const container = scrollRef.current;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          recalculate();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [totalPages, loading, book.id, zoom, getPageHeight, getPageOffset, PAGE_GAP]);

  // Scroll to initial page
  useEffect(() => {
    if (!loading && pdfDoc && book.last_read_page > 1) {
      setTimeout(() => {
        const offset = getPageOffset(book.last_read_page);
        if (scrollRef.current) {
          scrollRef.current.scrollTop = offset;
        }
      }, 300);
    }
  }, [loading, pdfDoc]);

  const scrollToPage = useCallback((pageNum: number, smooth = true) => {
    const offset = getPageOffset(pageNum);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: offset, behavior: smooth ? 'smooth' : 'auto' });
      setCurrentPage(pageNum);
    }
  }, [getPageOffset]);

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
  }, [showSearch, showAnnotations, currentPage]);

  useEffect(() => {
    if (modeToast) {
      const timer = setTimeout(() => setModeToast(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [modeToast]);

  const cycleReadingMode = () => {
    setReadingMode(prev => {
      const modes: Array<'light' | 'sepia' | 'mint' | 'dim' | 'nord' | 'midnight' | 'dark' | 'high-contrast'> = ['light', 'sepia', 'mint', 'dim', 'nord', 'midnight', 'dark', 'high-contrast'];
      const currentIndex = modes.indexOf(prev);
      const next = modes[(currentIndex + 1) % modes.length];
      const currentSettings = getSettings();
      saveSettings({ ...currentSettings, defaultReadingMode: next });
      
      const modeNames: Record<string, string> = {
        'light': 'Modo Claro',
        'sepia': 'Sépia',
        'mint': 'Menta Pastel',
        'dim': 'Suave (Dim)',
        'nord': 'Nord',
        'midnight': 'Azul Meia-Noite',
        'dark': 'Modo Escuro',
        'high-contrast': 'Alto Contraste'
      };
      setModeToast(modeNames[next]);
      
      return next;
    });
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
    const handleMouseUp = (e: MouseEvent) => {
      // Ignorar mouseup se for dentro da toolbar ou modal
      const target = e.target as HTMLElement;
      if (target.closest('.highlight-toolbar-container') || target.closest('.dictionary-modal-container')) {
        return;
      }

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelection(null);
        return;
      }
      
      const range = sel.getRangeAt(0);
      const rawRects = Array.from(range.getClientRects());
      if (rawRects.length === 0) return;
      
      const rect = range.getBoundingClientRect();
      
      // Merge rects that are close to each other on the same line to avoid gaps
      const mergedRects: {left: number, top: number, right: number, bottom: number, width: number, height: number}[] = [];
      let currentRect = { 
        left: rawRects[0].left, top: rawRects[0].top, 
        right: rawRects[0].right, bottom: rawRects[0].bottom,
        width: rawRects[0].width, height: rawRects[0].height 
      };

      for (let i = 1; i < rawRects.length; i++) {
        const nextRect = rawRects[i];
        
        const verticalCenter1 = currentRect.top + currentRect.height / 2;
        const verticalCenter2 = nextRect.top + nextRect.height / 2;
        
        // Considera na mesma linha se os centros verticais estiverem próximos (menos da metade da altura da fonte)
        const sameLine = Math.abs(verticalCenter1 - verticalCenter2) < Math.max(currentRect.height, nextRect.height) * 0.5;
        
        // Permite buracos de até 100 pixels (para justificação de texto bem espaçada)
        const closeHorizontally = (nextRect.left - currentRect.right) < 100;

        if (sameLine && closeHorizontally) {
          // Merge
          currentRect.left = Math.min(currentRect.left, nextRect.left);
          currentRect.right = Math.max(currentRect.right, nextRect.right);
          currentRect.top = Math.min(currentRect.top, nextRect.top);
          currentRect.bottom = Math.max(currentRect.bottom, nextRect.bottom);
          currentRect.width = currentRect.right - currentRect.left;
          currentRect.height = currentRect.bottom - currentRect.top;
        } else {
          mergedRects.push(currentRect);
          currentRect = { 
            left: nextRect.left, top: nextRect.top, 
            right: nextRect.right, bottom: nextRect.bottom,
            width: nextRect.width, height: nextRect.height 
          };
        }
      }
      mergedRects.push(currentRect);
      
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
      const relativeRects = mergedRects.map(r => ({
        left: (r.left - pageRect.left) / pageRect.width,
        top: (r.top - pageRect.top) / pageRect.height,
        width: r.width / pageRect.width,
        height: r.height / pageRect.height
      }));

      let selectedString = sel.toString().replace(/\s+/g, ' ').trim();
      // Remove trailing weird characters that sometimes get caught
      selectedString = selectedString.replace(/[^\w\sÀ-ÿ.,!?;:]+$/g, '');

      // Pega todo o texto da página atual para dar contexto à IA
      const pageTextContext = pageElement.textContent?.replace(/\s+/g, ' ').trim() || '';

      setSelection({
        text: selectedString,
        pageContext: pageTextContext,
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

  if (!loading && !pdfDoc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-dark-bg text-dark-subtext p-6">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
          <StickyNote size={32} />
        </div>
        <p className="text-lg font-medium text-white mb-2">Falha ao abrir PDF</p>
        <p className="text-sm text-center max-w-md mb-6">
          Não foi possível baixar o arquivo da nuvem. <br/><br/>
          <strong className="text-red-400">Erro detectado:</strong> {pdfError}
        </p>
        <button 
          onClick={onBack}
          className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-lg font-medium transition-all"
        >
          Voltar para Biblioteca
        </button>
      </div>
    );
  }

  const isBookmarked = bookmarks.some(b => b.page_number === currentPage);

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-bg overflow-hidden relative">
      {/* Floating Top-Left Controls */}
      <div className={`absolute top-4 left-4 z-50 flex flex-col gap-2 transition-opacity duration-300 ${showMobileTools ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none md:pointer-events-auto md:opacity-30 md:hover:opacity-100'}`}>
        <div className="flex items-center gap-3 bg-dark-card/90 backdrop-blur-md border border-white/10 rounded-xl p-1.5 shadow-xl">
          <button 
            onClick={onBack}
            className="p-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="hidden md:block font-medium text-sm truncate max-w-[200px] pr-3" title={book.title}>
            {book.title}
          </span>
        </div>
      </div>

      {/* Floating Vertical Toolbar - Right Side */}
      <div className={`absolute top-1/2 -translate-y-1/2 right-4 z-50 flex flex-col items-center gap-3 bg-dark-card/90 backdrop-blur-md border border-white/10 rounded-xl p-2 shadow-2xl transition-opacity duration-300 ${showMobileTools ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none md:pointer-events-auto md:opacity-30 md:hover:opacity-100'}`}>

        {/* Pagination */}
        <div className="flex flex-col items-center gap-1 bg-white/5 rounded-lg p-1.5 w-full">
          <span className="text-[10px] text-dark-subtext uppercase tracking-wider font-semibold">Pág</span>
          <input 
            type="number"
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1 && val <= totalPages) {
                scrollToPage(val);
              }
            }}
            className="w-10 bg-transparent text-center text-xs font-medium text-white focus:outline-none focus:bg-white/10 rounded py-1"
            min={1}
            max={totalPages}
          />
          <span className="text-[10px] text-dark-subtext border-t border-white/10 pt-1 w-full text-center">{totalPages}</span>
        </div>

        <div className="w-full h-px bg-white/10" />

        {/* Zoom */}
        <button 
          onClick={() => handleZoom(z => Math.min(3, z + 0.25))}
          className="p-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/10 transition-all"
          title="Aumentar (Ctrl++)"
        >
          <ZoomIn size={18} />
        </button>
        
        {zoomInputActive ? (
          <input
            ref={zoomInputRef}
            type="number"
            min={50}
            max={300}
            value={zoomInputValue}
            onChange={e => setZoomInputValue(e.target.value)}
            onBlur={() => {
              const parsed = parseInt(zoomInputValue, 10);
              if (!isNaN(parsed)) {
                handleZoom(Math.min(3, Math.max(0.5, parsed / 100)));
              }
              setZoomInputActive(false);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const parsed = parseInt(zoomInputValue, 10);
                if (!isNaN(parsed)) {
                  handleZoom(Math.min(3, Math.max(0.5, parsed / 100)));
                }
                setZoomInputActive(false);
              } else if (e.key === 'Escape') {
                setZoomInputActive(false);
              }
            }}
            className="text-[10px] text-dark-text w-10 text-center bg-white/10 border border-white/20 rounded py-0.5 outline-none focus:border-brand-400"
            autoFocus
          />
        ) : (
          <span
            className="text-[10px] text-dark-subtext font-medium cursor-pointer hover:text-white transition-colors"
            title="Clique para digitar um zoom"
            onClick={() => {
              setZoomInputValue(String(Math.round(zoom * 100)));
              setZoomInputActive(true);
            }}
          >{Math.round(zoom * 100)}%</span>
        )}

        <button 
          onClick={() => handleZoom(z => Math.max(0.5, z - 0.25))}
          className="p-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/10 transition-all"
          title="Diminuir (Ctrl+-)"
        >
          <ZoomOut size={18} />
        </button>

        <div className="w-full h-px bg-white/10" />

        {/* Tools */}
        <button 
          onClick={() => setShowSearch(prev => !prev)}
          className={`p-2 rounded-lg transition-all ${showSearch ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-white hover:bg-white/10'}`}
          title="Buscar (Ctrl+F)"
        >
          <Search size={18} />
        </button>
        
        <button 
          onClick={toggleBookmark}
          className={`p-2 rounded-lg transition-all ${isBookmarked ? 'bg-red-500/20 text-red-400' : 'text-dark-subtext hover:text-white hover:bg-white/10'}`}
          title="Marcar página (B)"
        >
          {isBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        </button>
        
        <button 
          onClick={cycleReadingMode}
          className="p-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/10 transition-all"
          title="Modo de leitura (M)"
        >
          {readingMode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        
        <button 
          onClick={() => setShowAnnotations(prev => !prev)}
          className={`p-2 rounded-lg transition-all ${showAnnotations ? 'bg-blue-500/20 text-blue-400' : 'text-dark-subtext hover:text-white hover:bg-white/10'}`}
          title="Anotações e Sumário (S)"
        >
          <StickyNote size={18} />
        </button>
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
          onClick={handlePdfClick}
          className={`flex-1 overflow-y-auto pdf-scroll-container p-4 pb-20 reading-mode-${readingMode}`}
        >
          {/* Top spacer — represents all unmounted pages above the window */}
          {(() => {
            let topHeight = 0;
            for (let i = 1; i < virtualWindow.start; i++) {
              topHeight += getPageHeight(i) + PAGE_GAP;
            }
            return topHeight > 0 ? <div style={{ height: topHeight, flexShrink: 0 }} /> : null;
          })()}

          {/* Only mount pages inside the virtual window */}
          {Array.from({ length: virtualWindow.end - virtualWindow.start + 1 }, (_, i) => virtualWindow.start + i).map(pageNum => (
            <PdfPage
              key={pageNum}
              pageNum={pageNum}
              pdfDoc={pdfDoc}
              zoom={zoom}
              isRendered={renderedPages.has(pageNum)}
              readingMode={readingMode}
              bookId={book.id}
              highlights={highlights.filter(h => h.page_number === pageNum)}
              isBookmarked={bookmarks.some(b => b.page_number === pageNum)}
              onToggleBookmark={toggleBookmark}
              onHighlightClick={(highlight, rect) => {
                setActiveHighlight({
                  highlight,
                  position: { x: rect.left + rect.width / 2, y: rect.top - 10 }
                });
                setSelection(null);
                window.getSelection()?.removeAllRanges();
              }}
              pageRefs={pageRefs}
              canvasRefs={canvasRefs}
              ocrProcessing={ocrProcessing}
              setOcrProcessing={setOcrProcessing}
              onMeasure={(h) => {
                if (h > 0 && measuredHeights.current.get(pageNum) !== h) {
                  measuredHeights.current.set(pageNum, h);
                  // Update estimated height based on first real measurement
                  if (estimatedPageHeightRef.current === 800) {
                    estimatedPageHeightRef.current = h;
                  }
                }
              }}
            />
          ))}

          {/* Bottom spacer — represents all unmounted pages below the window */}
          {(() => {
            let bottomHeight = 0;
            for (let i = virtualWindow.end + 1; i <= totalPages; i++) {
              bottomHeight += getPageHeight(i) + PAGE_GAP;
            }
            return bottomHeight > 0 ? <div style={{ height: bottomHeight, flexShrink: 0 }} /> : null;
          })()}
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

      {/* Highlight Toolbar for NEW selection */}
      {selection && (
        <HighlightToolbar
          position={selection.position}
          selectedText={selection.text}
          onHighlight={handleCreateHighlight}
          onDictionary={(text) => setDictionaryTarget({ word: text, context: selection.pageContext })}
          onDismiss={() => {
            setSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}

      {/* Highlight Toolbar for EDITING existing highlight */}
      {activeHighlight && (
        <HighlightToolbar
          position={activeHighlight.position}
          existingHighlight={{
            id: activeHighlight.highlight.id,
            color: activeHighlight.highlight.color as any,
            note: activeHighlight.highlight.note
          }}
          onUpdateHighlight={async (id, color, note) => {
            await window.api.library.updateHighlight({ id, color: color as any, note: note || '' });
            setHighlights(prev => prev.map(h => h.id === id ? { ...h, color: color as any, note: note || '' } : h));
          }}
          onDeleteHighlight={async (id) => {
            await window.api.library.deleteHighlight(id);
            setHighlights(prev => prev.filter(h => h.id !== id));
          }}
          onDismiss={() => setActiveHighlight(null)}
        />
      )}

      {/* Dictionary Modal */}
      {dictionaryTarget && (
        <div className="dictionary-modal-container">
          <DictionaryModal 
            text={dictionaryTarget.word} 
            pageContext={dictionaryTarget.context}
            onClose={() => setDictionaryTarget(null)} 
          />
        </div>
      )}

      {/* Mode Toast */}
      {modeToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium pointer-events-none transition-all duration-300">
          {modeToast}
        </div>
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
  readingMode: 'light' | 'sepia' | 'dark' | 'dim' | 'nord' | 'high-contrast';
  bookId: string;
  highlights: LibraryHighlight[];
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onHighlightClick: (h: LibraryHighlight, rect: DOMRect) => void;
  pageRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  canvasRefs: React.MutableRefObject<Map<number, HTMLCanvasElement>>;
  ocrProcessing: Set<number>;
  setOcrProcessing: React.Dispatch<React.SetStateAction<Set<number>>>;
  onMeasure?: (height: number) => void;
}

const PdfPage = React.memo(({
  pageNum, pdfDoc, zoom, isRendered, readingMode, bookId, highlights: _highlights, isBookmarked,
  onToggleBookmark, onHighlightClick, pageRefs, canvasRefs, ocrProcessing, setOcrProcessing, onMeasure
}: PdfPageProps) => {
  const [dimensions, setDimensions] = useState({ width: 600, height: 800 }); // Default
  const [textItems, setTextItems] = useState<any[]>([]);
  const renderTaskRef = useRef<any>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRendered) return;
    let active = true;
    const initPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom });
        if (active) {
          setDimensions({ width: viewport.width, height: viewport.height });
          onMeasure?.(viewport.height);
        }
      } catch (e) {
        console.error("Failed to init page", e);
      }
    };
    initPage();
    return () => { active = false; };
  }, [pdfDoc, pageNum, zoom, isRendered]);

  useEffect(() => {
    if (!isRendered) return;
    
    let active = true;
    let ocrTimeout: any = null;
    let tesseractWorker: Tesseract.Worker | null = null;
    
    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: zoom });
        
        const canvas = canvasRefs.current.get(pageNum);
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = viewport.width * pixelRatio;
        canvas.height = viewport.height * pixelRatio;
        
        // Cancel previous render
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const renderContext = { 
          canvasContext: context, 
          viewport: viewport,
          transform: [pixelRatio, 0, 0, pixelRatio, 0, 0]
        };
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
              // Ajuste fino para a altura da linha e topo da bounding box
              // Multiplicar o fontSize por um fator pode ajudar a centralizar a fonte invisivel
              const adjustedHeight = fontSize * 1.05; 
              return {
                str: item.str + (item.hasEOL ? ' ' : ''), // Usar espaço em vez de quebra de linha
                left: x,
                top: y - (fontSize * 0.85),
                width: (item.width * viewport.scale) + (item.hasEOL ? fontSize * 0.5 : 0),
                height: adjustedHeight,
                fontSize: fontSize,
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
            const rawWords = JSON.parse(cache.word_boxes);
            const isNormalized = rawWords[0]?.isNormalized;
            
            const scaledWords = rawWords.map((w: any) => ({
              ...w,
              left: isNormalized ? w.left * viewport.scale : w.left,
              top: isNormalized ? w.top * viewport.scale : w.top,
              width: isNormalized ? w.width * viewport.scale : w.width,
              height: isNormalized ? w.height * viewport.scale : w.height,
              fontSize: isNormalized ? w.height * viewport.scale * 0.9 : w.height * 0.9
            }));
            setTextItems(scaledWords);
          } else if (!ocrProcessing.has(pageNum)) {
            // Trigger OCR with a debounce to prevent spawning workers while scrolling rapidly
            ocrTimeout = setTimeout(async () => {
              if (!active) return;
              setOcrProcessing(prev => new Set(prev).add(pageNum));
              
              try {
                const imgData = canvas.toDataURL('image/png');
                
                tesseractWorker = await Tesseract.createWorker('por');
                if (!active) {
                  await tesseractWorker.terminate();
                  return;
                }
                
                const result = await tesseractWorker.recognize(imgData);
                await tesseractWorker.terminate();
                tesseractWorker = null;
                
                if (!active) return;
                
                const rawWords = (result.data as any).words || [];
                const words = rawWords.map((w: any) => ({
                  isNormalized: true,
                  str: w.text,
                  left: w.bbox.x0 / viewport.scale,
                  top: w.bbox.y0 / viewport.scale,
                  width: (w.bbox.x1 - w.bbox.x0) / viewport.scale,
                  height: (w.bbox.y1 - w.bbox.y0) / viewport.scale
                }));
                
                const scaledWords = words.map((w: any) => ({
                  ...w,
                  left: w.left * viewport.scale,
                  top: w.top * viewport.scale,
                  width: w.width * viewport.scale,
                  height: w.height * viewport.scale,
                  fontSize: w.height * viewport.scale * 0.9
                }));
                
                setTextItems(scaledWords);
                await window.api.library.saveOcrCache({
                  book_id: bookId,
                  page_number: pageNum,
                  text_content: result.data.text,
                  word_boxes: JSON.stringify(words)
                });
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
            }, 1000); // Wait 1s before starting OCR
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
      if (ocrTimeout) clearTimeout(ocrTimeout);
      if (tesseractWorker) {
        tesseractWorker.terminate().catch(() => {});
      }
    };
  }, [isRendered, pdfDoc, pageNum, zoom, bookId]); // Intentionally omitting ocrProcessing and setOcrProcessing to prevent loops

  useEffect(() => {
    if (!isRendered || !textLayerRef.current || textItems.length === 0) return;
    
    // Escala matematicamente o texto do navegador para caber EXATAMENTE
    // na largura física do texto desenhado no Canvas (técnica oficial do PDF.js)
    const spans = textLayerRef.current.querySelectorAll('span');
    spans.forEach(span => {
      const targetWidth = parseFloat(span.getAttribute('data-target-width') || '0');
      const naturalWidth = span.getBoundingClientRect().width;
      if (naturalWidth > 0 && targetWidth > 0) {
        const scale = targetWidth / naturalWidth;
        span.style.transform = `scaleX(${scale})`;
      }
    });
  }, [textItems, zoom, isRendered]);

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
          
          <div className="pdf-text-layer" ref={textLayerRef}>
            {textItems.map((item, idx) => {
              const targetWidth = item.width;
              return (
                <span 
                  key={idx}
                  data-target-width={targetWidth}
                  style={{
                    position: 'absolute',
                    left: item.left,
                    top: item.top,
                    height: item.height,
                    fontSize: item.fontSize,
                    lineHeight: 1.1,
                    fontFamily: 'sans-serif',
                    whiteSpace: 'pre',
                    color: 'transparent',
                    transformOrigin: 'left bottom',
                  }}
                >
                  {item.str}
                </span>
              );
            })}
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

                  const isDarkMode = readingMode === 'dark' || readingMode === 'dim' || readingMode === 'nord' || readingMode === 'high-contrast' || readingMode === 'midnight';

                  return (
                    <div 
                      key={`${i}-${j}`}
                      onClick={(e) => {
                        // Impedir que o clique de seleção de texto interfira
                        e.stopPropagation();
                        // Enviar também as coordenadas do clique para posicionar o modal
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        onHighlightClick(h, rect);
                      }}
                      className="cursor-pointer transition-opacity hover:opacity-75"
                      style={{
                        position: 'absolute',
                        left: `${r.left * 100}%`,
                        top: `${r.top * 100}%`,
                        width: `${r.width * 100}%`,
                        height: `${r.height * 100}%`,
                        backgroundColor: colorHex,
                        opacity: isDarkMode ? 0.35 : 0.45,
                        mixBlendMode: isDarkMode ? 'screen' : 'multiply',
                        borderRadius: '2px',
                        pointerEvents: 'auto'
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
