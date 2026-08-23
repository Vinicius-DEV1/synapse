import { useEffect, useRef } from 'react';
import ePub from 'epubjs';
import { useStore } from '../../../store/useStore';
import { resolveCanonicalBuffer } from '../../../services/storage/canonical-resolver';
import { useEpub } from './EpubContext';
import type { LibraryBook, LibraryHighlight, LibraryBookmark } from '../../../types';

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
  setEpubError: (e: string | null) => void,
  turnPage: (direction: 'next' | 'prev', r: ePub.Rendition) => void,
  handleEpubClick: () => void,
  globalLastHighlightClickRef: React.MutableRefObject<number>
) {
  const { state } = useStore();
  const masterKey = state.moduleKeys['library'];
  
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
          moduleName: 'library',
          id: book.id,
          savedPath: book.file_path,
          driveFileId: book.drive_file_id,
          masterKey,
          extHint: 'epub',
          onUpdateSavedPath: (newPath) => onUpdateBook({ file_path: newPath })
        });

        if (!active) return;

        // Use arrayBuffer with blobUrl replacements to resolve internal assets
        const newEpubBook = ePub(arrayBuffer, { replacements: 'blobUrl' });
        setEpubBook(newEpubBook);

        await newEpubBook.ready;
        if (!active) return;
        
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

           // Hook: Resolve any relative images from the EPUB archive zip into Blob URLs
           const imageBlobCache = new Map<string, string>();
           const resolveImagesInDoc = (doc: Document, sectionIndex?: number) => {
             if (!doc || !newEpubBook.archive) return;

             const images = doc.querySelectorAll('img, image');
             images.forEach(async (img: Element) => {
               const isSvgImage = img.tagName.toLowerCase() === 'image';
               const rawSrc = isSvgImage
                 ? (img.getAttribute('xlink:href') || img.getAttribute('href'))
                 : img.getAttribute('src');

               if (!rawSrc) return;
               if (
                 rawSrc.startsWith('blob:') ||
                 rawSrc.startsWith('data:') ||
                 rawSrc.startsWith('http://') ||
                 rawSrc.startsWith('https://')
               ) {
                 return;
               }

               if (imageBlobCache.has(rawSrc)) {
                 const cachedUrl = imageBlobCache.get(rawSrc)!;
                 if (isSvgImage) {
                   img.setAttribute('href', cachedUrl);
                   img.setAttribute('xlink:href', cachedUrl);
                 } else {
                   img.setAttribute('src', cachedUrl);
                 }
                 return;
               }

               try {
                 const cleanPath = rawSrc.split('?')[0].split('#')[0];
                 const filename = cleanPath.split('/').pop() || cleanPath;

                 let zipEntry: any = null;

                 // 1. Resolve relative to section url
                 if (typeof sectionIndex === 'number') {
                   const section = newEpubBook.spine?.get(sectionIndex);
                   if (section && section.url) {
                     const sectionDir = section.url.substring(0, section.url.lastIndexOf('/') + 1);
                     const combined = sectionDir + cleanPath;
                     const normalized = combined.startsWith('/') ? combined.slice(1) : combined;
                     zipEntry = newEpubBook.archive.zip.file(normalized);
                   }
                 }

                 // 2. Direct path
                 if (!zipEntry) {
                   const normalized = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
                   zipEntry = newEpubBook.archive.zip.file(normalized);
                 }

                 // 3. Fallback: Search all zip entries by path ending or filename
                 if (!zipEntry) {
                   const allFiles = Object.keys(newEpubBook.archive.zip.files);
                   const match = allFiles.find(
                     f => f.endsWith(cleanPath) || f.endsWith('/' + filename) || f === filename
                   );
                   if (match) {
                     zipEntry = newEpubBook.archive.zip.file(match);
                   }
                 }

                 if (zipEntry) {
                   const ext = filename.split('.').pop()?.toLowerCase();
                   const mimeType = ext === 'png' ? 'image/png'
                     : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                     : ext === 'svg' ? 'image/svg+xml'
                     : ext === 'gif' ? 'image/gif'
                     : ext === 'webp' ? 'image/webp'
                     : 'application/octet-stream';

                   const uint8 = await zipEntry.async('uint8array');
                   const blob = new Blob([uint8], { type: mimeType });
                   const blobUrl = URL.createObjectURL(blob);
                   imageBlobCache.set(rawSrc, blobUrl);

                   if (isSvgImage) {
                     img.setAttribute('href', blobUrl);
                     img.setAttribute('xlink:href', blobUrl);
                   } else {
                     img.setAttribute('src', blobUrl);
                   }
                 }
               } catch (err) {
                 console.warn('[EpubLoader] Erro ao resolver imagem interna:', rawSrc, err);
               }
             });
           };

           if (newRendition.hooks?.content?.register) {
             newRendition.hooks.content.register((contents: any) => {
               resolveImagesInDoc(contents.document, contents.sectionIndex);
             });
           }
           
           if (book.last_read_page && typeof book.last_read_page === 'string') {
              await newRendition.display(book.last_read_page as string);
           } else {
              await newRendition.display();
           }

           window.api.library.getHighlights(book.id).then((hls: LibraryHighlight[]) => {
              setHighlights(hls);
           });
           
           window.api.library.getBookmarks(book.id).then((bms: LibraryBookmark[]) => {
              setBookmarks(bms);
           });

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
                      const serialized = newEpubBook.locations.save();
                      onUpdateBook({ epub_locations: serialized });
                    } catch (err) {
                      console.error('Failed to save generated locations:', err);
                    }
                  }
                  return locations;
                });
              }
            }).then((locations: any) => {
               if (!active) return;
               const total = (newEpubBook.locations as any).total ? (newEpubBook.locations as any).total : (locations.length || 0);
               setTotalPages(total);
               setLocationsReady(true);
               
               const updates: Partial<LibraryBook> = { total_pages: total };
               
               if (newRendition.location && newRendition.location.start) {
                 const percentage = newEpubBook.locations.percentageFromCfi(newRendition.location.start.cfi);
                 setProgress(percentage);
                 const current = newEpubBook.locations.locationFromCfi(newRendition.location.start.cfi);
                 setCurrentPage(current as unknown as number);
                 (updates as any).current_page = current;
               }
               
               onUpdateBook(updates);
            }).catch(console.error);

           newRendition.on('selected', (cfiRange: string, contents: any) => {
              const windowSelection = contents.window.getSelection();
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
                           cfiRange = new (ePub as any).CFI(range, contents.cfiBase).toString();
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
                 const iframe = contents.document?.defaultView?.frameElement;
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

           newRendition.on('rendered', (_: any, view: any) => {
             const doc = view.document;
             if (!doc) return;
             
             resolveImagesInDoc(doc, view.section?.index);

             const style = doc.createElement('style');
             style.innerHTML = `
               ::selection { background: #3b82f640; }
               ::-moz-selection { background: #3b82f640; }
             `;
             doc.head.appendChild(style);

             setTimeout(() => {
                const firstTextNode = doc.querySelector('p') || doc.body;
                if (firstTextNode) {
                  const computedStyle = view.window.getComputedStyle(firstTextNode);
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
      } catch (err: any) {
        console.error("EPUB Load Error:", err);
        if (active) {
          setEpubError(err.message || "Falha ao carregar EPUB");
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
  }, [book.id, book.file_path, book.drive_file_id, scrollMode]);
}
