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

        // Disable ePub.js default replacements to prevent infinite loading; we handle this lazily
        const newEpubBook = ePub(arrayBuffer, { replacements: 'none' });
        setEpubBook(newEpubBook);

        const normalizeRelativePath = (baseFile: string, relativePath: string): string => {
          const stack = baseFile.split('/').filter(Boolean);
          if (!baseFile.endsWith('/')) {
            stack.pop(); // remove file to get directory
          }
          const parts = relativePath.split('/').filter(Boolean);
          for (const part of parts) {
            if (part === '.') continue;
            if (part === '..') {
              stack.pop();
            } else {
              stack.push(part);
            }
          }
          return stack.join('/');
        };

        const assetBase64Cache = new Map<string, string>();

        const getZipEntry = (cleanPath: string, basePath?: string) => {
          const archive = (newEpubBook as any).archive;
          const zip = archive?.zip;
          if (!zip) return null;

          let zipEntry: any = null;
          const filename = cleanPath.split('/').pop() || cleanPath;

          if (basePath) {
            const canonical = normalizeRelativePath(basePath, cleanPath);
            zipEntry = zip.file(canonical);
            if (!zipEntry && zip.files) {
              const lowerCanonical = canonical.toLowerCase();
              const matchedFile = Object.keys(zip.files).find(f => f.toLowerCase() === lowerCanonical);
              if (matchedFile) zipEntry = zip.file(matchedFile);
            }
          }

          if (!zipEntry) {
            const normalized = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
            zipEntry = zip.file(normalized);
            if (!zipEntry && zip.files) {
              const lowerNorm = normalized.toLowerCase();
              const matchedFile = Object.keys(zip.files).find(f => f.toLowerCase() === lowerNorm);
              if (matchedFile) zipEntry = zip.file(matchedFile);
            }
          }

          if (!zipEntry && zip.files) {
            const lowerFilename = filename.toLowerCase();
            const match = Object.keys(zip.files).find(
              f => f.toLowerCase() === lowerFilename || f.toLowerCase().endsWith('/' + lowerFilename)
            );
            if (match) zipEntry = zip.file(match);
          }

          return zipEntry;
        };

        const getMimeType = (filename: string) => {
          const ext = filename.split('.').pop()?.toLowerCase();
          switch (ext) {
            case 'png': return 'image/png';
            case 'jpg': case 'jpeg': return 'image/jpeg';
            case 'svg': return 'image/svg+xml';
            case 'gif': return 'image/gif';
            case 'webp': return 'image/webp';
            case 'ttf': return 'font/ttf';
            case 'otf': return 'font/otf';
            case 'woff': return 'font/woff';
            case 'woff2': return 'font/woff2';
            case 'css': return 'text/css';
            default: return 'application/octet-stream';
          }
        };

        const processCssText = async (cssText: string, cssBasePath: string): Promise<string> => {
          const cssUrlRegex = /url\(['"]?([^'"()]+)['"]?\)/g;
          const matches = Array.from(cssText.matchAll(cssUrlRegex));
          
          for (const match of matches) {
            const url = match[1];
            if (url.startsWith('data:') || url.startsWith('http')) continue;
            
            const cleanPath = url.split('?')[0].split('#')[0];
            const zipEntry = getZipEntry(cleanPath, cssBasePath);
            if (zipEntry) {
              try {
                const base64Data = await zipEntry.async('base64');
                const mime = getMimeType(cleanPath);
                const dataUrl = `data:${mime};base64,${base64Data}`;
                cssText = cssText.replace(match[0], `url("${dataUrl}")`);
              } catch (e) {
                console.warn('[EpubLoader] Failed to embed CSS asset:', url, e);
              }
            }
          }
          return cssText;
        };

        const embedAssetsAsDataUrls = async (doc: Document, sectionUrl?: string) => {
          if (!doc) return;

          // 1. Process inline <style> blocks
          const styleTags = doc.querySelectorAll('style');
          for (const style of Array.from(styleTags)) {
            if (style.textContent) {
              style.textContent = await processCssText(style.textContent, sectionUrl || '');
            }
          }

          // 2. Process <link rel="stylesheet">
          const links = doc.querySelectorAll('link[rel="stylesheet"]');
          for (const link of Array.from(links)) {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('data:')) continue;

            const cleanPath = href.split('?')[0].split('#')[0];
            const zipEntry = getZipEntry(cleanPath, sectionUrl);
            if (zipEntry) {
              try {
                let cssText = await zipEntry.async('text');
                const cssCanonicalBase = normalizeRelativePath(sectionUrl || '', cleanPath);
                cssText = await processCssText(cssText, cssCanonicalBase);
                
                const styleEl = doc.createElement('style');
                styleEl.textContent = cssText;
                if (link.id) styleEl.id = link.id;
                if (link.className) styleEl.className = link.className;
                
                link.parentNode?.replaceChild(styleEl, link);
              } catch (e) {
                console.warn('[EpubLoader] Failed to embed stylesheet:', href, e);
              }
            }
          }

          // 3. Process <img> and <image>
          const images = doc.querySelectorAll('img, image');
          for (const img of Array.from(images)) {
            const isSvgImage = img.tagName.toLowerCase() === 'image';
            const rawSrc = isSvgImage
              ? (img.getAttribute('xlink:href') || img.getAttribute('href'))
              : (img.getAttribute('src') || (img as HTMLImageElement).src);

            if (!rawSrc || rawSrc.startsWith('data:')) continue;
            const originalPath = (img as HTMLImageElement).dataset?.src || img.getAttribute('src') || rawSrc;

            if (originalPath.startsWith('http://') || originalPath.startsWith('https://')) {
              try {
                const parsed = new URL(originalPath);
                if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1' && !parsed.hostname.endsWith('.localhost')) continue;
              } catch {}
            }

            if (assetBase64Cache.has(originalPath)) {
              const cachedData = assetBase64Cache.get(originalPath)!;
              if (isSvgImage) {
                img.setAttribute('href', cachedData);
                img.setAttribute('xlink:href', cachedData);
              } else {
                const newImg = doc.createElement('img');
                Array.from(img.attributes).forEach(attr => newImg.setAttribute(attr.name, attr.value));
                newImg.src = cachedData;
                img.parentNode?.replaceChild(newImg, img);
              }
              continue;
            }

            try {
              let cleanPath = originalPath.split('?')[0].split('#')[0];
              if (cleanPath.startsWith('http')) {
                try {
                  cleanPath = new URL(cleanPath).pathname;
                  if (cleanPath.startsWith('/')) cleanPath = cleanPath.slice(1);
                } catch {}
              }

              const zipEntry = getZipEntry(cleanPath, sectionUrl);
              if (zipEntry) {
                const base64Data = await zipEntry.async('base64');
                const mime = getMimeType(cleanPath);
                const dataUrl = `data:${mime};base64,${base64Data}`;
                assetBase64Cache.set(originalPath, dataUrl);

                if (isSvgImage) {
                  img.setAttribute('href', dataUrl);
                  img.setAttribute('xlink:href', dataUrl);
                } else {
                  const newImg = doc.createElement('img');
                  Array.from(img.attributes).forEach(attr => newImg.setAttribute(attr.name, attr.value));
                  newImg.src = dataUrl;
                  img.parentNode?.replaceChild(newImg, img);
                }
              }
            } catch (err) {
              console.warn('[EpubLoader] Failed to embed image:', originalPath, err);
            }
          }
        };

        await newEpubBook.ready;
        if (!active) return;
        
        // Register spine hook after ready: embeds all assets before serialization
        if ((newEpubBook as any).spine?.hooks?.content?.register) {
          (newEpubBook as any).spine.hooks.content.register(async (doc: Document, section: any) => {
            await embedAssetsAsDataUrls(doc, section?.url || section?.href);
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
           
           if (book.last_read_page && typeof book.last_read_page === 'string') {
              await newRendition.display(book.last_read_page as string);
           } else {
              await newRendition.display();
           }
           if (active) {
             setLoading(false);
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
             
             embedAssetsAsDataUrls(doc, view.section?.url || view.section?.href);

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
