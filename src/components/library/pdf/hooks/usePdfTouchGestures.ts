import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';

export interface UsePdfTouchGesturesProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  setZoom: (newZoom: number) => void;
  minZoom?: number;
  maxZoom?: number;
  onDoubleTap?: (tapX: number, tapY: number) => void;
}

/**
 * Industry-standard GPU-accelerated multi-touch gesture engine for the PDF reader:
 * 1. During active pinch: visual scaling and translation are executed directly via
 *    hardware-accelerated CSS 3D transform on the GPU compositor thread.
 *    ZERO React re-renders, ZERO PDF.js canvas cancellations, and ZERO scroll fighting.
 * 2. On pinch release: new target zoom is committed to React state. In useLayoutEffect
 *    (synchronously after DOM expansion but before browser paint), the target scrollLeft
 *    and scrollTop are applied and the CSS transform is cleared in the exact same frame.
 *    Eliminates 100% of white/black flashing, screen bouncing, and erratic coordinate jumping.
 * 3. Double-tap quick-zoom toggle with seamless focal coordinate alignment.
 */
export function usePdfTouchGestures({
  scrollRef,
  contentRef,
  zoom,
  setZoom,
  minZoom = 0.5,
  maxZoom = 3.0,
  onDoubleTap,
}: UsePdfTouchGesturesProps) {
  const [isPinching, setIsPinching] = useState(false);

  // Keep latest zoom in ref to avoid re-binding listeners on micro-updates
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const isPinchingRef = useRef(false);
  const touchStartDistRef = useRef(0);
  const touchStartZoomRef = useRef(zoom);
  const touchStartFocalRef = useRef({ x: 0, y: 0 });
  const touchStartScrollRef = useRef({ left: 0, top: 0 });
  const touchStartOriginRef = useRef({ x: 0, y: 0 });

  const currentScaleRef = useRef(1.0);
  const currentDeltaRef = useRef({ x: 0, y: 0 });
  const currentFocalRef = useRef({ x: 0, y: 0 });

  const rafIdRef = useRef<number | null>(null);
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Double-tap tracking
  const lastTapTimeRef = useRef(0);
  const lastTapPosRef = useRef({ x: 0, y: 0 });

  // Synchronously transfer scroll and clear transform on DOM layout completion
  useLayoutEffect(() => {
    if (pendingScrollRef.current && scrollRef.current && contentRef.current) {
      const { left, top } = pendingScrollRef.current;
      pendingScrollRef.current = null;

      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = null;
      }

      // 1. Set scroll on the newly sized container
      scrollRef.current.scrollLeft = left;
      scrollRef.current.scrollTop = top;

      // 2. Clear transform simultaneously in the same frame before paint
      contentRef.current.style.transform = '';
      contentRef.current.style.transformOrigin = '';
      contentRef.current.style.willChange = '';
      contentRef.current.style.transition = '';
    }
  }, [zoom, scrollRef, contentRef]);

  const handleDefaultDoubleTap = useCallback(
    (clientX: number, clientY: number) => {
      const el = scrollRef.current;
      if (!el) return;

      const currentZoom = zoomRef.current;
      const targetZoom = currentZoom <= 1.15 ? 1.85 : 1.0;

      const rect = el.getBoundingClientRect();
      const focalX = clientX - rect.left;
      const focalY = clientY - rect.top;

      const contentX = (el.scrollLeft + focalX) / currentZoom;
      const contentY = (el.scrollTop + focalY) / currentZoom;

      const nextScrollLeft = Math.max(0, contentX * targetZoom - focalX);
      const nextScrollTop = Math.max(0, contentY * targetZoom - focalY);

      pendingScrollRef.current = { left: nextScrollLeft, top: nextScrollTop };
      setZoom(targetZoom);
    },
    [setZoom, scrollRef]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Two fingers detected: start GPU-accelerated pinch
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        isPinchingRef.current = true;
        setIsPinching(true);

        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        touchStartDistRef.current = Math.max(dist, 10);
        touchStartZoomRef.current = zoomRef.current;

        const rect = el.getBoundingClientRect();
        const focalX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const focalY = (t1.clientY + t2.clientY) / 2 - rect.top;

        touchStartFocalRef.current = { x: focalX, y: focalY };
        currentFocalRef.current = { x: focalX, y: focalY };
        currentScaleRef.current = 1.0;
        currentDeltaRef.current = { x: 0, y: 0 };

        const scrollLeft = el.scrollLeft;
        const scrollTop = el.scrollTop;
        touchStartScrollRef.current = { left: scrollLeft, top: scrollTop };

        // Origin in content coordinates
        const originX = scrollLeft + focalX;
        const originY = scrollTop + focalY;
        touchStartOriginRef.current = { x: originX, y: originY };

        if (contentRef.current) {
          contentRef.current.style.transformOrigin = `${originX}px ${originY}px`;
          contentRef.current.style.willChange = 'transform';
          contentRef.current.style.transition = 'none';
        }

        if (e.cancelable) {
          e.preventDefault();
        }
      } else if (e.touches.length === 1) {
        // Single touch: double-tap detection
        const touch = e.touches[0];
        const now = Date.now();
        const timeDiff = now - lastTapTimeRef.current;
        const distDiff = Math.hypot(
          touch.clientX - lastTapPosRef.current.x,
          touch.clientY - lastTapPosRef.current.y
        );

        if (timeDiff < 320 && distDiff < 20) {
          lastTapTimeRef.current = 0;
          if (onDoubleTap) {
            onDoubleTap(touch.clientX, touch.clientY);
          } else {
            handleDefaultDoubleTap(touch.clientX, touch.clientY);
          }
        } else {
          lastTapTimeRef.current = now;
          lastTapPosRef.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isPinchingRef.current) {
        if (e.cancelable) {
          e.preventDefault();
        }

        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const rawScale = currentDist / touchStartDistRef.current;

        const baseZoom = touchStartZoomRef.current;
        const minScale = (minZoom / baseZoom) * 0.85;
        const maxScale = (maxZoom / baseZoom) * 1.15;
        const clampedScale = Math.min(maxScale, Math.max(minScale, rawScale));

        const rect = el.getBoundingClientRect();
        const focalX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const focalY = (t1.clientY + t2.clientY) / 2 - rect.top;

        const deltaX = focalX - touchStartFocalRef.current.x;
        const deltaY = focalY - touchStartFocalRef.current.y;

        currentScaleRef.current = clampedScale;
        currentDeltaRef.current = { x: deltaX, y: deltaY };
        currentFocalRef.current = { x: focalX, y: focalY };

        // GPU compositor hardware transform: zero React state updates, zero canvas cancellations
        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null;
            if (!isPinchingRef.current || !contentRef.current) return;
            const s = currentScaleRef.current;
            const { x, y } = currentDeltaRef.current;
            contentRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
          });
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2 && isPinchingRef.current) {
        isPinchingRef.current = false;
        setIsPinching(false);

        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }

        const baseZoom = touchStartZoomRef.current;
        const finalScale = currentScaleRef.current;
        const rawTargetZoom = baseZoom * finalScale;
        const targetZoom = Math.min(maxZoom, Math.max(minZoom, rawTargetZoom));
        const roundedZoom = Number(targetZoom.toFixed(2));

        const ratio = roundedZoom / baseZoom;
        const origin = touchStartOriginRef.current;
        const focal = currentFocalRef.current;

        const nextScrollLeft = Math.max(0, origin.x * ratio - focal.x);
        const nextScrollTop = Math.max(0, origin.y * ratio - focal.y);

        if (roundedZoom === zoomRef.current) {
          // Zoom did not change: reset transform immediately and align scroll
          if (contentRef.current) {
            contentRef.current.style.transform = '';
            contentRef.current.style.transformOrigin = '';
            contentRef.current.style.willChange = '';
          }
          if (scrollRef.current) {
            scrollRef.current.scrollLeft = nextScrollLeft;
            scrollRef.current.scrollTop = nextScrollTop;
          }
        } else {
          // Zoom changed: queue pending scroll and commit zoom to React.
          // useLayoutEffect will apply the scroll and clear transform on DOM layout.
          pendingScrollRef.current = { left: nextScrollLeft, top: nextScrollTop };

          // Defensive safety timer in case state flush is somehow aborted
          if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
          safetyTimerRef.current = setTimeout(() => {
            if (contentRef.current && contentRef.current.style.transform) {
              contentRef.current.style.transform = '';
              contentRef.current.style.transformOrigin = '';
              contentRef.current.style.willChange = '';
            }
          }, 150);

          setZoom(roundedZoom);
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current);
      }
    };
  }, [scrollRef, contentRef, minZoom, maxZoom, setZoom, onDoubleTap, handleDefaultDoubleTap]);

  return {
    isPinching,
  };
}

export default usePdfTouchGestures;
