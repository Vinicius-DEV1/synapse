import { useCallback, useEffect, useRef } from 'react';
import { useStoreDispatch, useStoreSelector } from '../../store/useStore';

export function useAiSidebarResize() {
  const width = useStoreSelector((s) => s.aiSidebarWidth);
  const dispatch = useStoreDispatch();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const startX = e.clientX;
    const startWidth = width;
    let latestWidth = startWidth;
    let rafId: number | null = null;

    const applyVisualWidth = () => {
      rafId = null;
      if (containerRef.current) {
        containerRef.current.style.width = `${latestWidth}px`;
      }
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = startX - moveEvent.clientX;
      let newWidth = startWidth + deltaX;

      if (newWidth < 300) newWidth = 300;
      if (newWidth > window.innerWidth * 0.8) newWidth = window.innerWidth * 0.8;

      latestWidth = Math.round(newWidth);
      if (rafId === null) {
        rafId = requestAnimationFrame(applyVisualWidth);
      }
    };

    const stopResize = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleMouseUp);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      cleanupRef.current = null;
    };

    const handleMouseUp = () => {
      stopResize();
      if (latestWidth !== startWidth) {
        dispatch({ type: 'SET_AI_SIDEBAR_WIDTH', width: latestWidth });
      }
    };

    cleanupRef.current = stopResize;

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleMouseUp);
  }, [width, dispatch]);

  const handleResetWidth = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.style.width = '340px';
    }
    dispatch({ type: 'SET_AI_SIDEBAR_WIDTH', width: 340 });
  }, [dispatch]);

  return {
    width,
    containerRef,
    handleMouseDown,
    handleResetWidth,
  };
}
