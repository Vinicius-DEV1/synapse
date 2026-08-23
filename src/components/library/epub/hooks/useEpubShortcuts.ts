import { useEffect } from 'react';

interface UseEpubShortcutsProps {
  rendition: any;
  dispatch: React.Dispatch<any>;
  isFullScreenRef: React.MutableRefObject<boolean>;
  turnPage: (direction: 'next' | 'prev') => void;
  cycleReadingMode: () => void;
  changeZoom: (delta: number) => void;
}

export function useEpubShortcuts({
  rendition,
  dispatch,
  isFullScreenRef,
  turnPage,
  cycleReadingMode,
  changeZoom,
}: UseEpubShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'INPUT' ||
        (e.target as HTMLElement)?.isContentEditable;
      if (isInput) return;

      if (e.key.toLowerCase() === 'f' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: !isFullScreenRef.current });
        if (window.api?.app?.toggleFullScreen) {
          window.api.app.toggleFullScreen();
        }
        return;
      }
      if (e.key.toLowerCase() === 'f' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: !isFullScreenRef.current });
        return;
      }

      if (e.key === 'ArrowRight') {
        if (!e.repeat) {
          e.preventDefault();
          turnPage('next');
        }
        return;
      }
      if (e.key === 'ArrowLeft') {
        if (!e.repeat) {
          e.preventDefault();
          turnPage('prev');
        }
        return;
      }

      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        cycleReadingMode();
      }
      if (e.key === '+' || e.key === '=') {
        changeZoom(10);
      }
      if (e.key === '-') {
        changeZoom(-10);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    if (rendition) {
      rendition.on('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (rendition) {
        rendition.off('keydown', handleKeyDown);
      }
    };
  }, [rendition, dispatch, isFullScreenRef, turnPage, cycleReadingMode, changeZoom]);
}
