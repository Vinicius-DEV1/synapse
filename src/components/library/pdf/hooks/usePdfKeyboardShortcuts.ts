import { useEffect } from 'react';

interface UsePdfKeyboardShortcutsProps {
  showSearch: boolean;
  showAnnotations: boolean;
  currentPage: number;
  setShowSearch: React.Dispatch<React.SetStateAction<boolean>>;
  setShowAnnotations: React.Dispatch<React.SetStateAction<boolean>>;
  onBack: () => void;
  toggleBookmark: (page: number) => void;
  cycleReadingMode: () => void;
  handleZoom: (updater: number | ((prev: number) => number)) => void;
  fitToWidth?: () => void;
  toggleFullScreen?: () => void;
}

export function usePdfKeyboardShortcuts({
  showSearch,
  showAnnotations,
  currentPage,
  setShowSearch,
  setShowAnnotations,
  onBack,
  toggleBookmark,
  cycleReadingMode,
  handleZoom,
  fitToWidth,
  toggleFullScreen,
}: UsePdfKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      } else if (
        (e.key === 'f' || e.key === 'F') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !isInput &&
        toggleFullScreen
      ) {
        // Toggle full screen reading mode with 'F' without double-click text selection conflicts
        e.preventDefault();
        toggleFullScreen();
      } else if (e.key === 'Escape') {
        if (showSearch) setShowSearch(false);
        else if (showAnnotations) setShowAnnotations(false);
        else onBack();
      } else if (e.key === 'b' && !e.ctrlKey && !e.metaKey && !isInput) {
        toggleBookmark(currentPage);
      } else if (e.key === 's' && !e.ctrlKey && !e.metaKey && !isInput) {
        setShowAnnotations((prev) => !prev);
      } else if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !isInput) {
        cycleReadingMode();
      } else if ((e.key === 'w' || e.key === 'W') && !e.ctrlKey && !e.metaKey && !isInput && fitToWidth) {
        e.preventDefault();
        fitToWidth();
      } else if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoom((z) => Math.min(3, z + 0.25));
      } else if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        handleZoom((z) => Math.max(0.5, z - 0.25));
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        handleZoom(1.0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showSearch,
    showAnnotations,
    currentPage,
    handleZoom,
    fitToWidth,
    onBack,
    toggleBookmark,
    cycleReadingMode,
    setShowSearch,
    setShowAnnotations,
    toggleFullScreen,
  ]);
}
