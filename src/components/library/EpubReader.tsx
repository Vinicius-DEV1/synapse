import React, { useState, useEffect, useRef } from 'react';
import ePub, { Book, Rendition } from 'epubjs';
import { ArrowLeft, ZoomIn, ZoomOut, Sun, Moon, Settings, Menu, Bookmark, Search, Sparkles, BookOpen, Trash2 } from 'lucide-react';
import type { LibraryBook, LibraryHighlight, LibraryBookmark } from '../../types';
import { getSettings } from '../../utils/settings';
import { getValidAccessToken, downloadFromDrive } from '../../services/drive';
import { decryptFile } from '../../services/storage';
import { useStore } from '../../store/useStore';

interface EpubReaderProps {
  book: LibraryBook;
  onBack: () => void;
  onUpdateBook: (updates: Partial<LibraryBook>) => void;
}

export default function EpubReader({ book, onBack, onUpdateBook }: EpubReaderProps) {
  const { state, dispatch } = useStore();
  const [loading, setLoading] = useState(true);
  const [epubError, setEpubError] = useState<string | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  
  // Kindle-like settings
  const [fontSize, setFontSize] = useState(100);
  const [readingMode, setReadingMode] = useState<'light' | 'sepia' | 'dark'>('light');
  const [showSettings, setShowSettings] = useState(false);
  
  const [progress, setProgress] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [locationsReady, setLocationsReady] = useState(false);
  
  // Advanced Features State
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'opendyslexic'>('sans');
  const [showToc, setShowToc] = useState(false);
  const [toc, setToc] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [selection, setSelection] = useState<{ cfiRange: string, text: string, rect: DOMRect, existingHighlightId?: string } | null>(null);
  const [bookmarks, setBookmarks] = useState<LibraryBookmark[]>([]);
  const [highlights, setHighlights] = useState<LibraryHighlight[]>([]);
  const [showNotebook, setShowNotebook] = useState(false);
  const [notebookTab, setNotebookTab] = useState<'highlights' | 'bookmarks'>('highlights');
  const [noteMode, setNoteMode] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [scrollMode, setScrollMode] = useState(false);
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);

  // Load EPUB
  useEffect(() => {
    let active = true;
    const loadBook = async () => {
      try {
        setLoading(true);
        let arrayBuffer: ArrayBuffer;

        if (book.drive_file_id) {
          const token = await getValidAccessToken();
          if (!token) throw new Error('Não autenticado no Google Drive');
          const blob = await downloadFromDrive(book.drive_file_id, token);
          arrayBuffer = await blob.arrayBuffer();
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
            // Decrypt se foi salvo usando E2EE antigo
            const bytes = await decryptFile(book.file_path);
            arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
          }
        } else {
          throw new Error('Nenhum arquivo encontrado para este livro.');
        }

        if (!active) return;

        const epubBook = ePub(arrayBuffer);
        bookRef.current = epubBook;

        await epubBook.ready;
        if (!active) return;
        
        if (viewerRef.current) {
           const newRendition = epubBook.renderTo(viewerRef.current, {
             width: '100%',
             height: '100%',
             spread: 'none',
             manager: scrollMode ? 'continuous' : 'default',
             flow: scrollMode ? 'scrolled' : 'paginated'
           });
           
           setRendition(newRendition);
           
           if (book.last_read_page && typeof book.last_read_page === 'string') {
              await newRendition.display(book.last_read_page as string);
           } else {
              await newRendition.display();
           }

           // Load existing highlights
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
           
           // Load existing bookmarks
           window.api.library.getBookmarks(book.id).then((bms: LibraryBookmark[]) => {
              setBookmarks(bms);
           });

           // Generate locations in background for progress tracking
           epubBook.ready.then(() => {
              // Load TOC
              epubBook.loaded.navigation.then(nav => {
                 setToc(nav.toc);
              });
              
              return epubBook.locations.generate(1600);
           }).then((locations) => {
              if (!active) return;
              setTotalPages(locations.length);
              setLocationsReady(true);
              
              // Force update progress for current page now that locations are ready
              if (newRendition.location && newRendition.location.start) {
                const percentage = epubBook.locations.percentageFromCfi(newRendition.location.start.cfi);
                setProgress(percentage);
                const current = epubBook.locations.locationFromCfi(newRendition.location.start.cfi);
                setCurrentPage(current);
              }
           }).catch(console.error);

           // Selection listener for AI & Highlights
           newRendition.on('selected', (cfiRange: string, contents: any) => {
              const windowSelection = contents.window.getSelection();
              const text = windowSelection.toString();
              
              if (text) {
                 const range = windowSelection.getRangeAt(0);
                 const rect = range.getBoundingClientRect();
                 setSelection({ cfiRange, text, rect });
              }
           });
           
           // Hooks for UI (hide settings on click)
           newRendition.on('click', () => {
              setShowSettings(false);
              setSelection(null);
              setNoteMode(null);
           });
           
           newRendition.on('keyup', (event: any) => {
              if (event.key === 'ArrowRight') epubBook.rendition?.next();
              if (event.key === 'ArrowLeft') epubBook.rendition?.prev();
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
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  }, [book.id, scrollMode]);

  useEffect(() => {
    if (rendition) {
      rendition.themes.select(readingMode);
    }
  }, [readingMode, rendition]);

  useEffect(() => {
    if (rendition) {
      rendition.themes.fontSize(`${fontSize}%`);
      
      const font = fontFamily === 'serif' ? 'Georgia, serif' : fontFamily === 'opendyslexic' ? 'OpenDyslexic, sans-serif' : 'Inter, sans-serif';
      
      const lightTheme = { 'body': { 'background': '#ffffff !important', 'color': '#333333 !important', 'font-family': `${font} !important` }};
      const sepiaTheme = { 'body': { 'background': '#f4ecd8 !important', 'color': '#5b4636 !important', 'font-family': `${font} !important` }};
      const darkTheme = { 'body': { 'background': '#1a1a1a !important', 'color': '#cccccc !important', 'font-family': `${font} !important` }};
      
      rendition.themes.register('light', lightTheme);
      rendition.themes.register('sepia', sepiaTheme);
      rendition.themes.register('dark', darkTheme);
      
      rendition.themes.select(readingMode);
    }
  }, [fontSize, fontFamily, readingMode, rendition]);

  const handlePrev = () => rendition?.prev();
  const handleNext = () => rendition?.next();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !bookRef.current) return;
    setSearchLoading(true);
    setSearchResults([]);
    const results: any[] = [];
    
    try {
      // epub.js allows finding text in spine items
      await Promise.all(
        bookRef.current.spine.spineItems.map(async (item: any) => {
          try {
            await item.load(bookRef.current!.load.bind(bookRef.current));
            const matches = item.find(searchQuery);
            if (matches && matches.length > 0) {
              results.push(...matches);
            }
          } catch (e) {
             // Ignore unloadable items
          } finally {
            item.unload();
          }
        })
      );
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed", err);
    }
    setSearchLoading(false);
  };

  const handleCreateHighlight = async (color: string) => {
    if (!selection || !rendition) return;
    try {
      const colorMap: any = { yellow: '#fbbf24', green: '#34d399', blue: '#60a5fa', pink: '#f472b6' };
      
      if (selection.existingHighlightId) {
        await window.api.library.updateHighlight({
          id: selection.existingHighlightId,
          color,
          note: noteText || undefined
        });
        setHighlights(prev => prev.map(h => h.id === selection.existingHighlightId ? { ...h, color, note: noteText || undefined } : h));
        rendition.annotations.remove(selection.cfiRange, "highlight");
        rendition.annotations.highlight(selection.cfiRange, {}, (e: any) => {
          const rect = e.target.getBoundingClientRect();
          setSelection({ cfiRange: selection.cfiRange, text: selection.text, rect, existingHighlightId: selection.existingHighlightId });
          setNoteMode(color);
          setNoteText(noteText || '');
        }, '', { fill: colorMap[color], 'fill-opacity': '0.3', 'cursor': 'pointer' });
      } else {
        rendition.annotations.highlight(selection.cfiRange, {}, (e: any) => {
          const rect = e.target.getBoundingClientRect();
          setSelection({ cfiRange: selection.cfiRange, text: selection.text, rect });
          setNoteMode(color);
        }, '', { fill: colorMap[color], 'fill-opacity': '0.3', 'cursor': 'pointer' });
        
        const hl = await window.api.library.createHighlight({
          book_id: book.id,
          page_number: 0,
          text_content: selection.text,
          color,
          rects: selection.cfiRange,
          highlight_type: 'text',
          note: noteText || undefined
        });
        setHighlights(prev => [...prev, hl]);
      }
    } catch (e) {
      console.error(e);
    }
    setSelection(null);
    setNoteMode(null);
    setNoteText('');
  };

  const handleDeleteHighlight = async (id: string, cfi: string) => {
    await window.api.library.deleteHighlight(id);
    setHighlights(prev => prev.filter(h => h.id !== id));
    rendition?.annotations.remove(cfi, "highlight");
  };

  const handleDeleteBookmark = async (id: string) => {
    await window.api.library.deleteBookmark(id);
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const currentCfi = rendition?.location?.start?.cfi;
  const isBookmarked = bookmarks.some(b => b.label === currentCfi);

  const handleToggleBookmark = async () => {
    if (!currentCfi) return;
    if (isBookmarked) {
      const bm = bookmarks.find(b => b.label === currentCfi);
      if (bm) {
        await window.api.library.deleteBookmark(bm.id);
        setBookmarks(prev => prev.filter(b => b.id !== bm.id));
      }
    } else {
      const bm = await window.api.library.createBookmark({
        book_id: book.id,
        page_number: currentPage,
        label: currentCfi
      });
      setBookmarks(prev => [...prev, bm]);
    }
  };

  useEffect(() => {
    if (!rendition) return;

    const onRelocated = (location: any) => {
      onUpdateBook({ last_read_page: location.start.cfi as any });
      
      if (locationsReady && bookRef.current) {
        const percentage = bookRef.current.locations.percentageFromCfi(location.start.cfi);
        setProgress(percentage);
        const current = bookRef.current.locations.locationFromCfi(location.start.cfi);
        setCurrentPage(current);
      }
    };

    rendition.on('relocated', onRelocated);
    return () => { rendition.off('relocated', onRelocated); };
  }, [rendition, locationsReady]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rendition]);

  return (
    <div className={`h-full flex flex-col ${readingMode === 'dark' ? 'bg-[#0f0e17]' : readingMode === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-white'}`}>
      {/* Barra Superior */}
      <div className={`flex-shrink-0 h-14 flex items-center justify-between px-4 z-20 shadow-sm border-b transition-colors
          ${readingMode === 'dark' ? 'bg-[#1a1a1a] border-gray-800 text-gray-200' : 
            readingMode === 'sepia' ? 'bg-[#e9dec0] border-[#d4c6a0] text-[#5b4636]' : 
            'bg-white border-gray-200 text-gray-800'}`}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={onBack}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 
              ${readingMode === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-black/5'}`}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate" title={book.title}>{book.title}</h1>
            <div className="text-xs opacity-70 truncate">{book.author || 'Desconhecido'}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
            <button onClick={() => setShowToc(!showToc)} className={`p-2 rounded-lg transition-colors ${showToc ? 'bg-brand-500/20 text-brand-500' : (readingMode === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-black/5')}`} title="Índice (Sumário)">
              <Menu size={18} />
            </button>
            <button onClick={() => setShowNotebook(!showNotebook)} className={`p-2 rounded-lg transition-colors ${showNotebook ? 'bg-brand-500/20 text-brand-500' : (readingMode === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-black/5')}`} title="Caderno (Meus Recortes)">
              <BookOpen size={18} />
            </button>
            <button onClick={handleToggleBookmark} className={`p-2 rounded-lg transition-colors ${isBookmarked ? 'bg-brand-500/20 text-brand-500' : (readingMode === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-black/5')}`} title="Marcador">
              <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
            </button>
            <button onClick={() => setShowSearch(!showSearch)} className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-brand-500/20 text-brand-500' : (readingMode === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-black/5')}`} title="Buscar">
              <Search size={18} />
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-brand-500/20 text-brand-500' : (readingMode === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-black/5')}`} title="Tipografia">
              <Settings size={18} />
            </button>
            <button onClick={() => dispatch({ type: 'TOGGLE_AI_SIDEBAR' })} className={`p-2 rounded-lg transition-colors ${state.showAiSidebar ? 'bg-brand-500/20 text-brand-500' : (readingMode === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-black/5')}`} title="IA">
              <span className="font-bold font-serif px-1">AI</span>
            </button>
          </div>
        </div>


      {/* Dropdown de Tipografia */}
      {showSettings && (
        <div className={`absolute top-16 right-4 p-4 rounded-2xl shadow-2xl z-30 border w-64
           ${readingMode === 'dark' ? 'bg-[#1a1a1a] border-gray-800 text-gray-200' : 
             readingMode === 'sepia' ? 'bg-[#f4ecd8] border-[#d4c6a0] text-[#5b4636]' : 
             'bg-white border-gray-200 text-gray-800'}`}>
          
          <div className="mb-4">
            <div className="text-xs font-semibold mb-2 opacity-70 uppercase tracking-wider">Tamanho da Fonte</div>
            <div className="flex items-center justify-between bg-black/5 rounded-lg p-1">
              <button onClick={() => setFontSize(f => Math.max(50, f - 10))} className="p-2 hover:bg-black/5 rounded-md flex-1 flex justify-center">
                <ZoomOut size={18} />
              </button>
              <span className="text-sm font-medium w-12 text-center">{fontSize}%</span>
              <button onClick={() => setFontSize(f => Math.min(250, f + 10))} className="p-2 hover:bg-black/5 rounded-md flex-1 flex justify-center">
                <ZoomIn size={18} />
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="text-xs font-semibold mb-2 opacity-70 uppercase tracking-wider">Estilo da Fonte</div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setFontFamily('sans')} className={`px-3 py-2 rounded-lg text-sm text-left ${fontFamily === 'sans' ? 'bg-brand-500 text-white' : 'hover:bg-black/5'}`} style={{ fontFamily: 'sans-serif' }}>Sem Serifa (Moderno)</button>
              <button onClick={() => setFontFamily('serif')} className={`px-3 py-2 rounded-lg text-sm text-left ${fontFamily === 'serif' ? 'bg-brand-500 text-white' : 'hover:bg-black/5'}`} style={{ fontFamily: 'serif' }}>Com Serifa (Clássico)</button>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold mb-2 opacity-70 uppercase tracking-wider">Tema de Leitura</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setReadingMode('light')} className={`w-8 h-8 rounded-full bg-white border-2 ${readingMode === 'light' ? 'border-brand-500' : 'border-gray-300'}`} />
              <button onClick={() => setReadingMode('sepia')} className={`w-8 h-8 rounded-full bg-[#f4ecd8] border-2 ${readingMode === 'sepia' ? 'border-brand-500' : 'border-gray-300'}`} />
              <button onClick={() => setReadingMode('dark')} className={`w-8 h-8 rounded-full bg-[#1a1a1a] border-2 ${readingMode === 'dark' ? 'border-brand-500' : 'border-gray-700'}`} />
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm font-semibold opacity-80 flex flex-col">
                <span>Leitura Contínua</span>
                <span className="text-[10px] opacity-60 font-normal">Rolar página verticalmente</span>
              </div>
              <button 
                onClick={() => setScrollMode(!scrollMode)}
                className={`w-10 h-6 rounded-full transition-colors relative flex items-center ${scrollMode ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm absolute transition-transform ${scrollMode ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOC Sidebar */}
      {showToc && (
        <div className={`absolute left-0 top-14 bottom-8 w-72 z-30 overflow-y-auto border-r shadow-xl transition-transform
           ${readingMode === 'dark' ? 'bg-[#1a1a1a] border-gray-800 text-gray-200' : 
             readingMode === 'sepia' ? 'bg-[#f4ecd8] border-[#d4c6a0] text-[#5b4636]' : 
             'bg-white border-gray-200 text-gray-800'}`}>
          <div className="p-4">
            <h3 className="font-bold text-lg mb-4 opacity-80">Sumário</h3>
            {toc.length === 0 ? (
              <p className="opacity-50 text-sm">Nenhum sumário encontrado.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {toc.map((item, index) => (
                  <li key={index}>
                    <button 
                      onClick={() => {
                        rendition?.display(item.href);
                        setShowToc(false);
                      }}
                      className="text-left w-full hover:text-brand-500 opacity-80 hover:opacity-100 transition-opacity"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Search Sidebar */}
      {showSearch && (
        <div className={`absolute left-0 top-14 bottom-8 w-80 z-30 overflow-y-auto border-r shadow-xl transition-transform
           ${readingMode === 'dark' ? 'bg-[#1a1a1a] border-gray-800 text-gray-200' : 
             readingMode === 'sepia' ? 'bg-[#f4ecd8] border-[#d4c6a0] text-[#5b4636]' : 
             'bg-white border-gray-200 text-gray-800'}`}>
          <div className="p-4">
            <h3 className="font-bold text-lg mb-4 opacity-80">Buscar no Livro</h3>
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite para buscar..."
                className={`flex-1 px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-brand-500 transition-colors
                  ${readingMode === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white' : 
                    readingMode === 'sepia' ? 'bg-[#e9dec0] border-[#d4c6a0] text-[#5b4636]' : 
                    'bg-gray-50 border-gray-200'}`}
              />
              <button 
                type="submit"
                disabled={searchLoading || !searchQuery.trim()}
                className="p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
              >
                <Search size={18} />
              </button>
            </form>

            {searchLoading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-brand-500"></div>
              </div>
            ) : searchResults.length > 0 ? (
              <ul className="space-y-3">
                {searchResults.map((res, index) => (
                  <li key={index} className="text-sm">
                    <button 
                      onClick={() => {
                        rendition?.display(res.cfi);
                        setShowSearch(false);
                      }}
                      className="text-left w-full hover:bg-black/5 p-2 rounded-lg transition-colors"
                    >
                      <div className="opacity-80 line-clamp-3 leading-snug">
                         ...{res.excerpt}...
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : searchQuery && !searchLoading ? (
              <p className="opacity-50 text-sm text-center">Nenhum resultado encontrado.</p>
            ) : null}
          </div>
        </div>
      )}

      {/* Notebook Sidebar */}
      {showNotebook && (
        <div className={`absolute left-0 top-14 bottom-8 w-80 z-30 overflow-y-auto border-r shadow-xl transition-transform
           ${readingMode === 'dark' ? 'bg-[#1a1a1a] border-gray-800 text-gray-200' : 
             readingMode === 'sepia' ? 'bg-[#f4ecd8] border-[#d4c6a0] text-[#5b4636]' : 
             'bg-white border-gray-200 text-gray-800'}`}>
          <div className="p-4">
            <h3 className="font-bold text-lg mb-4 opacity-80 flex items-center gap-2">
              <BookOpen size={20} /> Meus Recortes
            </h3>
            
            <div className="flex gap-2 mb-4 border-b pb-2">
              <button 
                onClick={() => setNotebookTab('highlights')}
                className={`flex-1 text-sm font-semibold pb-1 border-b-2 transition-colors ${notebookTab === 'highlights' ? 'border-brand-500 text-brand-500' : 'border-transparent opacity-60'}`}
              >
                Grifos
              </button>
              <button 
                onClick={() => setNotebookTab('bookmarks')}
                className={`flex-1 text-sm font-semibold pb-1 border-b-2 transition-colors ${notebookTab === 'bookmarks' ? 'border-brand-500 text-brand-500' : 'border-transparent opacity-60'}`}
              >
                Marcadores
              </button>
            </div>

            {notebookTab === 'highlights' && (
              highlights.length === 0 ? (
                <p className="opacity-50 text-sm text-center">Nenhum texto grifado ainda.</p>
              ) : (
                <ul className="space-y-4">
                  {highlights.map(hl => (
                    <li key={hl.id} className="text-sm p-3 rounded-lg border bg-black/5 dark:bg-white/5 relative group">
                      <div className="flex justify-between items-start mb-2">
                        <div className={`w-3 h-3 rounded-full shadow-sm flex-shrink-0 mt-1`} style={{ backgroundColor: { yellow: '#fbbf24', green: '#34d399', blue: '#60a5fa', pink: '#f472b6' }[hl.color as string] || '#fbbf24' }} />
                        <button 
                          onClick={() => handleDeleteHighlight(hl.id, hl.rects)}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-1 rounded transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <button 
                        onClick={() => {
                          rendition?.display(hl.rects);
                          setShowNotebook(false);
                        }}
                        className="text-left w-full hover:text-brand-500 transition-colors"
                      >
                        <div className="opacity-90 italic leading-snug">
                           "{hl.text_content}"
                        </div>
                        {hl.note && (
                          <div className="mt-2 text-xs font-medium text-brand-600 dark:text-brand-400 p-2 bg-white/50 dark:bg-black/20 rounded">
                            📝 {hl.note}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}

            {notebookTab === 'bookmarks' && (
              bookmarks.length === 0 ? (
                <p className="opacity-50 text-sm text-center">Nenhum marcador criado ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {bookmarks.map(bm => (
                    <li key={bm.id} className="text-sm border-b border-black/5 dark:border-white/5 pb-2 last:border-0 relative group flex items-center justify-between">
                      <button 
                        onClick={() => {
                          rendition?.display(bm.label);
                          setShowNotebook(false);
                        }}
                        className="text-left flex-1 hover:text-brand-500 transition-colors flex items-center gap-2"
                      >
                        <Bookmark size={14} className="text-brand-500" />
                        Página Marcada
                      </button>
                      <button 
                        onClick={() => handleDeleteBookmark(bm.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-1 rounded transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        </div>
      )}

      {/* Viewer Core */}
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

        {/* Selection / Highlight Menu */}
        {selection && (
          <div 
            className="absolute z-40 bg-white dark:bg-gray-800 shadow-2xl rounded-xl border border-gray-200 dark:border-gray-700 p-1.5 flex gap-1.5 items-center animate-fade-in"
            style={{ 
              top: Math.max(10, selection.rect.top - (noteMode ? 120 : 50)) + 'px', 
              left: Math.max(10, selection.rect.left + (selection.rect.width / 2) - 80) + 'px'
            }}
          >
            {noteMode ? (
              <div className="flex flex-col gap-1.5 p-1 w-56">
                <textarea
                  autoFocus
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Escreva sua nota aqui..."
                  className={`w-full text-xs p-2 border rounded-lg resize-none focus:outline-brand-500 ${readingMode === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white' : 'bg-gray-50 border-gray-200'}`}
                  rows={3}
                />
                <div className="flex justify-between items-center mt-1">
                  {selection.existingHighlightId && (
                    <button 
                      onClick={() => {
                        handleDeleteHighlight(selection.existingHighlightId!, selection.cfiRange);
                        setSelection(null);
                        setNoteMode(null);
                      }}
                      className="text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors"
                      title="Excluir Grifo"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="flex gap-1.5 ml-auto">
                    <button onClick={() => { setNoteMode(null); setNoteText(''); }} className="px-2 py-1 text-xs opacity-70 hover:opacity-100">Cancelar</button>
                    <button onClick={() => handleCreateHighlight(noteMode)} className="px-2 py-1 bg-brand-500 text-white rounded-md text-xs font-bold hover:bg-brand-600">Salvar</button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <button onClick={() => handleCreateHighlight('yellow')} className="w-6 h-6 rounded-full bg-yellow-400 hover:scale-110 transition-transform shadow-sm" />
                <button onClick={() => handleCreateHighlight('green')} className="w-6 h-6 rounded-full bg-green-400 hover:scale-110 transition-transform shadow-sm" />
                <button onClick={() => handleCreateHighlight('blue')} className="w-6 h-6 rounded-full bg-blue-400 hover:scale-110 transition-transform shadow-sm" />
                <button onClick={() => handleCreateHighlight('pink')} className="w-6 h-6 rounded-full bg-pink-400 hover:scale-110 transition-transform shadow-sm" />
                
                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
                
                <button onClick={() => setNoteMode('yellow')} className="text-xs font-medium opacity-80 hover:opacity-100 px-1 py-1 flex items-center gap-1">
                  📝 Nota
                </button>

                <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />
                
                <button 
                  onClick={() => {
                    dispatch({ type: 'TOGGLE_AI_SIDEBAR' });
                    setSelection(null);
                  }}
                  className="px-2 py-1 bg-brand-500 text-white rounded-md text-[11px] font-bold hover:bg-brand-600 transition-colors flex items-center gap-1"
                >
                  <Sparkles size={11} />
                  Explicar
                </button>
              </>
            )}
          </div>
        )}

        {/* Hitbox gigante na Esquerda (30% da tela) */}
        <button 
          onClick={handlePrev} 
          className="absolute left-0 top-0 bottom-0 w-[30%] z-10 cursor-pointer group"
        >
          {/* O visual hover fica encostado no canto, mas o clique é em 30% da tela */}
          <div className={`absolute left-0 top-0 bottom-0 w-16 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center ${readingMode === 'dark' ? 'bg-gradient-to-r from-black/50 to-transparent text-white' : 'bg-gradient-to-r from-black/10 to-transparent text-black'}`}>
            <ArrowLeft size={32} />
          </div>
        </button>
        
        <div ref={viewerRef} className="w-full h-full max-w-4xl mx-auto" style={{ padding: '0 40px' }} />

        <button 
          onClick={handleNext} 
          className="absolute right-0 top-0 bottom-0 w-[30%] z-10 cursor-pointer group"
        >
          <div className={`absolute right-0 top-0 bottom-0 w-16 transition-opacity opacity-0 group-hover:opacity-100 flex items-center justify-center ${readingMode === 'dark' ? 'bg-gradient-to-l from-black/50 to-transparent text-white' : 'bg-gradient-to-l from-black/10 to-transparent text-black'}`}>
             <ArrowLeft size={32} className="rotate-180" />
          </div>
        </button>
      </div>

      {/* Barra Inferior (Progresso Kindle) */}
      <div className={`flex-shrink-0 h-8 flex items-center justify-between px-6 text-[11px] font-medium tracking-wider uppercase transition-colors z-20
          ${readingMode === 'dark' ? 'bg-[#1a1a1a] text-gray-500' : 
            readingMode === 'sepia' ? 'bg-[#e9dec0] text-[#8c765f]' : 
            'bg-white text-gray-400'}`}>
        <div>
           {locationsReady ? `Página ${currentPage} de ${totalPages}` : 'Calculando páginas...'}
        </div>
        <div>
           {locationsReady ? `${Math.round(progress * 100)}%` : '...'}
        </div>
      </div>
    </div>
  );
}
