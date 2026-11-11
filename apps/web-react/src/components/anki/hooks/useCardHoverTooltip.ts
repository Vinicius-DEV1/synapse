import { useState, useRef, useEffect, useCallback } from 'react';

export interface CardHoverState {
  id: string;
  type: 'front' | 'back';
  content: string;
  x: number;
  y: number;
}

export function useCardHoverTooltip(delayMs = 1500) {
  const [hoverState, setHoverState] = useState<CardHoverState | null>(null);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  const clearTimer = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent, id: string, type: 'front' | 'back', content: string) => {
      const x = e.clientX;
      const y = e.clientY;
      clearTimer();
      hoverTimer.current = setTimeout(() => {
        setHoverState({ id, type, content, x, y });
      }, delayMs);
    },
    [clearTimer, delayMs]
  );

  const handleMouseLeave = useCallback(() => {
    clearTimer();
    setHoverState(null);
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    hoverState,
    handleMouseEnter,
    handleMouseLeave,
    clearHover: handleMouseLeave,
  };
}
