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
    readingMode, scrollMode, fontSize, fontFamily,
    locationsReady, setLocationsReady, setTotalPages,
    setProgress, setCurrentPage, setSelection, setNoteMode, setNoteText,
    setShowSettings, setHighlights, setBookmarks, setToc
  } = useEpub();

  const { state } = useStore();
  const masterKey = state.moduleKeys['library'];

  const [loading, setLoading] = useState(true);
  const [epubError, setEpubError] = useState<string | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Load EPUB
  useEffect(() => {
    let active = true;
    const loadBook = async () => {
      try {
        setLocationsReady(false);
        setLoading(true);
        let arrayBuffer: ArrayBuffer;

        if (book.drive_file_id) {
          const token = await getValidAccessToken();
          if (!token) throw new Error('Não autenticado no Google Drive');
          const encryptedData = await downloadFromDrive(token, book.drive_file_id);
          if (masterKey) {
            arrayBuffer = await decryptFile(encryptedData, masterKey);
          } else {
            // Fallback: try using it directly (unencrypted legacy)
            arrayBuffer = encryptedData;
          }
        } else if (book.file_path) {
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
        } else {
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
                    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
                    if (isMobile) {
                       // FORÇA BRUTA: Limpar seleção nativa para esconder menu do Android/iOS
                       contents.window.getSelection().removeAllRanges();
                       // Adicionar marcador visual temporário (azul claro) para o usuário não perder a referência
                       newRendition.annotations.highlight(cfiRange, {}, (e: any) => {}, 'temp-selection', { fill: '#b4d5fe', 'fill-opacity': '0.5' });
                       // Salvar no elemento para podermos remover depois
                       (newRendition as any)._tempSelectionCfi = cfiRange;
                    }
                    setSelection({ cfiRange, text, rect: safeRect });
                 }, 50);
              }
           });
           
           newRendition.on('click', () => {
             setShowSettings(false);
             
             // Remover marcador temporário se existir
             const tempCfi = (newRendition as any)._tempSelectionCfi;
             if (tempCfi) {
               newRendition.annotations.remove(tempCfi, 'highlight');
               (newRendition as any)._tempSelectionCfi = null;
             }
             
             setSelection(null);
             setNoteMode(null);
             handleEpubClick();
           });

           newRendition.on('touchstart', (event: TouchEvent) => {
             const touch = event.changedTouches[0];
             (newRendition as any)._touchStartX = touch.screenX;
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
           
           newRendition.on('keyup', (event: any) => {
              if (event.key === 'ArrowRight') turnPage('next', newRendition);
              if (event.key === 'ArrowLeft') turnPage('prev', newRendition);
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

    loadBook();

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
      
      const themeCss = readingMode === 'dark' 
          ? { 'body': { 'background': '#1a1a1a !important', 'color': '#cccccc !important', 'font-family': `${font} !important`, 'padding-bottom': '60px !important' }}
          : readingMode === 'sepia' 
          ? { 'body': { 'background': '#f4ecd8 !important', 'color': '#5b4636 !important', 'font-family': `${font} !important`, 'padding-bottom': '60px !important' }}
          : { 'body': { 'background': '#ffffff !important', 'color': '#333333 !important', 'font-family': `${font} !important`, 'padding-bottom': '60px !important' }};
          
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') rendition?.next();
      if (e.key === 'ArrowLeft') rendition?.prev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rendition]);

  const progressPercentage = Math.round((useEpub().progress || 0) * 100);
  const currentPageSafe = useEpub().currentPage || 0;
  const totalPagesSafe = useEpub().totalPages || 0;

  return (
    <div className={`h-full flex flex-col ${readingMode === 'dark' ? 'bg-[#0f0e17]' : readingMode === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-white'}`}>
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
          <div className={`absolute left-0 top-0 bottom-0 w-16 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center ${readingMode === 'dark' ? 'bg-gradient-to-r from-black/50 to-transparent text-white' : 'bg-gradient-to-r from-black/10 to-transparent text-black'}`}>
            <ArrowLeft size={24} />
          </div>
        </button>
        
        <div ref={viewerRef} className="w-full h-full max-w-4xl mx-auto px-2 sm:px-10" />

        <button onClick={() => turnPage('next')} className="hidden sm:block absolute right-0 top-0 bottom-0 w-16 z-10 cursor-pointer group">
          <div className={`absolute right-0 top-0 bottom-0 w-16 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center ${readingMode === 'dark' ? 'bg-gradient-to-l from-black/50 to-transparent text-white' : 'bg-gradient-to-l from-black/10 to-transparent text-black'}`}>
             <ArrowLeft size={24} className="rotate-180" />
          </div>
        </button>
      </div>
      </div>

      <div className={`flex-shrink-0 h-8 flex items-center justify-between px-6 text-[11px] font-medium tracking-wider uppercase transition-colors z-20
          ${readingMode === 'dark' ? 'bg-[#1a1a1a] text-gray-500' : 
            readingMode === 'sepia' ? 'bg-[#e9dec0] text-[#8c765f]' : 
            'bg-white text-gray-400'}`}>
        <div>
           {locationsReady ? `Página ${currentPageSafe} de ${totalPagesSafe}` : 'Calculando páginas...'}
        </div>
        <div>
           {locationsReady ? `${progressPercentage}%` : '...'}
        </div>
      </div>
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
