import { useEffect } from 'react';

interface UseYouTubeKeyboardShortcutsProps {
  isUsingEmbedFallback: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export function useYouTubeKeyboardShortcuts({
  isUsingEmbedFallback,
  videoRef,
  containerRef,
  onClose,
}: UseYouTubeKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          return;
        }
        e.preventDefault();
        onClose();
        return;
      }

      if (isUsingEmbedFallback) {
        return;
      }

      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
          } else {
            videoRef.current.pause();
          }
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(
            videoRef.current.duration || Infinity,
            videoRef.current.currentTime + 5
          );
        }
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (!document.fullscreenElement && containerRef.current) {
          containerRef.current.requestFullscreen().catch(() => {});
        } else if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.muted = !videoRef.current.muted;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isUsingEmbedFallback, videoRef, containerRef]);
}
