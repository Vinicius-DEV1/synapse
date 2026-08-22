import { useState, useRef, useEffect } from 'react';
import { 
  getReadingProgress, 
  saveReadingProgress, 
  addBookmark, 
  removeBookmark,
  updateBookmarkLabel
} from '../../../utils/reading-progress';
import type { Bookmark as BookmarkType, ReadingProgressData } from '../../../utils/reading-progress';

export function useFileReadingProgress(itemId: string, isText: boolean, textContent: string) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);
  const progressPercentRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [showResumePrompt, setShowResumePrompt] = useState<boolean>(false);
  const [savedProgressData, setSavedProgressData] = useState<ReadingProgressData | null>(null);
  const [showBookmarksMenu, setShowBookmarksMenu] = useState<boolean>(false);
  const [newBookmarkLabel, setNewBookmarkLabel] = useState<string>('');
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [editingBmId, setEditingBmId] = useState<string | null>(null);
  const [editingBmText, setEditingBmText] = useState<string>('');
  const [activeBookmarkToast, setActiveBookmarkToast] = useState<string | null>(null);

  // Load saved reading progress and bookmarks on text ready
  useEffect(() => {
    if (textContent && isText) {
      const saved = getReadingProgress(itemId);
      if (saved) {
        setBookmarks(saved.bookmarks || []);
        if (saved.percentage > 5 && saved.percentage < 98) {
          setSavedProgressData(saved);
          setShowResumePrompt(true);
        }
      }
    }
  }, [textContent, itemId, isText]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll <= 0) return;

    const pct = Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100)));
    progressPercentRef.current = pct;
    
    // Update progress bar DOM directly to avoid React render overhead
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${pct}%`;
    }
    if (progressTextRef.current) {
      progressTextRef.current.textContent = `${pct}% lido`;
    }

    // Throttling: Persist progress to localStorage at most once every 500ms
    if (!saveTimeoutRef.current) {
      saveTimeoutRef.current = setTimeout(() => {
        saveReadingProgress(itemId, { scrollTop, percentage: pct, scrollHeight });
        saveTimeoutRef.current = null;
      }, 500);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleResumeReading = () => {
    if (savedProgressData && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: savedProgressData.scrollTop,
        behavior: 'smooth'
      });
      setShowResumePrompt(false);
    }
  };

  const handleAddBookmark = (customLabel?: string) => {
    if (!scrollContainerRef.current) return;
    const scrollTop = scrollContainerRef.current.scrollTop;
    const autoName = `Marcador ${bookmarks.length + 1} (${progressPercentRef.current}%)`;
    const label = customLabel || newBookmarkLabel.trim() || autoName;
    const bm = addBookmark(itemId, label, scrollTop);
    if (bm) {
      setBookmarks(prev => [...prev, bm]);
      setNewBookmarkLabel('');
      setActiveBookmarkToast(`Marcador salvo: ${bm.label}`);
      setTimeout(() => setActiveBookmarkToast(null), 2500);
    }
  };

  const handleStartRenameBookmark = (bm: BookmarkType, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBmId(bm.id);
    setEditingBmText(bm.label);
  };

  const handleSaveRenameBookmark = (bmId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingBmText.trim()) {
      updateBookmarkLabel(itemId, bmId, editingBmText.trim());
      setBookmarks(prev => prev.map(b => b.id === bmId ? { ...b, label: editingBmText.trim() } : b));
    }
    setEditingBmId(null);
  };

  const handleRemoveBookmark = (bmId: string) => {
    removeBookmark(itemId, bmId);
    setBookmarks(prev => prev.filter(b => b.id !== bmId));
  };

  const handleJumpToBookmark = (targetScrollTop: number, label?: string) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
      setShowBookmarksMenu(false);
      if (label) {
        setActiveBookmarkToast(label);
        setTimeout(() => setActiveBookmarkToast(null), 2500);
      }
    }
  };

  return {
    scrollContainerRef,
    progressBarRef,
    progressTextRef,
    progressPercentRef,
    showResumePrompt,
    setShowResumePrompt,
    savedProgressData,
    showBookmarksMenu,
    setShowBookmarksMenu,
    newBookmarkLabel,
    setNewBookmarkLabel,
    bookmarks,
    editingBmId,
    editingBmText,
    setEditingBmText,
    activeBookmarkToast,
    handleScroll,
    handleResumeReading,
    handleAddBookmark,
    handleStartRenameBookmark,
    handleSaveRenameBookmark,
    handleRemoveBookmark,
    handleJumpToBookmark
  };
}
