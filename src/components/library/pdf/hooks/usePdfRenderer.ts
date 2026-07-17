import { useState, useRef, useEffect, useCallback } from 'react';
import { LibraryBook } from '../../../../types';

interface UsePdfRendererProps {
  totalPages: number;
  loading: boolean;
  book: LibraryBook;
  onUpdateBook: (updates: Partial<LibraryBook>) => void;
  pdfDoc: any;
}

export function usePdfRenderer({ totalPages, loading, book, onUpdateBook, pdfDoc }: UsePdfRendererProps) {
  const [currentPage, setCurrentPage] = useState(book.last_read_page || 1);
  const [zoom, setZoom] = useState(1.0);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [virtualWindow, setVirtualWindow] = useState<{ start: number; end: number }>({ start: 1, end: 1 });
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());

  const PAGE_GAP = 16;
  const estimatedPageHeightRef = useRef(800);
  const measuredHeights = useRef<Map<number, number>>(new Map());
  const saveTimeoutRef = useRef<any>(null);

  const getPageHeight = useCallback((pageNum: number) => {
    return measuredHeights.current.get(pageNum) || estimatedPageHeightRef.current;
  }, []);

  const getPageOffset = useCallback((targetPage: number) => {
    let offset = 0;
    for (let i = 1; i < targetPage; i++) {
      offset += getPageHeight(i) + PAGE_GAP;
    }
    return offset;
  }, [getPageHeight]);

  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const scrollRatioRef = useRef<number>(0);
  const zoomAnimRef = useRef<number>(0);

  const handleZoom = useCallback((updater: number | ((z: number) => number)) => {
    if (!scrollRef.current) {
      setZoom(updater);
      return;
    }
    const el = scrollRef.current;
    const centerOffset = el.scrollTop + (el.clientHeight / 2);
    const ratio = centerOffset / el.scrollHeight;
    scrollRatioRef.current = ratio;

    setZoom(updater);

    if (zoomAnimRef.current) cancelAnimationFrame(zoomAnimRef.current);

    const startTime = Date.now();
    let lastScrollHeight = el.scrollHeight;
    let expectedScrollTop = el.scrollTop;

    const applyScroll = () => {
      if (Date.now() - startTime < 800 && scrollRef.current) {
        const currentEl = scrollRef.current;
        if (Math.abs(currentEl.scrollTop - expectedScrollTop) > 10) return;

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

  useEffect(() => {
    if (!scrollRef.current || totalPages === 0 || loading) return;
    const BUFFER = 3;

    const recalculate = () => {
      const container = scrollRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const viewportHeight = container.clientHeight;

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
  }, [totalPages, loading, book.id, zoom, getPageHeight, getPageOffset]);

  useEffect(() => {
    if (!loading && pdfDoc && book.last_read_page > 1) {
      setTimeout(() => {
        const offset = getPageOffset(book.last_read_page);
        if (scrollRef.current) {
          scrollRef.current.scrollTop = offset;
        }
      }, 300);
    }
  }, [loading, pdfDoc, book.last_read_page, getPageOffset]);

  const scrollToPage = useCallback((pageNum: number, smooth = true) => {
    const offset = getPageOffset(pageNum);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: offset, behavior: smooth ? 'smooth' : 'auto' });
      setCurrentPage(pageNum);
    }
  }, [getPageOffset]);

  return { scrollRef, zoom, setZoom, handleZoom, currentPage, setCurrentPage, scrollToPage, virtualWindow, renderedPages, measuredHeights, getPageHeight, PAGE_GAP };
}
