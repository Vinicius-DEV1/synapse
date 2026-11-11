import { useCallback, useMemo } from 'react';
import { useEpub } from '../EpubContext';
import { triggerToast } from '../../../ui/ToastContext';

function getTopmostVisibleBlock(rendition: unknown): { cfi: string; existingBookmarkId?: string } | null {
  try {
    type ContentWithCfi = {
      document?: Document;
      cfiFromNode?: (node: Node, ignore?: string) => string;
    };
    const contents = (rendition as { getContents?: () => ContentWithCfi[] })?.getContents?.();
    if (!contents || !contents.length) return null;

    for (const content of contents) {
      const doc = content.document;
      if (!doc) continue;
      const iframe = doc.defaultView?.frameElement as HTMLIFrameElement | null;
      if (!iframe) continue;
      const iframeRect = iframe.getBoundingClientRect();
      if (iframeRect.bottom <= 60 || iframeRect.top >= window.innerHeight) continue;

      const blocks = doc.querySelectorAll<HTMLElement>('p, blockquote, h1, h2, h3, h4, h5, h6, li');
      for (const block of Array.from(blocks)) {
        if (!block.textContent || block.textContent.trim().length < 2) continue;
        const rect = block.getBoundingClientRect();
        const topInViewport = rect.top + iframeRect.top;
        if (topInViewport >= 40 && topInViewport < window.innerHeight * 0.75) {
          const cfi = content.cfiFromNode ? content.cfiFromNode(block, 'epub-inline-bookmark-container') : '';
          if (cfi) {
            const activeBm = block.querySelector<HTMLElement>('.epub-inline-bookmark');
            const bmId = activeBm?.getAttribute('data-bm-id') || activeBm?.dataset.bmId || undefined;
            return { cfi, existingBookmarkId: bmId };
          }
        }
      }
    }
  } catch (err) {
    console.debug('[useEpubBookmark] Error finding topmost visible block:', err);
  }
  return null;
}

export function useEpubBookmark() {
  const {
    book,
    rendition,
    bookmarks,
    setBookmarks,
    currentPage,
    scrollMode,
  } = useEpub();

  const currentCfi = rendition?.location?.start?.cfi;

  const currentBookmark = useMemo(() => {
    if (scrollMode && rendition) {
      const topBlock = getTopmostVisibleBlock(rendition);
      if (topBlock?.existingBookmarkId) {
        return bookmarks.find(b => b.id === topBlock.existingBookmarkId) || null;
      }
      if (topBlock?.cfi) {
        const found = bookmarks.find(b => b.label === topBlock.cfi || b.label.includes(topBlock.cfi.slice(0, -2)));
        if (found) return found;
      }
    }
    return bookmarks.find(b => 
      (currentCfi && b.label === currentCfi) ||
      (currentPage > 0 && b.page_number === currentPage)
    ) || null;
  }, [bookmarks, currentCfi, currentPage, rendition, scrollMode]);

  const isBookmarked = Boolean(currentBookmark);

  const toggleBookmark = useCallback(async () => {
    if (!window.api?.library) return;

    if (scrollMode && rendition) {
      const topBlock = getTopmostVisibleBlock(rendition);
      if (topBlock?.existingBookmarkId) {
        try {
          await window.api.library.deleteBookmark(topBlock.existingBookmarkId);
          setBookmarks(prev => prev.filter(b => b.id !== topBlock.existingBookmarkId));
          triggerToast('Marcador removido', 'info', 1500);
          return;
        } catch (err) {
          console.error('[useEpubBookmark] Failed to delete continuous bookmark:', err);
        }
      } else if (topBlock?.cfi) {
        const existing = bookmarks.find(b => b.label === topBlock.cfi || b.label.includes(topBlock.cfi.slice(0, -2)));
        if (existing) {
          try {
            await window.api.library.deleteBookmark(existing.id);
            setBookmarks(prev => prev.filter(b => b.id !== existing.id));
            triggerToast('Marcador removido', 'info', 1500);
            return;
          } catch (err) {
            console.error('[useEpubBookmark] Failed to delete continuous bookmark:', err);
          }
        } else {
          try {
            const bm = await window.api.library.createBookmark({
              book_id: book.id,
              page_number: currentPage > 0 ? currentPage : 1,
              label: topBlock.cfi,
            });
            setBookmarks(prev => [...prev, bm]);
            triggerToast('Linha marcada', 'success', 1500);
            return;
          } catch (err) {
            console.error('[useEpubBookmark] Failed to create continuous bookmark:', err);
          }
        }
      }
    }

    if (currentBookmark) {
      try {
        await window.api.library.deleteBookmark(currentBookmark.id);
        setBookmarks(prev => prev.filter(b => b.id !== currentBookmark.id));
        triggerToast('Marcador removido', 'info', 1500);
      } catch (err) {
        console.error('[useEpubBookmark] Failed to delete bookmark:', err);
      }
    } else {
      try {
        const cfiToSave = currentCfi || (currentPage > 0 ? `epubcfi(/6/2[page-${currentPage}]!)` : '');
        if (!cfiToSave && currentPage <= 0) return;

        const bm = await window.api.library.createBookmark({
          book_id: book.id,
          page_number: currentPage > 0 ? currentPage : 1,
          label: cfiToSave,
        });
        setBookmarks(prev => [...prev, bm]);
        triggerToast('Página marcada', 'success', 1500);
      } catch (err) {
        console.error('[useEpubBookmark] Failed to create bookmark:', err);
      }
    }
  }, [book.id, currentBookmark, currentCfi, currentPage, setBookmarks, scrollMode, rendition, bookmarks]);

  return {
    isBookmarked,
    currentBookmark,
    toggleBookmark,
    scrollMode,
    currentPage,
  };
}
