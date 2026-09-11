import { useState, useEffect, useCallback } from 'react';

export function useVideoControls(
  isPlaying: boolean,
  containerRef: React.RefObject<HTMLDivElement>,
  isDictOpen: boolean
) {
  const [showControls, setShowControls] = useState(true);
  const [isHoveringControls, setIsHoveringControls] = useState(false);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let lastX = -1;
    let lastY = -1;

    const startTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isPlaying && !isDictOpen) {
          setShowControls(false);
        }
      }, 3500);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (lastX === e.clientX && lastY === e.clientY) return;
      lastX = e.clientX;
      lastY = e.clientY;
      
      setShowControls(true);
      startTimer();
    };

    const handleMouseLeave = () => {
      if (isPlaying && !isDictOpen) setShowControls(false);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }
    
    // Initial start or when dependencies change
    startTimer();
    
    return () => {
      clearTimeout(timeout);
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [isPlaying, isDictOpen, containerRef, isHoveringControls]);

  // If the user rests the mouse on controls while it was hiding, keep it shown
  useEffect(() => {
    if (isHoveringControls) {
      setShowControls(true);
    }
  }, [isHoveringControls]);

  return { 
    showControls, 
    setShowControls, 
    setIsHoveringControls, 
    resetControls: resetControlsTimeout 
  };
}
