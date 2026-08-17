import { useEffect, useRef } from 'react';
import ePub from 'epubjs';
import { getValidAccessToken, downloadFromDrive } from '../../../services/drive';
import { decryptFile } from '../../../services/storage';
import { useStore } from '../../../store/useStore';
import { platform } from '../../../services/platform';
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
        let arrayBuffer: ArrayBuffer | null = null;
        let assetUrl: string | null = null;
        
        try {
          // Apenas tenta stream local HTTP se a plataforma suportar acesso ao FileSystem local
          if (platform.canReadLocalFilesystem && window.api?.library && book.file_path && !book.file_path.startsWith('http')) {
             let absPath = book.file_path;
             if (!absPath.startsWith('file://') && !absPath.match(/^[a-zA-Z]:/)) {
                 const { appDataDir, join } = await import('@tauri-apps/api/path');
                 const dataDir = await appDataDir();
                 absPath = await join(dataDir, absPath);
             }
             if (absPath.startsWith('file://')) {
                 absPath = absPath.replace('file://', '');
             }
             if (absPath.startsWith('/')) {
                 absPath = absPath.substring(1);
             }
             // removed originalAbsPath assignment
             
             let encPath = absPath;
             if (!encPath.endsWith('.enc') && !book.file_path.endsWith('.enc')) {
                 encPath = encPath + '.enc';
             }
             const isWindows = navigator.userAgent.includes('Windows');
             const baseUrl = isWindows ? 'http://encrypted.localhost' : 'encrypted://localhost';
             assetUrl = `${baseUrl}/library/${encodeURIComponent(encPath)}`;
          }
        } catch (localErr) {
          console.log("Erro ao formatar path local (ignorado na Web)", localErr);
        }

        if (assetUrl) {
           try {
             const res = await fetch(assetUrl);
             if (res.ok) {
               arrayBuffer = await res.arrayBuffer();
             }
           } catch (fetchErr) {
             console.log("Falha ao buscar versão criptografada via stream HTTP.", fetchErr);
           }
        }

        if (!arrayBuffer && window.api?.library) {
            console.log("Obtendo arquivo do livro via API nativa/web...");
            const res = await window.api.library.getBookFile(book.id);
            if (res) {
              if ((res as unknown) instanceof ArrayBuffer) {
                arrayBuffer = res as any;
              } else if (typeof res === 'string') {
                const binaryString = atob(res);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
                arrayBuffer = bytes.buffer;
              }
            }
        }

        if (!arrayBuffer && book.drive_file_id) {
          console.log("Baixando EPUB do Google Drive: ", book.drive_file_id);
          const token = await getValidAccessToken();
          if (token) {
             const encryptedData = await downloadFromDrive(token, book.drive_file_id);
             if (masterKey) {
               arrayBuffer = await decryptFile(encryptedData, masterKey);
             } else {
               arrayBuffer = encryptedData;
             }
          } else {
             throw new Error("Você precisa conectar sua conta do Google Drive primeiro para baixar este livro.");
          }
        }

        if (!arrayBuffer) {
          throw new Error("Arquivo não encontrado no banco de dados nem na nuvem. Verifique se o arquivo foi sincronizado na nuvem.");
        }

        if (!active) return;

        // Use arrayBuffer directly to avoid ePub.js misidentifying the .enc extension as a directory
        const newEpubBook = ePub(arrayBuffer);
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
  }, [book.id, scrollMode]);
}
