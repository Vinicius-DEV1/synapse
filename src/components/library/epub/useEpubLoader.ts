import { useEffect, useRef, useState, useCallback } from 'react';
import ePub from 'epubjs';
import { useStore } from '../../../store/useStore';
import { resolveCanonicalBuffer } from '../../../services/storage/canonical-resolver';
import { useEpub } from './EpubContext';
import type { LibraryBook, LibraryHighlight, LibraryBookmark } from '../../../types';
import { createAssetEmbedder } from './utils/epubAssetManager';
import { isMobileScreen } from '../../../services/platform';

declare global {
  interface Window {
    __lastHighlightClick?: number;
  }
}

export function useEpubLoader(
  book: LibraryBook,
  viewerRef: React.RefObject<HTMLDivElement | null>,
  onUpdateBook: (updates: Partial<LibraryBook>) => void,
  setLoading: (l: boolean) => void,
  setLoadProgress: ((p: { percent: number, stage: string } | null) => void) | ((e: string | null) => void),
  setEpubError: (e: string | null) => void,
  turnPage: (direction: 'next' | 'prev', r: ePub.Rendition) => void,
  handleEpubClick: () => void,
  globalLastHighlightClickRef: React.MutableRefObject<number>
) {
  // Support both 8 and 9 arg signatures safely
  const safeSetLoadProgress = typeof setLoadProgress === 'function' && setLoadProgress.length <= 1
    ? (setLoadProgress as (p: { percent: number, stage: string } | null) => void)
    : undefined;

  const { state } = useStore();
  const isAvulso = book.author === 'Arquivo Avulso';
  const moduleName = isAvulso ? 'files' : 'library';
  const masterKey = state.moduleKeys[moduleName];

  const {
    scrollMode, setEpubBook, setRendition,
    setLocationsReady, setTotalPages,
    setHighlights, setBookmarks, setToc, setSelection, setNoteMode, 
    setShowSettings, originalFontName, setOriginalFontName,
    detectedFontSizePx, setDetectedFontSizePx
  } = useEpub();

  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearSelectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMouseDownRef = useRef<boolean>(false);
  const pendingSelectionRef = useRef<{ cfiRange: string; text: string; rect: DOMRect; context: string } | null>(null);

  // References to keep active book & rendition decoupled
  const activeBookRef = useRef<ePub.Book | null>(null);
  const activeRenditionRef = useRef<ePub.Rendition | null>(null);
  const scrollModeRef = useRef<boolean>(scrollMode);
  scrollModeRef.current = scrollMode;
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const [bookInstance, setBookInstance] = useState<ePub.Book | null>(null);
  const [assetEmbedder, setAssetEmbedder] = useState<{ embedAssetsAsDataUrls: (doc: Document, sectionUrl?: string) => Promise<void> } | null>(null);

  // ---------------------------------------------------------------------------
  // 1. Book Resource Loader: loads array buffer, creates Book instance & metadata
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let active = true;

    const loadBook = async () => {
      try {
        setLoading(true);
        if (safeSetLoadProgress) safeSetLoadProgress({ percent: 10, stage: 'downloading' });

        const arrayBuffer = await resolveCanonicalBuffer({
          moduleName,
          id: book.id,
          savedPath: book.file_path,
          driveFileId: book.drive_file_id,
          masterKey,
          extHint: 'epub',
          onUpdateSavedPath: (newPath) => onUpdateBook({ file_path: newPath, is_local: true }),
          onProgress: (percent, stage) => {
            if (active && safeSetLoadProgress) safeSetLoadProgress({ percent, stage });
          }
        });

        if (!active) return;
        if (safeSetLoadProgress) safeSetLoadProgress({ percent: 100, stage: 'rendering' });

        // Instantiate ePub.js with lazy asset embedding
        const newEpubBook = ePub(arrayBuffer, { replacements: 'none' });
        activeBookRef.current = newEpubBook;
        setEpubBook(newEpubBook);

        const embedder = createAssetEmbedder(newEpubBook);
        setAssetEmbedder(embedder);

        await newEpubBook.ready;
        if (!active) return;

        // Register spine hook: embeds assets before serialization
        const bookWithSpine = newEpubBook as unknown as {
          spine?: {
            hooks?: {
              content?: {
                register?: (fn: (doc: Document, section: unknown) => Promise<void>) => void;
              };
            };
          };
        };
        if (typeof bookWithSpine.spine?.hooks?.content?.register === 'function') {
          bookWithSpine.spine.hooks.content.register(async (doc: Document, section: unknown) => {
            const sec = section as { url?: string; href?: string } | undefined;
            await embedder.embedAssetsAsDataUrls(doc, sec?.url || sec?.href);
          });
        }

        if (book.reading_status === 'not_started') {
          onUpdateBook({ reading_status: 'reading' });
        }

        // Fetch highlights & bookmarks from persistence
        if (window.api?.library?.getHighlights) {
          window.api.library.getHighlights(book.id).then((hls: LibraryHighlight[]) => {
            if (active) setHighlights(hls);
          }).catch((err) => console.error('[EpubLoader] Failed to load highlights:', err));
        }

        if (window.api?.library?.getBookmarks) {
          window.api.library.getBookmarks(book.id).then((bms: LibraryBookmark[]) => {
            if (active) setBookmarks(bms);
          }).catch((err) => console.error('[EpubLoader] Failed to load bookmarks:', err));
        }

        // Navigation (TOC) & Metadata & Locations Generation
        if (newEpubBook.loaded?.navigation?.then) {
          newEpubBook.loaded.navigation.then(nav => {
            if (active) setToc(nav.toc);
          }).catch(err => console.debug('[EpubLoader] Navigation load error:', err));
        }

        // Auto-extract package metadata if current book is missing author or details
        if (newEpubBook.loaded?.metadata?.then) {
          newEpubBook.loaded.metadata.then(async (meta: unknown) => {
            if (!active) return;
            const m = meta as {
              creator?: string;
              title?: string;
              publisher?: string;
              pubdate?: string;
              language?: string;
            } | undefined;

            const updates: Partial<LibraryBook> = {};
            if ((!book.author || book.author === 'Desconhecido') && m?.creator) {
              updates.author = m.creator.trim();
            }
            if ((!book.publisher || book.publisher === 'Não informada') && m?.publisher) {
              updates.publisher = m.publisher.trim();
            }
            if (!book.language && m?.language) {
              updates.language = m.language.trim();
            }
            if (!book.published_year && m?.pubdate) {
              const yearMatch = m.pubdate.match(/\d{4}/);
              if (yearMatch) {
                updates.published_year = parseInt(yearMatch[0], 10);
              }
            }

            // If still missing author or publisher, pass initial snippet to AI/Web enricher
            if (!updates.author && (!book.author || book.author === 'Desconhecido')) {
              try {
                const { extractBookInitialSnippet, autoEnrichBookMetadata } = await import('../../../services/library/book-metadata-enricher');
                const snippet = await extractBookInitialSnippet(newEpubBook);
                const aiEnriched = await autoEnrichBookMetadata(book, { allowAI: true, initialSnippet: snippet });
                if (aiEnriched) {
                  Object.assign(updates, aiEnriched);
                }
              } catch (e) {
                console.debug('[EpubLoader] Snippet enrichment skipped:', e);
              }
            }

            if (Object.keys(updates).length > 0 && active) {
              onUpdateBook(updates);
            }
          }).catch(err => console.debug('[EpubLoader] Metadata load skipped:', err));
        }

        if (typeof (newEpubBook as { coverUrl?: () => Promise<string> }).coverUrl === 'function') {
          (newEpubBook as { coverUrl: () => Promise<string> }).coverUrl().then(async (url) => {
            if (url && (!book.cover_image || book.cover_image.startsWith('blob:')) && active) {
              try {
                if (url.startsWith('blob:')) {
                  const resp = await fetch(url);
                  const blob = await resp.blob();
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64 = reader.result as string;
                    if (base64 && active) {
                      onUpdateBook({ cover_image: base64 });
                    }
                  };
                  reader.readAsDataURL(blob);
                } else {
                  onUpdateBook({ cover_image: url });
                }
              } catch (e) {
                console.debug('[EpubLoader] Failed to convert cover to base64:', e);
                if (url && active) onUpdateBook({ cover_image: url });
              }
            }
          }).catch(err => console.debug('[EpubLoader] Cover extraction skipped:', err));
        }

        if (book.epub_locations) {
          try {
            newEpubBook.locations.load(book.epub_locations);
            const locationsObj = newEpubBook.locations as { total?: number };
            const total = typeof locationsObj?.total === 'number' && locationsObj.total > 0 ? locationsObj.total : 0;
            if (total > 0 && active) {
              setTotalPages(total);
              setLocationsReady(true);
            }
          } catch (e) {
            console.error('[EpubLoader] Failed to load cached locations, generating:', e);
            newEpubBook.locations.generate(1600).then((locations) => {
              if (active) {
                const total = Array.isArray(locations) ? locations.length : (newEpubBook.locations as { total?: number }).total || 0;
                if (total > 0) {
                  setTotalPages(total);
                  setLocationsReady(true);
                }
                try {
                  if (typeof newEpubBook.locations?.save === 'function') {
                    const serialized = newEpubBook.locations.save();
                    onUpdateBook({ epub_locations: serialized, total_pages: total });
                  }
                } catch (err) {
                  console.error('[EpubLoader] Failed to save generated locations:', err);
                }
              }
              return locations;
            });
          }
        } else {
          newEpubBook.locations.generate(1600).then((locations) => {
            if (active) {
              const total = Array.isArray(locations) ? locations.length : (newEpubBook.locations as { total?: number }).total || 0;
              if (total > 0) {
                setTotalPages(total);
                setLocationsReady(true);
              }
              try {
                if (typeof newEpubBook.locations?.save === 'function') {
                  const serialized = newEpubBook.locations.save();
                  onUpdateBook({ epub_locations: serialized, total_pages: total });
                }
              } catch (err) {
                console.error('[EpubLoader] Failed to save generated locations:', err);
              }
            }
            return locations;
          });
        }

        newEpubBook.ready.then(() => {
          const locationsObj = newEpubBook.locations as { total?: number };
          const total = typeof locationsObj?.total === 'number' && locationsObj.total > 0 ? locationsObj.total : 0;
          if (total > 0 && active) {
            setTotalPages(total);
            setLocationsReady(true);
            onUpdateBook({ total_pages: total });
          }
        }).catch(console.error);

        setBookInstance(newEpubBook);
      } catch (err: unknown) {
        console.error('[EpubLoader] EPUB Load Error:', err);
        if (active) {
          setEpubError(err instanceof Error ? err.message : 'Falha ao carregar EPUB');
          setLoading(false);
        }
      }
    };

    loadBook();

    return () => {
      active = false;
      if (activeRenditionRef.current) {
        try {
          if (typeof activeRenditionRef.current.destroy === 'function') {
            activeRenditionRef.current.destroy();
          }
        } catch (e) {
          console.debug('[EpubLoader] Error destroying active rendition on book unmount:', e);
        }
        activeRenditionRef.current = null;
      }
      if (activeBookRef.current) {
        try {
          if (typeof activeBookRef.current.destroy === 'function') {
            activeBookRef.current.destroy();
          }
        } catch (e) {
          console.debug('[EpubLoader] Error destroying active book on unmount:', e);
        }
        activeBookRef.current = null;
      }
      setBookInstance(null);
      setAssetEmbedder(null);
    };
  }, [book.id, book.file_path, book.drive_file_id, book.author, masterKey]);

  // Ergonomically damped scroll step for continuous reading mode
  // Directly offsets scroller.scrollTop without an asynchronous RAF lerp target,
  // preventing runaway scroll cascades when epub.js appends or trims section iframes.
  const performDampedScroll = useCallback((scroller: HTMLElement, deltaY: number, deltaMode: number) => {
    let normalizedDelta = deltaY;
    if (deltaMode === 1) {
      // DOM_DELTA_LINE: Firefox/Linux defaults to 3 lines per notch.
      // Scaling by 15px yields ~45px (~1.5 lines) instead of jarring 105px.
      normalizedDelta = deltaY * 15;
    } else if (deltaMode === 2) {
      // DOM_DELTA_PAGE
      normalizedDelta = deltaY * (scroller.clientHeight * 0.35);
    } else {
      // DOM_DELTA_PIXEL: Chromium/WebKit standard.
      // Differentiate discrete mouse wheel ticks (>= 40px) from smooth trackpad gestures.
      const isDiscreteWheelTick = Math.abs(deltaY) >= 40;
      // Damped step factor for mouse wheels: 0.38 reduces 100-120px jumps down to ~38-46px (~1.5 lines).
      // High-precision trackpads retain 0.85 for 1:1 tactile fluidity.
      normalizedDelta = isDiscreteWheelTick ? deltaY * 0.38 : deltaY * 0.85;
    }

    scroller.scrollTop += normalizedDelta;
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Rendition Renderer & Mode Switcher: handles paginated vs. continuous scroll
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!bookInstance || !viewerRef.current || !assetEmbedder) return;

    let active = true;

    // Capture the current reading position before recreating rendition
    let targetPage: string | number | undefined = book.last_read_page;
    if (activeRenditionRef.current) {
      try {
        const renditionWithLocation = activeRenditionRef.current as unknown as {
          location?: { start?: { cfi?: string } };
          currentLocation?: () => { start?: { cfi?: string } };
        };
        const currentLoc =
          renditionWithLocation.location?.start?.cfi ||
          renditionWithLocation.currentLocation?.()?.start?.cfi;
        if (currentLoc && typeof currentLoc === 'string') {
          targetPage = currentLoc;
        }
      } catch (e) {
        console.debug('[EpubLoader] Could not read CFI before switching mode:', e);
      }

      try {
        if (typeof activeRenditionRef.current.destroy === 'function') {
          activeRenditionRef.current.destroy();
        }
      } catch (e) {
        console.debug('[EpubLoader] Error destroying previous rendition:', e);
      }
      activeRenditionRef.current = null;
    }

    // Clean any previous containers from the viewer DOM
    if (viewerRef.current) {
      viewerRef.current.innerHTML = '';
    }

    // Configure Rendition with standard continuous vs. paginated managers
    const newRendition = bookInstance.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      spread: 'none',
      minSpreadWidth: 10000,
      allowScriptedContent: true,
      manager: scrollMode ? 'continuous' : 'default',
      flow: scrollMode ? 'scrolled' : 'paginated'
    });

    activeRenditionRef.current = newRendition;
    setRendition(newRendition);

    // Register asset embedding hook for section documents
    if (newRendition.hooks?.content?.register) {
      newRendition.hooks.content.register(async (contents: { document?: Document; window?: Window; section?: { url?: string; href?: string } }) => {
        const doc = contents.document;
        const win = contents.window;
        const sectionUrl = contents.section?.url || contents.section?.href;

        if (doc) {
          await assetEmbedder.embedAssetsAsDataUrls(doc, sectionUrl);

          // Prevent premature selection toolbar popping up while user is still dragging
          doc.addEventListener('mousedown', () => {
            isMouseDownRef.current = true;
            pendingSelectionRef.current = null;
          });

          const handleMouseUp = () => {
            isMouseDownRef.current = false;
            if (pendingSelectionRef.current) {
              const pending = pendingSelectionRef.current;
              pendingSelectionRef.current = null;
              if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
              selectionTimerRef.current = setTimeout(() => {
                selectionTimerRef.current = null;
                setSelection(pending);
              }, 40);
            }
          };

          doc.addEventListener('mouseup', handleMouseUp);
          win?.addEventListener('mouseup', handleMouseUp);

          // -------------------------------------------------------------------
          // Wheel & Keyboard Forwarding Bridge for Continuous Scrolling
          // -------------------------------------------------------------------
          if (scrollModeRef.current) {
            const handleWheel = (e: WheelEvent) => {
              if (!scrollModeRef.current) return;
              const scroller = viewerRef.current?.querySelector('.epub-container') as HTMLElement | null;
              if (!scroller) return;

              // Check for horizontal code/table scroll intent
              const target = e.target as HTMLElement | null;
              const codeBlock = target?.closest('pre, code, table');
              if (codeBlock && (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY))) {
                return;
              }

              if (e.deltaY !== 0) {
                e.preventDefault();
                e.stopPropagation();
                performDampedScroll(scroller, e.deltaY, e.deltaMode);
              }
            };

            doc.addEventListener('wheel', handleWheel, { passive: false });

            const handleIframeKeyDown = (e: KeyboardEvent) => {
              if (!scrollModeRef.current) return;
              const isInput =
                doc.activeElement?.tagName === 'TEXTAREA' ||
                doc.activeElement?.tagName === 'INPUT' ||
                (doc.activeElement as HTMLElement)?.isContentEditable;
              if (isInput) return;

              const scroller = viewerRef.current?.querySelector('.epub-container') as HTMLElement | null;
              if (!scroller) return;

              if (e.key === 'ArrowDown') {
                e.preventDefault();
                scroller.scrollBy({ top: 45, behavior: 'smooth' });
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                scroller.scrollBy({ top: -45, behavior: 'smooth' });
              } else if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
                e.preventDefault();
                scroller.scrollBy({ top: scroller.clientHeight * 0.75, behavior: 'smooth' });
              } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
                e.preventDefault();
                scroller.scrollBy({ top: -scroller.clientHeight * 0.75, behavior: 'smooth' });
              }
            };

            doc.addEventListener('keydown', handleIframeKeyDown);
          }
        }
      });
    }

    // Display target location
    const isValidCfiOrHref = typeof targetPage === 'string' &&
      targetPage.trim() !== '' &&
      targetPage !== '1' &&
      (targetPage.startsWith('epubcfi(') || targetPage.includes('#') || targetPage.includes('.html') || targetPage.includes('.xhtml') || targetPage.includes('/'));

    const displayPromise = isValidCfiOrHref
      ? newRendition.display(targetPage as string)
      : newRendition.display();

    displayPromise.catch((dispErr) => {
      console.warn('[EpubLoader] Error displaying target CFI, falling back to beginning:', dispErr);
      return newRendition.display();
    }).then(() => {
      if (active) setLoading(false);
    }).catch((fatalErr) => {
      console.error('[EpubLoader] Fatal display error:', fatalErr);
      if (active) setLoading(false);
    });

    // Handle text selection inside reader
    newRendition.on('selected', (cfiRange: string, contents: unknown) => {
      const cont = contents as { window: Window, document: Document, cfiBase: string };
      const windowSelection = cont.window.getSelection();
      if (!windowSelection) return;
      let text = windowSelection.toString();

      if (Date.now() - globalLastHighlightClickRef.current < 500) {
        return;
      }

      if (text && windowSelection.rangeCount > 0) {
        const range = windowSelection.getRangeAt(0).cloneRange();

        if (text.endsWith(' ') || text.endsWith('\n')) {
          text = text.trim();
          if (range.endOffset > 0) {
            try {
              range.setEnd(range.endContainer, range.endOffset - 1);
              cfiRange = new (ePub as unknown as { CFI: any }).CFI(range, cont.cfiBase).toString();
            } catch (e: unknown) {
              console.debug('[EpubLoader] Failed to adjust trimmed range for CFI:', e);
            }
          }
        }

        const rect = range.getBoundingClientRect();
        let blockNode = range.commonAncestorContainer;
        while (blockNode && blockNode.nodeType !== 1 && blockNode.parentNode) {
          blockNode = blockNode.parentNode;
        }
        const contextText = blockNode?.textContent?.trim() || text;

        if (rect.width === 0 && rect.height === 0) return;

        let offsetX = 0;
        let offsetY = 0;
        const iframe = cont.document?.defaultView?.frameElement;
        if (iframe) {
          const iframeRect = iframe.getBoundingClientRect();
          offsetX = iframeRect.left;
          offsetY = iframeRect.top;
        }

        const safeRect = {
          top: rect.top + offsetY,
          left: rect.left + offsetX,
          bottom: rect.bottom + offsetY,
          right: rect.right + offsetX,
          x: rect.x + offsetX,
          y: rect.y + offsetY,
          width: rect.width,
          height: rect.height,
          toJSON: rect.toJSON
        } as DOMRect;

        const selectionPayload = { cfiRange, text, rect: safeRect, context: contextText };

        if (isMouseDownRef.current) {
          // User is actively dragging to select phrases. Never trigger menu prematurely!
          pendingSelectionRef.current = selectionPayload;
        } else {
          // Double-click, keyboard selection, or mouse already released
          if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
          selectionTimerRef.current = setTimeout(() => {
            selectionTimerRef.current = null;
            setSelection(selectionPayload);
          }, 40);
        }
      }
    });

    const isMobileDevice = isMobileScreen() || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    newRendition.on('click', () => {
      setShowSettings(false);
      if (isMobileDevice) {
        handleEpubClick();
        return;
      }
      const lastHlClick = Math.max(globalLastHighlightClickRef.current, window.__lastHighlightClick || 0);
      if (Date.now() - lastHlClick < 500) {
        return;
      }

      // If user just finished selecting text or has a pending/scheduled selection, do not clear selection on click!
      if (pendingSelectionRef.current !== null || selectionTimerRef.current !== null) {
        return;
      }

      let hasActiveSelection = false;
      const activeContents = (newRendition as unknown as { getContents?: () => Array<{ window?: Window }> }).getContents?.();
      if (activeContents && activeContents.length > 0) {
        hasActiveSelection = activeContents.some(c => {
          const sel = c.window?.getSelection();
          return Boolean(sel && !sel.isCollapsed && sel.toString().trim().length > 0);
        });
      }
      if (!hasActiveSelection && viewerRef.current) {
        const iframes = viewerRef.current.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          try {
            const sel = iframe.contentWindow?.getSelection();
            if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
              hasActiveSelection = true;
            }
          } catch {
            // Ignore potential cross-origin access restriction
          }
        });
      }
      if (!hasActiveSelection) {
        const mainSel = window.getSelection();
        if (mainSel && !mainSel.isCollapsed && mainSel.toString().trim().length > 0) {
          hasActiveSelection = true;
        }
      }

      if (hasActiveSelection) {
        return;
      }

      if (clearSelectionTimerRef.current) clearTimeout(clearSelectionTimerRef.current);
      clearSelectionTimerRef.current = setTimeout(() => {
        clearSelectionTimerRef.current = null;
        const finalLastHlClick = Math.max(globalLastHighlightClickRef.current, window.__lastHighlightClick || 0);
        if (Date.now() - finalLastHlClick < 500) {
          return;
        }
        setSelection(null);
        setNoteMode(null);
        handleEpubClick();
      }, 120);
    });

    const handleGlobalMouseDown = () => {
      isMouseDownRef.current = true;
      pendingSelectionRef.current = null;
    };

    const handleGlobalMouseUp = () => {
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        if (pendingSelectionRef.current) {
          const pending = pendingSelectionRef.current;
          pendingSelectionRef.current = null;
          if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
          selectionTimerRef.current = setTimeout(() => {
            selectionTimerRef.current = null;
            setSelection(pending);
          }, 40);
        }
      }
    };
    window.addEventListener('mousedown', handleGlobalMouseDown);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    newRendition.on('touchstart', (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (touch) {
        touchStartXRef.current = touch.screenX;
        touchStartYRef.current = touch.screenY;
      }
    });

    newRendition.on('rendered', (_: unknown, view: unknown) => {
      const v = view as { document: Document, section?: { url?: string, href?: string }, window: Window };
      const doc = v.document;
      if (!doc) return;

      assetEmbedder.embedAssetsAsDataUrls(doc, v.section?.url || v.section?.href);

      const style = doc.createElement('style');
      style.innerHTML = `
        ::selection { background: #3b82f640; }
        ::-moz-selection { background: #3b82f640; }
        .epub-bookmark-ribbon {
          display: inline-block;
          position: absolute;
          right: 8px;
          width: 16px;
          height: 28px;
          background: linear-gradient(180deg, #f43f5e 0%, #e11d48 50%, #be123c 100%);
          clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%);
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
          cursor: pointer;
          z-index: 10;
          transition: transform 0.15s ease-out;
        }
        .epub-bookmark-ribbon:hover {
          transform: scale(1.15) translateY(-1px);
        }
      `;
      doc.head.appendChild(style);

      setTimeout(() => {
        const firstTextNode = doc.querySelector('p') || doc.body;
        if (firstTextNode) {
          const computedStyle = v.window.getComputedStyle(firstTextNode);
          const font = computedStyle.fontFamily;
          const size = computedStyle.fontSize;
          if (font && (!originalFontName || originalFontName === 'Detectando...')) {
            setOriginalFontName(font.split(',')[0].replace(/['"]/g, ''));
          }
          if (size && !detectedFontSizePx) {
            setDetectedFontSizePx(size);
          }
        }
      }, 100);
    });

    newRendition.on('touchend', (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) return;
      const touchEndX = touch.screenX;
      const touchEndY = touch.screenY;
      const touchStartX = touchStartXRef.current;
      const touchStartY = touchStartYRef.current;

      // In continuous mode, do not hijack touch for page turning
      if (scrollModeRef.current) return;

      if (touchStartX !== null && touchStartY !== null) {
        const deltaX = touchEndX - touchStartX;
        const deltaY = Math.abs(touchEndY - touchStartY);

        // Only trigger horizontal flip if movement is predominantly horizontal
        if (Math.abs(deltaX) > 50 && deltaY < 40) {
          if (deltaX > 50) {
            turnPage('prev', newRendition);
          } else if (deltaX < -50) {
            turnPage('next', newRendition);
          }
        }
      }
    });

    const viewerEl = viewerRef.current;
    const handleViewerWheel = (e: WheelEvent) => {
      if (!scrollModeRef.current) return;
      const scroller = viewerEl?.querySelector('.epub-container') as HTMLElement | null;
      if (!scroller) return;

      const target = e.target as HTMLElement | null;
      const codeBlock = target?.closest('pre, code, table');
      if (codeBlock && (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY))) {
        return;
      }

      if (e.deltaY !== 0) {
        e.preventDefault();
        e.stopPropagation();
        performDampedScroll(scroller, e.deltaY, e.deltaMode);
      }
    };

    if (viewerEl && scrollMode) {
      viewerEl.addEventListener('wheel', handleViewerWheel, { passive: false });
    }

    return () => {
      active = false;
      viewerEl?.removeEventListener('wheel', handleViewerWheel);
      window.removeEventListener('mousedown', handleGlobalMouseDown);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      if (activeRenditionRef.current === newRendition) {
        try {
          newRendition.destroy();
        } catch (e) {
          console.debug('[EpubLoader] Error destroying rendition in effect cleanup:', e);
        }
        activeRenditionRef.current = null;
      }
    };
  }, [bookInstance, scrollMode, assetEmbedder, viewerRef, performDampedScroll]);
}
