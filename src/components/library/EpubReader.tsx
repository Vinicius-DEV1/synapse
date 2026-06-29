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
    setProgress, setCurrentPage, setSelection, setNoteMode, setNoteText,
    setShowSettings, setHighlights, setBookmarks, setToc
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

  const [showMobileTools, setShowMobileTools] = useState(false);
  const toolsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    // Quando showMobileTools for false, estamos em fullscreen (hide sidebar toggle)
    dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: !showMobileTools });
    
    // Ao desmontar o leitor, volta para o estado normal (menu sempre acessível)
    return () => {
      dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: false });
    };
  }, [showMobileTools, dispatch]);

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
          arrayBuffer = await window.api.library.getBookFile(book.id);
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
              hls.forEach(h => {
                if (h.rects) {
                  const colorMap: any = { yellow: '#fbbf24', green: '#34d399', blue: '#60a5fa', pink: '#f472b6' };
                  newRendition.annotations.highlight(h.rects, {}, (e: any) => {
                    // Cancelar o timer de limpeza do click geral — um grifo foi tocado
                    if (clearSelectionTimerRef.current) {
                      clearTimeout(clearSelectionTimerRef.current);
                      clearSelectionTimerRef.current = null;
                    }
                    const rect = e.target.getBoundingClientRect();
                    setSelection({ cfiRange: h.rects, text: h.text_content, rect, existingHighlightId: h.id });
                    setNoteMode(h.color || 'yellow');
                    setNoteText(h.note || '');
                  }, '', { fill: colorMap[h.color] || colorMap.yellow, 'fill-opacity': '0.3', 'cursor': 'pointer' });
                }
              });
           });
           
           window.api.library.getBookmarks(book.id).then((bms: LibraryBookmark[]) => {
              setBookmarks(bms);
           });

           newEpubBook.ready.then(() => {
              newEpubBook.loaded.navigation.then(nav => setToc(nav.toc));
              return newEpubBook.locations.generate(1600);
            }).then((locations) => {
               if (!active) return;
               setTotalPages(locations.length);
               setLocationsReady(true);
               
               const updates: Partial<LibraryBook> = { total_pages: locations.length };
               
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
                 
                 // Bloqueio de eventos fantasmas do epub.js (seleções colapsadas/inválidas)
                 if (rect.width === 0 && rect.height === 0) return;
                 
                 let offsetX = 0;
                 let offsetY = 0;
                 const iframe = viewerRef.current?.querySelector('iframe');
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
                    setSelection({ cfiRange, text, rect: safeRect });
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
             // Desktop: limpa seleção no clique normal
             if (clearSelectionTimerRef.current) clearTimeout(clearSelectionTimerRef.current);
             clearSelectionTimerRef.current = setTimeout(() => {
               clearSelectionTimerRef.current = null;
               setSelection(null);
               setNoteMode(null);
               handleEpubClick();
             }, 80);
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
      
      // Detecta se estamos no Mobile ou Web App via tamanho de tela e userAgent
      // Se for mobile, precisamos de 60px de padding para não conflitar com a barra inferior flutuante ou gestos de iOS.
      // Se for desktop, 16px é suficiente apenas para o texto não ficar grudado no rodapé inferior fixo, o que libera ~3 linhas úteis!
      const isMobileView = window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const bottomPadding = isMobileView ? '60px' : '16px';

      const themeCss: any = {
        'body': { 
          'background': `${colors.bg} !important`, 
          'color': `${colors.text} !important`, 
          'padding-bottom': `${bottomPadding} !important` 
        }
      };

      if (fontFamily !== 'original') {
        themeCss['body']['font-family'] = `${font} !important`;
        themeCss['*'] = { 'font-family': `${font} !important` };
        themeCss['p, span, div, h1, h2, h3, h4, h5, h6, a, li, blockquote'] = {
            'font-family': `${font} !important`
        };
      }
          
      rendition.themes.register('custom', themeCss);
      rendition.themes.select('custom');
    }
  }, [fontSize, fontFamily, readingMode, rendition]);

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
      setModeToast(modeNames[nextMode]);
      return nextMode as any;
    });
  };

  const changeZoom = (delta: number) => {
    setFontSize((prev: number) => {
      const next = Math.max(50, Math.min(300, prev + delta));
      setModeToast(`Zoom: ${next}% ${detectedFontSizePx ? `(${detectedFontSizePx})` : ''}`);
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [rendition, setReadingMode, setFontSize]);

  const { progress, currentPage, totalPages } = useEpub();
  const progressPercentage = Math.round((progress || 0) * 100);
  const currentPageSafe = currentPage || 0;
  const totalPagesSafe = totalPages || 0;
  const isDark = ['dark', 'dim', 'nord', 'midnight', 'high-contrast'].includes(readingMode);
  
  const bottomBarClasses = readingMode === 'dark' ? 'bg-[#1a1a1a] text-gray-500' : 
    readingMode === 'midnight' ? 'bg-[#0f172a] text-[#475569]' : 
    readingMode === 'nord' ? 'bg-[#2e3440] text-[#4c566a]' : 
    readingMode === 'dim' ? 'bg-[#2d2d30] text-[#808080]' : 
    readingMode === 'high-contrast' ? 'bg-[#000000] text-[#aaaaaa]' : 
    readingMode === 'sepia' ? 'bg-[#e9dec0] text-[#8c765f]' : 
    readingMode === 'mint' ? 'bg-[#c8e6c9] text-[#2d6a4f]' : 
    'bg-white text-gray-400';

  return (
    <div className={`h-full flex flex-col reading-mode-${readingMode} ${readingMode === 'dark' ? 'bg-[#1a1a2e]' : readingMode === 'sepia' ? 'bg-[#f4ecd8]' : readingMode === 'mint' ? 'bg-[#e8f5e9]' : readingMode === 'dim' ? 'bg-[#2d2d30]' : readingMode === 'nord' ? 'bg-[#2e3440]' : readingMode === 'midnight' ? 'bg-[#0f172a]' : readingMode === 'high-contrast' ? 'bg-black' : 'bg-white'}`}>
      <div className={`
        md:block flex-shrink-0 transition-transform duration-300 z-50
        ${showMobileTools ? 'translate-y-0' : '-translate-y-full md:translate-y-0'}
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
        
        <div ref={viewerRef} className="w-full h-full max-w-4xl mx-auto px-2 sm:px-10" />

        <button onClick={() => turnPage('next')} className="hidden sm:block absolute right-0 top-0 bottom-0 w-16 z-10 cursor-pointer group">
          <div className={`absolute right-0 top-0 bottom-0 w-16 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center ${isDark ? 'bg-gradient-to-l from-black/50 to-transparent text-white' : 'bg-gradient-to-l from-black/10 to-transparent text-black'}`}>
             <ArrowLeft size={24} className="rotate-180" />
          </div>
        </button>
      </div>
      </div>

      <div className={`flex-shrink-0 h-8 flex items-center justify-between px-6 text-[11px] font-medium tracking-wider uppercase transition-colors z-20
          ${readingMode === 'dark' ? 'bg-[#1a1a1a] text-gray-500' : 
            readingMode === 'midnight' ? 'bg-[#0f172a] text-[#475569]' : 
            readingMode === 'nord' ? 'bg-[#2e3440] text-[#4c566a]' : 
            readingMode === 'dim' ? 'bg-[#2d2d30] text-[#808080]' : 
            readingMode === 'high-contrast' ? 'bg-[#000000] text-[#aaaaaa]' : 
            readingMode === 'sepia' ? 'bg-[#e9dec0] text-[#8c765f]' : 
            readingMode === 'mint' ? 'bg-[#c8e6c9] text-[#2d6a4f]' : 
            'bg-white text-gray-400'}`}>
        <div>
           {locationsReady ? `Página ${currentPageSafe} de ${totalPagesSafe}` : 'Calculando páginas...'}
        </div>
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

export default function EpubReader(props: EpubReaderProps) {
  return (
    <EpubProvider book={props.book}>
      <EpubCore {...props} />
    </EpubProvider>
  );
}
