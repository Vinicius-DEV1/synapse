import { useState, useEffect, useRef} from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useStore } from '../../../../store/useStore';
import { resolveCanonicalBuffer } from '../../../../services/storage/canonical-resolver';
import type { LibraryBook, LibraryHighlight, LibraryBookmark } from '../../../../types';

export function usePdfDocument(book: LibraryBook, onUpdateBook: (updates: Partial<LibraryBook>) => void, currentPage: number) {
  const { state } = useStore();
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [tocItems, setTocItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionIdRef = useRef<string | null>(null);
  
  const onUpdateBookRef = useRef(onUpdateBook);
  useEffect(() => {
    onUpdateBookRef.current = onUpdateBook;
  }, [onUpdateBook]);

  const [highlights, setHighlights] = useState<LibraryHighlight[]>([]);
  const [bookmarks, setBookmarks] = useState<LibraryBookmark[]>([]);
  const [reloadCounter, setReloadCounter] = useState(0);

  const reload = () => setReloadCounter(c => c + 1);

  useEffect(() => {
    let active = true;
    const loadPdf = async () => {
      try {
        setLoading(true);
        setPdfError(null);
        
        const isAvulso = book.author === 'Arquivo Avulso';
        const moduleName = isAvulso ? 'files' : 'library';
        const masterKey = state.moduleKeys[moduleName];

        const fileData = await resolveCanonicalBuffer({
          moduleName,
          id: book.id,
          savedPath: book.file_path,
          driveFileId: book.drive_file_id,
          masterKey,
          extHint: 'pdf',
          onUpdateSavedPath: (newPath) => onUpdateBookRef.current({ id: book.id, file_path: newPath })
        });
        
        const loadingTask = pdfjsLib.getDocument({ data: fileData });
        const pdf = await loadingTask.promise;
        
        if (!active) return;
        
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        
        if (book.total_pages !== pdf.numPages || book.reading_status === 'not_started') {
          onUpdateBookRef.current({ 
            id: book.id, 
            total_pages: pdf.numPages,
            reading_status: book.reading_status === 'not_started' ? 'reading' : book.reading_status 
          });
        }

        // Load Outline (TOC)
        const outline = await pdf.getOutline();
        if (outline) {
          const processOutline = async (items: any[], level = 0) => {
            const result = [];
            for (const item of items) {
              let pageNumber = 1;
              if (item.dest) {
                const dest = typeof item.dest === 'string' ? await pdf.getDestination(item.dest) : item.dest;
                if (dest && dest[0]) {
                  try {
                    const pageIndex = await pdf.getPageIndex(dest[0]);
                    pageNumber = pageIndex + 1;
                  } catch (e) {
                    console.error("Failed to get page index for TOC item", e);
                  }
                }
              }
              const processedItem: any = { title: item.title, pageNumber, level };
              if (item.items && item.items.length > 0) {
                processedItem.children = await processOutline(item.items, level + 1);
              }
              result.push(processedItem);
            }
            return result;
          };
          setTocItems(await processOutline(outline));
        }

        const loadedHighlights = await window.api.library.getHighlights(book.id);
        const loadedBookmarks = await window.api.library.getBookmarks(book.id);
        setHighlights(loadedHighlights);
        setBookmarks(loadedBookmarks);

        const startPageNum = typeof book.last_read_page === 'number' 
          ? book.last_read_page 
          : (parseInt(String(book.last_read_page || 1), 10) || 1);

        const session = await window.api.library.startReadingSession({
          book_id: book.id,
          start_page: startPageNum
        });
        sessionIdRef.current = session.id;

        setLoading(false);
      } catch (err: any) {
        console.error("Error loading PDF:", err);
        setPdfError(err.message || "Falha desconhecida ao carregar o PDF.");
        setLoading(false);
      }
    };
    
    loadPdf();
    return () => { active = false; };
  }, [book.id, book.file_path, book.drive_file_id, state.moduleKeys, reloadCounter]);

  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        window.api.library.endReadingSession({
          id: sessionIdRef.current,
          end_page: currentPage,
          pages_read: 1
        });
      }
    };
  }, [currentPage]);

  const toggleBookmark = async (pageNum: number) => {
    const existing = bookmarks.find(b => b.page_number === pageNum);
    if (existing) {
      await window.api.library.deleteBookmark(existing.id);
      setBookmarks(prev => prev.filter(b => b.id !== existing.id));
    } else {
      const newBookmark = await window.api.library.createBookmark({
        book_id: book.id,
        page_number: pageNum,
        label: `Página ${pageNum}`
      });
      setBookmarks(prev => [...prev, newBookmark]);
    }
  };

  return {
    pdfDoc, totalPages, pdfError, loading, tocItems, highlights, setHighlights, bookmarks, setBookmarks, toggleBookmark, reload
  };
}
