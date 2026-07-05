import React, { useState, useEffect, useRef } from 'react';
import ePub, { Book } from 'epubjs';
import { ArrowLeft } from 'lucide-react';
import type { LibraryBook, LibraryHighlight, LibraryBookmark } from '../../types';
import { getValidAccessToken, downloadFromDrive } from '../../services/drive';
import { decryptFile } from '../../services/storage';
import { useStore } from '../../store/useStore';

import { EpubProvider, useEpub } from './epub/EpubContext';
import EpubTopBar from './epub/EpubTopBar';
import EpubSidebars from './epub/EpubSidebars';
import EpubTypography from './epub/EpubTypography';
import EpubHighlightMenu from './epub/EpubHighlightMenu';

interface EpubReaderProps {
  book: LibraryBook;
  onBack: () => void;
  onUpdateBook: (updates: Partial<LibraryBook>) => void;
}

function EpubCore({ onBack, onUpdateBook }: Omit<EpubReaderProps, 'book'>) {
  const {
    book, rendition, setRendition, epubBook, setEpubBook,
    readingMode, setReadingMode, scrollMode, fontSize, setFontSize, fontFamily,
    originalFontName, setOriginalFontName, detectedFontSizePx, setDetectedFontSizePx,
    locationsReady, setLocationsReady, setTotalPages,
    setProgress, setCurrentPage, selection, setSelection, setNoteMode, setNoteText,
    setShowSettings, highlights, setHighlights, setBookmarks, setToc,
    textWidth
  } = useEpub();

  const { state } = useStore();
  const masterKey = state.moduleKeys['library'];

  const [loading, setLoading] = useState(true);
  const [epubError, setEpubError] = useState<string | null>(null);
  const [modeToast, setModeToast] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Timer usado para adiar o setSelection(null) do handler de 'click' geral,
  // dando tempo para o callback de anotação cancelar a limpeza quando um grifo for tocado
  const clearSelectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Flag que indica que um grifo acabou de ser clicado — o próximo 'click' geral deve ser ignorado
  const highlightJustClickedRef = useRef(false);

  const [showMobileTools, setShowMobileTools] = useState(false);
  const toolsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isFullScreenRef = useRef(state.isReadingModeFullScreen);
  useEffect(() => {
    isFullScreenRef.current = state.isReadingModeFullScreen;
  }, [state.isReadingModeFullScreen]);

  const turnPage = (direction: 'next' | 'prev', r: ePub.Rendition = rendition!) => {
    if (!r) return;
    
    // Animação de fade rápida
    if (viewerRef.current) {
      viewerRef.current.style.transition = 'opacity 0.05s ease-out';
      viewerRef.current.style.opacity = '0.3';
    }
    
    setTimeout(() => {
      if (direction === 'next') r.next();
      else r.prev();
      
      if (viewerRef.current) {
        viewerRef.current.style.transition = 'opacity 0.15s ease-in';
        viewerRef.current.style.opacity = '1';
      }
    }, 50);
  };

  const handleEpubClick = () => {
    setShowMobileTools(prev => {
      const nextState = !prev;
      if (toolsTimeoutRef.current) clearTimeout(toolsTimeoutRef.current);
      if (nextState) {
        toolsTimeoutRef.current = setTimeout(() => setShowMobileTools(false), 15000);
      }
      return nextState;
    });
  };

  const { dispatch } = useStore();

  // Ao desmontar o leitor, volta para o estado normal (menu sempre acessível)
  useEffect(() => {
    return () => {
      dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: false });
    };
  }, [dispatch]);

  useEffect(() => {
    if (modeToast) {
      const timer = setTimeout(() => setModeToast(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [modeToast]);

  // Load EPUB
  useEffect(() => {
    let active = true;
    const loadEpub = async () => {
      try {
        setLoading(true);
        let arrayBuffer: ArrayBuffer | null = null;
        
        try {
          const res = await window.api.library.getBookFile(book.id);
          if (res) {
            if (typeof res === 'string') {
              const binaryString = atob(res);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
              }
              arrayBuffer = bytes.buffer;
            } else {
              arrayBuffer = res;
            }
          }
        } catch (localErr) {
          console.log("Arquivo local não encontrado. Tentando nuvem...", localErr);
        }

        if (!arrayBuffer && book.drive_file_id) {
          const token = await getValidAccessToken();
          if (!token) throw new Error('Não autenticado no Google Drive');
          const encryptedData = await downloadFromDrive(token, book.drive_file_id);
          if (masterKey) {
            arrayBuffer = await decryptFile(encryptedData, masterKey);
          } else {
            // Fallback: try using it directly (unencrypted legacy)
            arrayBuffer = encryptedData;
          }
        } else if (!arrayBuffer && book.file_path) {
          if (book.file_path.startsWith('file://')) {
            const res = await window.api.library.getBookFile(book.id);
            if (!res) throw new Error("Arquivo não encontrado no banco");
            const binaryString = atob(res);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            arrayBuffer = bytes.buffer;
          } else {
            const bytes = await decryptFile(book.file_path);
            arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
          }
        }
        
        if (!arrayBuffer) {
          throw new Error('Nenhum arquivo encontrado para este livro.');
        }

        if (!active) return;

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
                  return newEpubBook.locations;
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
               const total = newEpubBook.locations.total ? newEpubBook.locations.total : (locations.length || 0);
               setTotalPages(total);
               setLocationsReady(true);
               
               const updates: Partial<LibraryBook> = { total_pages: total };
               
               if (newRendition.location && newRendition.location.start) {
                 const percentage = newEpubBook.locations.percentageFromCfi(newRendition.location.start.cfi);
                 setProgress(percentage);
                 const current = newEpubBook.locations.locationFromCfi(newRendition.location.start.cfi);
                 setCurrentPage(current);
                 updates.current_page = current as any;
               }
               
               onUpdateBook(updates);
            }).catch(console.error);

           newRendition.on('selected', (cfiRange: string, contents: any) => {
              const windowSelection = contents.window.getSelection();
              let text = windowSelection.toString();
              
              // Se um grifo acabou de ser clicado, não iniciar nova seleção
              if (Date.now() - globalLastHighlightClick < 500) {
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
                 
                 // Bloqueio de eventos fantasmas do epub.js (seleções colapsadas/inválidas)
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
                 
                 // Debounce: o duplo-clique dispara 'selected' 2x em sequência.
                 // Só o último (com a seleção final completa) vence.
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
               // No mobile, o overlay do bottom sheet (fixed inset-0) já fecha
               // a barra quando o usuário toca fora. Não interferir aqui.
               handleEpubClick();
               return;
             }
              // Se um grifo acabou de ser clicado, NÃO limpar a seleção
              // Verifica a var local E a window (usada pelo EpubHighlightMenu para grifos novos)
              const lastHlClick = Math.max(globalLastHighlightClick, (window as any).__lastHighlightClick || 0);
              if (Date.now() - lastHlClick < 500) {
                return;
              }
             // Desktop: limpa seleção no clique normal
             if (clearSelectionTimerRef.current) clearTimeout(clearSelectionTimerRef.current);
             clearSelectionTimerRef.current = setTimeout(() => {
               clearSelectionTimerRef.current = null;
               
               // CHECAGEM DE SEGURANÇA FINAL: verifica novamente se o clique no grifo chegou agorinha mesmo!
               const finalLastHlClick = Math.max(globalLastHighlightClick, (window as any).__lastHighlightClick || 0);
               if (Date.now() - finalLastHlClick < 500) {
                 return; // Aborta! Um grifo foi clicado enquanto esperávamos.
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

           newRendition.on('rendered', (section: any, view: any) => {
             const doc = view.document;
             if (!doc) return;
             
             // Injeta estilo CSS extra no <head> se precisarmos
             const style = doc.createElement('style');
             style.innerHTML = `
               ::selection { background: #3b82f640; }
               ::-moz-selection { background: #3b82f640; }
             `;
             doc.head.appendChild(style);

             // Tenta extrair a fonte e o tamanho originais do EPUB
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
           
           newRendition.on('keydown', (event: any) => {
                 if (event.altKey && event.code && event.code.startsWith('Digit')) {
                   const num = parseInt(event.code.replace('Digit', ''), 10);
                   if (num >= 1 && num <= 9) {
                     event.preventDefault();
                     window.dispatchEvent(new KeyboardEvent('keydown', { altKey: true, code: event.code, key: event.key }));
                     return;
                   }
                 }
                 if (event.key === 'F11') {
                    event.preventDefault();
                    dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: !isFullScreenRef.current });
                    return;
                 }
                if (event.key === 'ArrowRight') turnPage('next', newRendition);
                if (event.key === 'ArrowLeft') turnPage('prev', newRendition);
                if (event.key.toLowerCase() === 'm' && !event.ctrlKey && !event.metaKey && !event.altKey) {
                  cycleReadingMode();
                }
                if (event.key === '+' || event.key === '=') {
                  changeZoom(10);
                }
                if (event.key === '-') {
                  changeZoom(-10);
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
  }, [book.id, scrollMode]); // Re-render epub on scrollMode change

  useEffect(() => {
    if (rendition) {
      rendition.themes.fontSize(`${fontSize}%`);
      const font = fontFamily === 'serif' ? 'Georgia, serif' : fontFamily === 'opendyslexic' ? 'OpenDyslexic, sans-serif' : 'Inter, sans-serif';
      
      const getEpubThemeColors = (mode: string) => {
        switch (mode) {
          case 'dark': return { bg: '#1a1a2e', text: '#d1d5db' };
          case 'midnight': return { bg: '#0f172a', text: '#94a3b8' };
          case 'dim': return { bg: '#2d2d30', text: '#e0e0e0' };
          case 'nord': return { bg: '#2e3440', text: '#d8dee9' };
          case 'high-contrast': return { bg: '#000000', text: '#ffffff' };
          case 'sepia': return { bg: '#f4ecd8', text: '#5b4636' };
          case 'mint': return { bg: '#e8f5e9', text: '#1b4332' };
          case 'light':
          default: return { bg: '#ffffff', text: '#333333' };
        }
      };

      const colors = getEpubThemeColors(readingMode);
      
      const themeName = `custom-${readingMode}-${fontFamily}`;

      const themeCss: any = {
        [`body.${themeName}`]: { 
          'background': `${colors.bg} !important`, 
          'color': `${colors.text} !important`,
          'padding-bottom': `${bottomPadding} !important`,
          'padding-left': `20px !important`,
          'padding-right': `20px !important`,
          'margin-bottom': `0px !important`
        },
        [`.${themeName} body`]: { 
          'background': `${colors.bg} !important`, 
          'color': `${colors.text} !important`,
          'padding-bottom': `${bottomPadding} !important`,
          'padding-left': `20px !important`,
          'padding-right': `20px !important`,
          'margin-bottom': `0px !important`
        }
      };

      if (fontFamily !== 'original') {
        themeCss[`body.${themeName}`]['font-family'] = `${font} !important`;
        themeCss[`.${themeName} body`]['font-family'] = `${font} !important`;
        themeCss[`body.${themeName} *`] = { 'font-family': `${font} !important` };
        themeCss[`.${themeName} body *`] = { 'font-family': `${font} !important` };
      }
          
      rendition.themes.register(themeName, themeCss);
      rendition.themes.select(themeName);
    }
    
      // Redesenha as marcações após o reflow — usa 800ms para garantir que o reflow complete
      const timer = setTimeout(() => {
        if (rendition && highlights) {
          const colorMap: any = { yellow: '#fbbf24', green: '#34d399', blue: '#60a5fa', pink: '#f472b6' };
          
          // Correção do Bug de Ghosting (Sobreposição e Zoom): 
          // O método clear() nativo do epub.js não remove corretamente os SVGs do DOM sob certas condições de reflow.
          // Para garantir que não teremos highlights órfãos ou duplicados escurecendo, removemos um por um pelo CFI.
          highlights.forEach(h => {
             if (h.rects) {
               try {
                  rendition.annotations.remove(h.rects, "highlight");
               } catch (e) {}
             }
          });

          // Fallback para limpar outras anotações fantasmas na memória
          try {
            rendition.annotations.clear();
          } catch (e) {
            console.warn("EpubJS clear annotations error:", e);
          }
          
          // E também apagamos forçadamente SVGs de anotações soltos no DOM do iframe.
          try {
            rendition.getContents().forEach((content: any) => {
              const doc = content.document;
              if (doc) {
                const orphanedHighlights = doc.querySelectorAll('svg[class*="epubjs-hl"], svg[class*="epubjs-annotation"]');
                orphanedHighlights.forEach((node: Element) => node.remove());
              }
            });
          } catch (e) {}
          highlights.forEach(h => {
            if (h.rects) {
              try {
                rendition.annotations.highlight(h.rects, {}, (e: any) => {
                  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                  if (e && typeof e.preventDefault === 'function') e.preventDefault();
                  globalLastHighlightClick = Date.now();
                  if (clearSelectionTimerRef.current) {
                    clearTimeout(clearSelectionTimerRef.current);
                    clearSelectionTimerRef.current = null;
                  }
                  const rawRect = e.target.getBoundingClientRect();
                  let offsetX = 0; let offsetY = 0;
                  const iframe = e.target.ownerDocument?.defaultView?.frameElement;
                  if (iframe) {
                      const iframeRect = iframe.getBoundingClientRect();
                      offsetX = iframeRect.left;
                      offsetY = iframeRect.top;
                  }
                  const rect = {
                      top: rawRect.top + offsetY, left: rawRect.left + offsetX,
                      bottom: rawRect.bottom + offsetY, right: rawRect.right + offsetX,
                      x: rawRect.x + offsetX, y: rawRect.y + offsetY,
                      width: rawRect.width, height: rawRect.height,
                      toJSON: rawRect.toJSON
                  } as DOMRect;
                  const contextText = e.target.parentNode?.textContent?.trim() || h.text_content;
                  setSelection({ cfiRange: h.rects, text: h.text_content, rect, existingHighlightId: h.id, context: contextText });
                  setNoteMode(h.color || 'yellow');
                  setNoteText(h.note || '');
                }, undefined, { fill: colorMap[h.color || 'yellow'], 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply' });
              } catch (err) {
                console.warn("EpubJS highlight error for", h.rects, err);
              }
            }
          });
        }
      }, 800);

    return () => clearTimeout(timer);
  }, [fontSize, fontFamily, readingMode, rendition, highlights]);

  // Limpa a seleção nativa no DOM do EPUB.js quando o menu for fechado (selection === null)
  // Isso impede bugs de "marcação fantasma" quando o zoom ou layout muda e o epub.js re-dispara 'selected'.
  useEffect(() => {
    if (!selection && rendition) {
      try {
        rendition.getContents().forEach((content: any) => {
          content.window.getSelection()?.removeAllRanges();
        });
      } catch (e) {}
    }
  }, [selection, rendition]);

  useEffect(() => {
    if (!rendition) return;

    const onRelocated = (location: any) => {
      const updates: Partial<LibraryBook> = { last_read_page: location.start.cfi as any };
      
      if (locationsReady && epubBook) {
        const percentage = epubBook.locations.percentageFromCfi(location.start.cfi);
        setProgress(percentage);
        const current = epubBook.locations.locationFromCfi(location.start.cfi);
        setCurrentPage(current);
        updates.current_page = current as any;
      }
      
      onUpdateBook(updates);
    };

    rendition.on('relocated', onRelocated);
    return () => { rendition.off('relocated', onRelocated); };
  }, [rendition, locationsReady, epubBook]);

  const modeNames: any = {
    'light': 'Tema: Claro',
    'sepia': 'Tema: Sépia',
    'mint': 'Tema: Menta',
    'dim': 'Tema: Cinza (Dim)',
    'nord': 'Tema: Nord',
    'midnight': 'Tema: Meia-noite',
    'dark': 'Tema: Escuro',
    'high-contrast': 'Tema: Alto Contraste'
  };

  const cycleReadingMode = () => {
    setReadingMode((prev: string) => {
      const modes = ['light', 'sepia', 'mint', 'dim', 'nord', 'midnight', 'dark', 'high-contrast'];
      const nextIndex = (modes.indexOf(prev) + 1) % modes.length;
      const nextMode = modes[nextIndex];
      setTimeout(() => setModeToast(modeNames[nextMode]), 0);
      return nextMode as any;
    });
  };

  const changeZoom = (delta: number) => {
    setFontSize((prev: number) => {
      const next = Math.max(50, Math.min(300, prev + delta));
      setTimeout(() => setModeToast(`Zoom: ${next}% ${detectedFontSizePx ? `(${detectedFontSizePx})` : ''}`), 0);
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle OS Fullscreen AND Reader UI Fullscreen (Foco)
      if (e.key.toLowerCase() === 'f' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: !isFullScreenRef.current });
        if (window.api?.app?.toggleFullScreen) {
          window.api.app.toggleFullScreen();
        }
        return;
      }
      // Toggle Reader UI Fullscreen (Foco)
      if (e.key.toLowerCase() === 'f' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: !isFullScreenRef.current });
        return;
      }

      if (e.key === 'ArrowRight') turnPage('next');
      if (e.key === 'ArrowLeft') turnPage('prev');
      
      const isInput = document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT';
      if (isInput) return;

      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        cycleReadingMode();
      }
      if (e.key === '+' || e.key === '=') {
        changeZoom(10);
      }
      if (e.key === '-') {
        changeZoom(-10);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rendition, setReadingMode, setFontSize, dispatch, state.isReadingModeFullScreen]);

  // Recalcula o layout do EPUB.js quando a largura do contêiner ou o modo tela cheia mudam.
  // Aguarda 350ms para garantir que a animação CSS (transition-all duration-300) termine.
  useEffect(() => {
    if (!rendition) return;
    const timer = setTimeout(() => {
      rendition.resize();
    }, 350);
    return () => clearTimeout(timer);
  }, [textWidth, state.isReadingModeFullScreen, showMobileTools, rendition]);

  const { progress, currentPage, totalPages } = useEpub();
  const progressPercentage = Math.round((progress || 0) * 100);
  const currentPageSafe = currentPage || 0;
  const totalPagesSafe = totalPages || 0;
  const isDark = ['dark', 'dim', 'nord', 'midnight', 'high-contrast'].includes(readingMode);
  
  // Detecta se estamos no Mobile ou Web App via tamanho de tela e userAgent
  // Se for mobile, precisamos de 60px de padding para não conflitar com a barra inferior flutuante ou gestos de iOS.
  // Se for desktop, 16px é suficiente apenas para o texto não ficar grudado no rodapé inferior fixo.
  const isMobileView = window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const bottomPadding = isMobileView ? '60px' : '16px';
  
  const bottomBarClasses = readingMode === 'dark' ? 'bg-[#1a1a1a] text-gray-500' : 
    readingMode === 'midnight' ? 'bg-[#0f172a] text-[#475569]' : 
    readingMode === 'nord' ? 'bg-[#2e3440] text-[#4c566a]' : 
    readingMode === 'dim' ? 'bg-[#2d2d30] text-[#808080]' : 
    readingMode === 'high-contrast' ? 'bg-[#000000] text-[#aaaaaa]' : 
    readingMode === 'sepia' ? 'bg-[#e9dec0] text-[#8c765f]' : 
    readingMode === 'mint' ? 'bg-[#c8e6c9] text-[#2d6a4f]' : 
    'bg-white text-gray-400';

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = Number(e.target.value);
    if (!epubBook || !rendition || !locationsReady) return;
    
    // Calcula o CFI da nova página e manda o rendition exibir
    const cfi = epubBook.locations.cfiFromLocation(page);
    if (cfi) {
      rendition.display(cfi);
    }
  };

  return (
    <div className={`h-full flex flex-col relative overflow-hidden reading-mode-${readingMode} ${readingMode === 'dark' ? 'bg-[#1a1a2e]' : readingMode === 'sepia' ? 'bg-[#f4ecd8]' : readingMode === 'mint' ? 'bg-[#e8f5e9]' : readingMode === 'dim' ? 'bg-[#2d2d30]' : readingMode === 'nord' ? 'bg-[#2e3440]' : readingMode === 'midnight' ? 'bg-[#0f172a]' : readingMode === 'high-contrast' ? 'bg-black' : 'bg-white'}`}>
      <div className={`
        transition-all duration-300 z-30
        ${showMobileTools ? 'translate-y-0' : '-translate-y-full md:translate-y-0'}
        ${state.isReadingModeFullScreen ? 'hidden' : ''}
        absolute md:relative top-0 left-0 right-0
      `}>
        <EpubTopBar onBack={onBack} />
      </div>
      <EpubTypography />
      <EpubSidebars />

      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/5 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
          </div>
        )}
        
        {epubError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-red-500 p-8 text-center bg-dark-bg">
            <div className="bg-red-500/10 p-4 rounded-full mb-4">
              <ArrowLeft size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">Erro ao carregar EPUB</h3>
            <p className="opacity-80 max-w-md">{epubError}</p>
            <button onClick={onBack} className="mt-6 px-6 py-2 bg-dark-surface hover:bg-dark-border rounded-lg text-dark-text transition-colors">
              Voltar à Biblioteca
            </button>
          </div>
        )}

        <EpubHighlightMenu />

        <div className={`relative w-full h-full flex-1 bg-transparent overflow-hidden ${showMobileTools ? 'z-0' : 'z-10'}`}>
        <button onClick={() => turnPage('prev')} className="hidden sm:block absolute left-0 top-0 bottom-0 w-16 z-10 cursor-pointer group">
          <div className={`absolute left-0 top-0 bottom-0 w-16 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center ${isDark ? 'bg-gradient-to-r from-black/50 to-transparent text-white' : 'bg-gradient-to-r from-black/10 to-transparent text-black'}`}>
            <ArrowLeft size={24} />
          </div>
        </button>
        
        <div ref={viewerRef} className={`w-full h-full mx-auto px-2 sm:px-10 transition-all duration-300 ${
          textWidth === 'narrow' ? 'max-w-2xl' :
          textWidth === 'medium' ? 'max-w-4xl' : 'max-w-[1400px]'
        }`} />

        <button onClick={() => turnPage('next')} className="hidden sm:block absolute right-0 top-0 bottom-0 w-16 z-10 cursor-pointer group">
          <div className={`absolute right-0 top-0 bottom-0 w-16 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center ${isDark ? 'bg-gradient-to-l from-black/50 to-transparent text-white' : 'bg-gradient-to-l from-black/10 to-transparent text-black'}`}>
             <ArrowLeft size={24} className="rotate-180" />
          </div>
        </button>
      </div>
      </div>

      <div className={`
          group relative flex-shrink-0 h-8 flex items-center justify-between px-6 text-[11px] font-medium tracking-wider uppercase transition-all duration-300 z-[60]
          fixed md:relative bottom-0 left-0 right-0
          ${showMobileTools ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
          ${bottomBarClasses}
        `}>
        <div>
           {locationsReady ? `Página ${currentPageSafe} de ${totalPagesSafe}` : 'Calculando páginas...'}
        </div>

        {/* Scrubber (Slider Estilo Kindle) */}
        {locationsReady && totalPagesSafe > 1 && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-[80%] max-w-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-300 pb-2">
            <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 shadow-2xl border border-white/10 flex flex-col items-center gap-2">
              <span className="text-white font-bold text-xs">Página {currentPageSafe}</span>
              <input 
                type="range" 
                min="1" 
                max={totalPagesSafe} 
                value={currentPageSafe} 
                onChange={handleScrub}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>
          </div>
        )}

        <div>
           {locationsReady ? `${progressPercentage}%` : '...'}
        </div>
      </div>

      {/* Mode Toast */}
      {modeToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-black/80 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium pointer-events-none transition-all duration-300">
          {modeToast}
        </div>
      )}

    </div>
  );
}

// Variável global para evitar fechamento acidental ao clicar em grifos (bypassa closures)
let globalLastHighlightClick = 0;

export default function EpubReader({ book, onBack, onUpdateBook }: EpubReaderProps) {
  return (
    <EpubProvider book={book}>
      <EpubCore book={book} onBack={onBack} onUpdateBook={onUpdateBook} />
    </EpubProvider>
  );
}
