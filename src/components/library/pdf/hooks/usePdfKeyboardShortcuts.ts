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
}: UsePdfKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (showSearch) setShowSearch(false);
        else if (showAnnotations) setShowAnnotations(false);
        else onBack();
      } else if (e.key === 'b' && !e.ctrlKey && !e.metaKey && e.target === document.body) {
        toggleBookmark(currentPage);
      } else if (e.key === 's' && !e.ctrlKey && !e.metaKey && e.target === document.body) {
        setShowAnnotations((prev) => !prev);
      } else if (e.key === 'm' && !e.ctrlKey && !e.metaKey && e.target === document.body) {
        cycleReadingMode();
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
    onBack,
    toggleBookmark,
    cycleReadingMode,
    setShowSearch,
    setShowAnnotations,
  ]);
}
