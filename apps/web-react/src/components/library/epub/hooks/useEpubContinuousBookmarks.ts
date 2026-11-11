import { useEffect, useCallback, useRef } from 'react';
import { useEpub } from '../EpubContext';
import { triggerToast } from '../../../ui/ToastContext';

const INLINE_BOOKMARK_CSS = `
.epub-inline-bookmark-container {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  vertical-align: middle !important;
  margin-left: 8px !important;
  line-height: 1 !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  position: relative !important;
}

/* Active Satin Ribbon (Lacinho clássico de caderno ao fim da linha) */
.epub-inline-bookmark {
  display: inline-block !important;
  position: relative !important;
  width: 14px !important;
  height: 22px !important;
  cursor: pointer !important;
  background: linear-gradient(180deg, #f43f5e 0%, #e11d48 50%, #be123c 100%) !important;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%) !important;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4)) !important;
  transition: transform 0.15s ease-out, filter 0.15s ease-out !important;
  z-index: 10 !important;
}

.epub-inline-bookmark:hover {
  transform: scale(1.22) translateY(-1px) !important;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.55)) !important;
}

/* Specular satin reflection line */
.epub-inline-bookmark::before {
  content: "" !important;
  position: absolute !important;
  top: 0 !important;
  left: 1.5px !important;
  width: 1.5px !important;
  bottom: 0 !important;
  background: rgba(255, 255, 255, 0.45) !important;
  pointer-events: none !important;
}

/* Top fold binding bar */
.epub-inline-bookmark::after {
  content: "" !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: 2.5px !important;
  background: rgba(136, 19, 55, 0.9) !important;
  border-radius: 1px 1px 0 0 !important;
}

/* Ghost Ribbon on Hover (Fantasma sutil ao fim da linha) */
.epub-inline-bookmark-ghost {
  display: inline-block !important;
  position: relative !important;
  width: 13px !important;
  height: 20px !important;
  cursor: pointer !important;
  opacity: 0 !important;
  background: linear-gradient(180deg, rgba(244, 63, 94, 0.35) 0%, rgba(225, 29, 72, 0.55) 100%) !important;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%) !important;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2)) !important;
  transition: opacity 0.2s ease, transform 0.15s ease !important;
  z-index: 10 !important;
}

/* Reveal ghost ribbon when hovering paragraph or block */
p:hover > .epub-inline-bookmark-container > .epub-inline-bookmark-ghost,
blockquote:hover > .epub-inline-bookmark-container > .epub-inline-bookmark-ghost,
h1:hover > .epub-inline-bookmark-container > .epub-inline-bookmark-ghost,
h2:hover > .epub-inline-bookmark-container > .epub-inline-bookmark-ghost,
h3:hover > .epub-inline-bookmark-container > .epub-inline-bookmark-ghost,
h4:hover > .epub-inline-bookmark-container > .epub-inline-bookmark-ghost,
h5:hover > .epub-inline-bookmark-container > .epub-inline-bookmark-ghost,
h6:hover > .epub-inline-bookmark-container > .epub-inline-bookmark-ghost,
li:hover > .epub-inline-bookmark-container > .epub-inline-bookmark-ghost {
  opacity: 0.45 !important;
}

.epub-inline-bookmark-ghost:hover {
  opacity: 1 !important;
  transform: scale(1.2) translateY(-1px) !important;
}
`;

function isCfiMatch(bookmarkCfi: string, blockCfi: string): boolean {
  if (bookmarkCfi === blockCfi) return true;
  const cleanBm = bookmarkCfi.trim();
  const cleanBlock = blockCfi.trim();
  if (cleanBm === cleanBlock) return true;

  // Clean trailing offsets to compare node bases
  const bmBase = cleanBm.replace(/:\d+\)?$/, ')').replace(/\)$/, '');
  const blockBase = cleanBlock.replace(/:\d+\)?$/, ')').replace(/\)$/, '');
  if (bmBase && blockBase && (bmBase === blockBase || cleanBm.startsWith(blockBase))) {
    return true;
  }
  return false;
}

export function useEpubContinuousBookmarks() {
  const {
    book,
    rendition,
    bookmarks,
    setBookmarks,
    currentPage,
    scrollMode,
  } = useEpub();

  const syncScheduledRef = useRef<number | null>(null);
  const currentPageRef = useRef<number>(currentPage);
  currentPageRef.current = currentPage;

  const handleGhostClick = useCallback(async (cfi: string) => {
    if (!window.api?.library) return;
    try {
      const pageNum = currentPageRef.current > 0 ? currentPageRef.current : 1;
      const bm = await window.api.library.createBookmark({
        book_id: book.id,
        page_number: pageNum,
        label: cfi,
      });
      setBookmarks(prev => [...prev, bm]);
      triggerToast('Linha marcada', 'success', 1500);
    } catch (err) {
      console.error('[useEpubContinuousBookmarks] Failed to create bookmark:', err);
    }
  }, [book.id, setBookmarks]);

  const handleActiveClick = useCallback(async (bmId: string) => {
    if (!window.api?.library) return;
    try {
      await window.api.library.deleteBookmark(bmId);
      setBookmarks(prev => prev.filter(b => b.id !== bmId));
      triggerToast('Marcador removido', 'info', 1500);
    } catch (err) {
      console.error('[useEpubContinuousBookmarks] Failed to delete bookmark:', err);
    }
  }, [setBookmarks]);

  const syncBookmarks = useCallback(() => {
    if (!rendition) return;

    type ContentWithCfi = {
      document?: Document;
      cfiFromNode?: (node: Node, ignore?: string) => string;
    };

    const contents = (rendition as unknown as { getContents?: () => ContentWithCfi[] }).getContents?.();
    if (!contents || !contents.length) return;

    contents.forEach(content => {
      const doc = content.document;
      if (!doc || !doc.body) return;

      // In paginated mode, cleanup all continuous ribbons and styles
      if (!scrollMode) {
        doc.querySelectorAll('.epub-inline-bookmark-container').forEach(el => el.remove());
        doc.getElementById('epub-inline-bookmark-styles')?.remove();
        return;
      }

      // Ensure inline styles are injected
      if (!doc.getElementById('epub-inline-bookmark-styles')) {
        const style = doc.createElement('style');
        style.id = 'epub-inline-bookmark-styles';
        style.innerHTML = INLINE_BOOKMARK_CSS;
        doc.head.appendChild(style);
      }

      const blocks = doc.querySelectorAll<HTMLElement>('p, blockquote, h1, h2, h3, h4, h5, h6, li');
      blocks.forEach(block => {
        const text = block.textContent?.trim() || '';
        // Skip empty spacer tags
        if (text.length < 2) return;

        let blockCfi = '';
        try {
          blockCfi = content.cfiFromNode ? content.cfiFromNode(block, 'epub-inline-bookmark-container') : '';
        } catch {
          // Ignore CFI conversion edge-case
        }
        if (!blockCfi) return;

        const matchedBm = bookmarks.find(b => isCfiMatch(b.label, blockCfi));
        const expectedState = matchedBm ? matchedBm.id : 'ghost';

        let container = block.querySelector<HTMLElement>(':scope > .epub-inline-bookmark-container');
        if (container && container.dataset.state === expectedState) {
          // Already in exact desired state, avoid DOM manipulation
          return;
        }

        if (!container) {
          container = doc.createElement('span');
          container.className = 'epub-inline-bookmark-container';
          block.appendChild(container);
        }

        container.dataset.state = expectedState;
        container.innerHTML = '';

        if (matchedBm) {
          const ribbon = doc.createElement('span');
          ribbon.className = 'epub-inline-bookmark';
          ribbon.title = 'Linha marcada • Clique para desmarcar';
          ribbon.setAttribute('aria-label', 'Desmarcar linha');
          ribbon.onclick = (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            handleActiveClick(matchedBm.id);
          };
          container.appendChild(ribbon);
        } else {
          const ghost = doc.createElement('span');
          ghost.className = 'epub-inline-bookmark-ghost';
          ghost.title = 'Marcar esta linha';
          ghost.setAttribute('aria-label', 'Marcar esta linha');
          ghost.onclick = (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            handleGhostClick(blockCfi);
          };
          container.appendChild(ghost);
        }
      });
    });
  }, [rendition, scrollMode, bookmarks, handleActiveClick, handleGhostClick]);

  useEffect(() => {
    if (!rendition) return;

    if (syncScheduledRef.current) {
      cancelAnimationFrame(syncScheduledRef.current);
    }

    syncScheduledRef.current = requestAnimationFrame(() => {
      syncBookmarks();
      syncScheduledRef.current = null;
    });

    let renderedTimer: ReturnType<typeof setTimeout> | null = null;
    const handleRendered = () => {
      if (renderedTimer) clearTimeout(renderedTimer);
      renderedTimer = setTimeout(() => {
        syncBookmarks();
        renderedTimer = null;
      }, 100);
    };

    rendition.on('rendered', handleRendered);

    return () => {
      if (syncScheduledRef.current) {
        cancelAnimationFrame(syncScheduledRef.current);
      }
      if (renderedTimer) {
        clearTimeout(renderedTimer);
      }
      rendition.off('rendered', handleRendered);
    };
  }, [rendition, syncBookmarks]);

  return { syncBookmarks };
}
