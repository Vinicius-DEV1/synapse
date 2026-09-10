import { useEffect, useRef } from 'react';
import ePub from 'epubjs';
import { useStore } from '../../../store/useStore';
import { resolveCanonicalBuffer } from '../../../services/storage/canonical-resolver';
import { useEpub } from './EpubContext';
import type { LibraryBook, LibraryHighlight, LibraryBookmark } from '../../../types';
import { createAssetEmbedder } from './utils/epubAssetManager';

declare global {
  interface Window {
    __lastHighlightClick?: number;
  }
}

export function useEpubLoader(
  book: LibraryBook,
  viewerRef: React.RefObject<HTMLDivElement>,
  onUpdateBook: (updates: Partial<LibraryBook>) => void,
  setLoading: (l: boolean) => void,
  setLoadProgress: (p: { percent: number, stage: string } | null) => void,
  setEpubError: (e: string | null) => void,
  turnPage: (direction: 'next' | 'prev', r: ePub.Rendition) => void,
  handleEpubClick: () => void,
  globalLastHighlightClickRef: React.MutableRefObject<number>
) {
  const { state } = useStore();
  const isAvulso = book.author === 'Arquivo Avulso';
  const moduleName = isAvulso ? 'files' : 'library';
  const masterKey = state.moduleKeys[moduleName];
  
  const {
    scrollMode, setEpubBook, epubBook, setRendition,
    setLocationsReady, setTotalPages, setProgress, setCurrentPage,
    setHighlights, setBookmarks, setToc, setSelection, setNoteMode, 
    setShowSettings, originalFontName, setOriginalFontName,
    detectedFontSizePx, setDetectedFontSizePx
  } = useEpub();

  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearSelectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    const loadEpub = async () => {
      try {
        setLoading(true);
        const arrayBuffer = await resolveCanonicalBuffer({
          moduleName,
          id: book.id,
          savedPath: book.file_path,
          driveFileId: book.drive_file_id,
          masterKey,
          extHint: 'epub',
          onUpdateSavedPath: (newPath) => onUpdateBook({ file_path: newPath, is_local: true }),
          onProgress: (percent, stage) => setLoadProgress({ percent, stage })
        });

        if (active) setLoadProgress({ percent: 100, stage: 'rendering' });
        // Disable ePub.js default replacements to prevent infinite loading; we handle this lazily
        const newEpubBook = ePub(arrayBuffer, { replacements: 'none' });
        setEpubBook(newEpubBook);

        const { embedAssetsAsDataUrls } = createAssetEmbedder(newEpubBook);

        await newEpubBook.ready;
        if (!active) return;
        
        // Register spine hook after ready: embeds all assets before serialization
        if ((newEpubBook as any).spine?.hooks?.content?.register) {
          (newEpubBook as any).spine.hooks.content.register(async (doc: Document, section: unknown) => {
            const sec = section as { url?: string, href?: string };
            await embedAssetsAsDataUrls(doc, sec?.url || sec?.href);
          });
        }
        
        if (book.reading_status === 'not_started') {
          onUpdateBook({ reading_status: 'reading' });
        }
        
        if (viewerRef.current) {
           const newRendition = newEpubBook.renderTo(viewerRef.current, {
             width: '100%',
             height: '100%',
             spread: 'none',
             minSpreadWidth: 10000,
             allowScriptedContent: true,
             manager: scrollMode ? 'continuous' : 'default',
             flow: scrollMode ? 'scrolled' : 'paginated'
           });
           
           setRendition(newRendition);

           if (newRendition.hooks?.content?.register) {
             newRendition.hooks.content.register(async (contents: any) => {
               await embedAssetsAsDataUrls(contents.document, contents.section?.url || contents.section?.href);
             });
           }
           
           const targetPage = book.last_read_page;
            const isValidCfiOrHref = typeof targetPage === 'string' &&
              targetPage.trim() !== '' &&
              targetPage !== '1' &&
              (targetPage.startsWith('epubcfi(') || targetPage.includes('#') || targetPage.includes('.html') || targetPage.includes('.xhtml') || targetPage.includes('/'));

            try {
              if (isValidCfiOrHref) {
                await newRendition.display(targetPage);
              } else {
                await newRendition.display();
              }
            } catch (dispErr) {
              console.warn('[EpubLoader] Erro ao abrir página/CFI específico, abrindo início do livro:', dispErr);
              try {
                await newRendition.display();
              } catch (fallbackErr) {
                console.error('[EpubLoader] Falha fatal no fallback de display:', fallbackErr);
              }
            }

            if (active) {
              setLoading(false);
              if (window.api?.library?.getHighlights) {
                window.api.library.getHighlights(book.id).then((hls: LibraryHighlight[]) => {
                  if (active) {
                    setHighlights(hls);
                  }
                }).catch((err) => console.error('[EpubLoader] Failed to load highlights:', err));
              }
              
              if (window.api?.library?.getBookmarks) {
                window.api.library.getBookmarks(book.id).then((bms: LibraryBookmark[]) => {
                  if (active) {
                    setBookmarks(bms);
                  }
                }).catch((err) => console.error('[EpubLoader] Failed to load bookmarks:', err));
              }

              newEpubBook.ready.then(() => {
                newEpubBook.loaded.navigation.then(nav => setToc(nav.toc));
                
                if (book.epub_locations) {
                  try {
                    newEpubBook.locations.load(book.epub_locations);
                    return newEpubBook.locations as unknown as string[];
                  } catch (e) {
                    console.error('Failed to load cached locations:', e);
                    return newEpubBook.locations.generate(1600);
                  }
                } else {
                  return newEpubBook.locations.generate(1600).then((locations) => {
                    if (active) {
                      try {
                        if (typeof newEpubBook.locations?.save === 'function') {
                          const serialized = newEpubBook.locations.save();
                          onUpdateBook({ epub_locations: serialized });
                        }
                      } catch (err) {
                        console.error('Failed to save generated locations:', err);
                      }
                    }
                    return locations;
                  });
                }
              }).then((locations: unknown) => {
                if (!active) return;
                const locsArray = Array.isArray(locations) ? locations : [];
                const locationsObj = newEpubBook.locations as { total?: number };
                const total = typeof locationsObj?.total === 'number' && locationsObj.total > 0 ? locationsObj.total : locsArray.length;
                setTotalPages(total);
                setLocationsReady(true);
                
                const updates: Partial<LibraryBook> = { total_pages: total };
                
                if (newRendition.location && newRendition.location.start) {
                  const percentage = newEpubBook.locations.percentageFromCfi(newRendition.location.start.cfi);
                  setProgress(percentage);
                  const current = newEpubBook.locations.locationFromCfi(newRendition.location.start.cfi);
                  if (typeof current === 'number') {
                    setCurrentPage(current);
                    updates.current_page = current;
                  }
                }
                
                onUpdateBook(updates);
              }).catch(console.error);
            }

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
                        } catch (e) {}
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
                 
                 if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
                 selectionTimerRef.current = setTimeout(() => {
                    setSelection({ cfiRange, text, rect: safeRect, context: contextText });
                 }, 50);
              }
           });
           
           const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

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

           newRendition.on('touchstart', (event: TouchEvent) => {
             const touch = event.changedTouches[0];
             (newRendition as any)._touchStartX = touch.screenX;
           });

           newRendition.on('rendered', (_: unknown, view: unknown) => {
             const v = view as { document: Document, section?: { url?: string, href?: string }, window: Window };
             const doc = v.document;
             if (!doc) return;
             
             embedAssetsAsDataUrls(doc, v.section?.url || v.section?.href);

             const style = doc.createElement('style');
             style.innerHTML = `
               ::selection { background: #3b82f640; }
               ::-moz-selection { background: #3b82f640; }
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
             const touchEndX = touch.screenX;
             const touchStartX = (newRendition as any)._touchStartX;
             
             if (touchStartX !== undefined) {
               const deltaX = touchEndX - touchStartX;
               if (deltaX > 50) {
                 turnPage('prev', newRendition);
               } else if (deltaX < -50) {
                 turnPage('next', newRendition);
               }
             }
           });
           
        }
        setLoading(false);
      } catch (err: unknown) {
        console.error("EPUB Load Error:", err);
        if (active) {
          setEpubError(err instanceof Error ? err.message : "Falha ao carregar EPUB");
          setLoading(false);
        }
      }
    };

    loadEpub();

    return () => {
      active = false;
      if (epubBook) {
        epubBook.destroy();
      }
    };
  }, [book.id, book.file_path, book.drive_file_id, book.author, scrollMode, state.moduleKeys]);
}
