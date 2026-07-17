import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { getValidAccessToken, downloadFromDrive } from '../../../../services/drive';
import { decryptFile } from '../../../../services/storage';
import { useStore } from '../../../../store/useStore';
import type { LibraryBook, LibraryHighlight, LibraryBookmark } from '../../../../types';

export function usePdfDocument(book: LibraryBook, onUpdateBook: (updates: Partial<LibraryBook>) => void, currentPage: number) {
  const { state } = useStore();
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [tocItems, setTocItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const sessionIdRef = useRef<string | null>(null);

  const [highlights, setHighlights] = useState<LibraryHighlight[]>([]);
  const [bookmarks, setBookmarks] = useState<LibraryBookmark[]>([]);

  useEffect(() => {
    let active = true;
    const loadPdf = async () => {
      try {
        setLoading(true);
        setPdfError(null);
        let fileData: any;
        let assetUrl: string | null = null;
        try {
          if (book.file_path && !book.file_path.startsWith('http')) {
             const { appDataDir, join } = await import('@tauri-apps/api/path');
             const dataDir = await appDataDir();
             let absPath = await join(dataDir, book.file_path);
             
             if (!absPath.endsWith('.enc') && !book.file_path.endsWith('.enc')) {
                 absPath = absPath + '.enc';
             }
             assetUrl = `http://encrypted.localhost/library/${encodeURIComponent(absPath)}`;
          }
        } catch (localErr) {
          console.log("Arquivo local não encontrado ou erro. Tentando nuvem...", localErr);
        }

        if (!assetUrl && book.drive_file_id) {
          console.log("Baixando do Google Drive: ", book.drive_file_id);
          const token = await getValidAccessToken();
          if (token) {
             const encryptedData = await downloadFromDrive(token, book.drive_file_id);
             const masterKey = state.moduleKeys['library'];
             if (masterKey) {
               fileData = await decryptFile(encryptedData, masterKey);
             } else {
               fileData = encryptedData;
             }
          } else {
             throw new Error("Você precisa conectar sua conta do Google Drive primeiro para baixar este livro.");
          }
        }

        if (!fileData && !assetUrl) {
          throw new Error("Arquivo PDF vazio ou não encontrado. Verifique se o arquivo existe na nuvem.");
        }
        
        const loadingTask = assetUrl ? pdfjsLib.getDocument(assetUrl) : pdfjsLib.getDocument({ data: fileData });
        const pdf = await loadingTask.promise;
        
        if (!active) return;
        
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        
        if (book.total_pages !== pdf.numPages || book.reading_status === 'not_started') {
          onUpdateBook({ 
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

        const session = await window.api.library.startReadingSession({
          book_id: book.id,
          start_page: book.last_read_page || 1
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
  }, [book.id, book.file_path, book.drive_file_id, state.moduleKeys, onUpdateBook]);

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
    pdfDoc, totalPages, pdfError, loading, tocItems, highlights, setHighlights, bookmarks, toggleBookmark
  };
}
