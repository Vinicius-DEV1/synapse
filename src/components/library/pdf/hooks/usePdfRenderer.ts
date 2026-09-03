import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { LibraryBook } from '../../../../types';
import { PdfDimensionCache } from '../services/pdfDimensionCache';

interface UsePdfRendererProps {
  totalPages: number;
  loading: boolean;
  book: LibraryBook;
  onUpdateBook: (updates: Partial<LibraryBook>) => void;
  pdfDoc: PDFDocumentProxy | null;
}

export function usePdfRenderer({
  totalPages,
  loading,
  book,
  onUpdateBook,
  pdfDoc,
}: UsePdfRendererProps) {
  const initialPage = useMemo(() => {
    return typeof book.last_read_page === 'number'
      ? book.last_read_page
      : parseInt(String(book.last_read_page || 1), 10) || 1;
  }, [book.id]); // Stable baseline on book switch

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [zoom, setZoom] = useState(1.0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [virtualWindow, setVirtualWindow] = useState<{ start: number; end: number }>({
    start: Math.max(1, initialPage - 2),
    end: Math.min(Math.max(1, totalPages), initialPage + 2),
  });

  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());

  const PAGE_GAP = 16;
  const dimensionCache = useRef(new PdfDimensionCache());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredInitialPosition = useRef(false);
  const currentPageRef = useRef(currentPage);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // Pre-warm dimension cache from page 1 when PDF is loaded
  useEffect(() => {
    if (!pdfDoc || typeof pdfDoc.getPage !== 'function') return;
    let active = true;

    pdfDoc.getPage(1).then((page) => {
      if (!active) return;
      const viewport = page.getViewport({ scale: 1.0 });
      dimensionCache.current.setBaseline(viewport.width, viewport.height);
      dimensionCache.current.setPageDimension(1, viewport.width, viewport.height);
    }).catch((err) => {
      console.warn('Failed to pre-warm dimension cache from page 1:', err);
    });

    return () => {
      active = false;
    };
  }, [pdfDoc]);

  const getPageHeight = useCallback(
    (pageNum: number) => {
      return dimensionCache.current.getPageHeight(pageNum, zoom);
    },
    [zoom]
  );

  const getPageOffset = useCallback(
    (targetPage: number) => {
      return dimensionCache.current.getPageOffset(targetPage, zoom, PAGE_GAP);
    },
    [zoom]
  );

  // Smooth centered zoom without fighting user scroll
  const handleZoom = useCallback((updater: number | ((z: number) => number)) => {
    setZoom((prevZoom) => {
      const nextZoom = typeof updater === 'function' ? updater(prevZoom) : updater;
      const clampedZoom = Math.min(3, Math.max(0.5, nextZoom));
      if (clampedZoom === prevZoom) return prevZoom;

      const el = scrollRef.current;
      if (el) {
        // Preserve relative center point
        const centerOffset = el.scrollTop + el.clientHeight / 2;
        const scrollHeight = el.scrollHeight;
        const scrollRatio = scrollHeight > 0 ? centerOffset / scrollHeight : 0;

        requestAnimationFrame(() => {
          if (!scrollRef.current) return;
          const currentEl = scrollRef.current;
          const newCenterOffset = scrollRatio * currentEl.scrollHeight;
          currentEl.scrollTop = Math.max(0, newCenterOffset - currentEl.clientHeight / 2);
        });
      }

      return clampedZoom;
    });
  }, []);

  // Wheel zoom with Ctrl key
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))));
        } else {
          handleZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))));
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleZoom, loading]);

  // Recalculate virtual window and track visible page on scroll
  useEffect(() => {
    if (!scrollRef.current || totalPages === 0 || loading) return;
    const BUFFER = 2;

    const recalculate = () => {
      const container = scrollRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;

      let accum = 0;
      let firstVisible = 1;
      for (let i = 1; i <= totalPages; i++) {
        const h = dimensionCache.current.getPageHeight(i, zoom) + PAGE_GAP;
        if (accum + h > scrollTop) {
          firstVisible = i;
          break;
        }
        accum += h;
      }

      let lastVisible = firstVisible;
      let visibleAccum = accum;
      for (let i = firstVisible; i <= totalPages; i++) {
        lastVisible = i;
        visibleAccum += dimensionCache.current.getPageHeight(i, zoom) + PAGE_GAP;
        if (visibleAccum > scrollTop + viewportHeight) break;
      }

      const windowStart = Math.max(1, firstVisible - BUFFER);
      const windowEnd = Math.min(totalPages, lastVisible + BUFFER);

      setVirtualWindow((prev) => {
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

      if (firstVisible !== currentPageRef.current) {
        setCurrentPage(firstVisible);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          onUpdateBook({
            id: book.id,
            last_read_page: firstVisible,
            last_read_at: new Date().toISOString(),
          });
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
    return () => {
      container.removeEventListener('scroll', onScroll);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [totalPages, loading, book.id, zoom, onUpdateBook]);

  // Restore initial scroll position ONCE when document is ready
  useEffect(() => {
    if (!loading && pdfDoc && totalPages > 0 && !hasRestoredInitialPosition.current) {
      hasRestoredInitialPosition.current = true;
      if (initialPage > 1) {
        // Allow DOM layout to complete before initial scroll alignment
        requestAnimationFrame(() => {
          const offset = dimensionCache.current.getPageOffset(initialPage, zoom, PAGE_GAP);
          if (scrollRef.current) {
            scrollRef.current.scrollTop = offset;
          }
        });
      }
    }
  }, [loading, pdfDoc, totalPages, initialPage, zoom]);

  const scrollToPage = useCallback(
    (pageNum: number, smooth = true) => {
      const clampedPage = Math.max(1, Math.min(totalPages, pageNum));
      const offset = dimensionCache.current.getPageOffset(clampedPage, zoom, PAGE_GAP);
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: offset,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
      setCurrentPage(clampedPage);
    },
    [totalPages, zoom]
  );

  return {
    scrollRef,
    zoom,
    setZoom,
    handleZoom,
    currentPage,
    setCurrentPage,
    scrollToPage,
    virtualWindow,
    renderedPages,
    dimensionCache,
    getPageHeight,
    getPageOffset,
    PAGE_GAP,
  };
}
