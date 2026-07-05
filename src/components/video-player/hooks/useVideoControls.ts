import { useState, useEffect } from 'react';

export function useVideoControls(
  isPlaying: boolean,
  containerRef: React.RefObject<HTMLDivElement>,
  isDictOpen: boolean
) {
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetControlsTimeout = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isPlaying && !isDictOpen) {
          setShowControls(false);
        }
      }, 2500);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', resetControlsTimeout);
      container.addEventListener('mouseleave', () => { if (isPlaying && !isDictOpen) setShowControls(false); });
    }
    
    resetControlsTimeout();
    return () => {
      clearTimeout(timeout);
      if (container) {
        container.removeEventListener('mousemove', resetControlsTimeout);
      }
    };
  }, [isPlaying, isDictOpen, containerRef]);

  return { showControls, setShowControls };
}
