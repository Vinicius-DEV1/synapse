import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useStore } from '../../../../store/useStore';
import { resolveCanonicalBuffer } from '../../../../services/storage/canonical-resolver';
import type { LibraryBook, LibraryHighlight, LibraryBookmark } from '../../../../types';
import type { TocItem } from '../components/AnnotationPanel';
import type { LoadProgressState } from '../types';
import { triggerToast } from '../../../ui/ToastContext';
import { detectBufferFormat, isBookEpub } from '../../../../utils/book-format';

interface RawOutlineItem {
  title: string;
  dest?: string | unknown[];
  items?: RawOutlineItem[];
}

export function usePdfDocument(
  book: LibraryBook,
  onUpdateBook: (updates: Partial<LibraryBook>) => void,
  currentPage: number
) {
  const { state } = useStore();
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState<LoadProgressState | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startPageRef = useRef<number>(1);
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);

  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const onUpdateBookRef = useRef(onUpdateBook);
  useEffect(() => {
    onUpdateBookRef.current = onUpdateBook;
  }, [onUpdateBook]);

  const [highlights, setHighlights] = useState<LibraryHighlight[]>([]);
  const [bookmarks, setBookmarks] = useState<LibraryBookmark[]>([]);
  const [reloadCounter, setReloadCounter] = useState(0);

  const reload = () => setReloadCounter((c) => c + 1);

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
          onUpdateSavedPath: (newPath) =>
            onUpdateBookRef.current({ id: book.id, file_path: newPath, is_local: true }),
          onProgress: (percent, stage) => setLoadProgress({ percent, stage }),
        });

        const detectedFormat = detectBufferFormat(fileData);
        if (detectedFormat === 'epub') {
          console.info(`[usePdfDocument] Buffer for book "${book.title}" (${book.id}) is an EPUB. Auto-healing format and switching to EpubReader.`);
          const canonicalPath = book.file_path?.includes('.epub')
            ? book.file_path
            : (book.file_path?.startsWith('indexeddb://')
                ? `${book.file_path}.epub`
                : (book.file_path ? `${book.file_path}.epub` : `indexeddb://${book.id}.epub`));

          onUpdateBookRef.current({
            id: book.id,
            format: 'epub',
            file_path: canonicalPath,
            is_local: true,
          });
          setLoading(false);
          return;
        }

        if (active) setLoadProgress({ percent: 100, stage: 'rendering' });
        const loadingTask = pdfjsLib.getDocument({ data: fileData });
        loadingTaskRef.current = loadingTask;
        const pdf = await loadingTask.promise;

        if (!active) return;

        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);

        if (book.total_pages !== pdf.numPages || book.reading_status === 'not_started') {
          onUpdateBookRef.current({
            id: book.id,
            total_pages: pdf.numPages,
            reading_status: book.reading_status === 'not_started' ? 'reading' : book.reading_status,
          });
        }

        // Parse Table of Contents (Outline)
        const outline = (await pdf.getOutline()) as RawOutlineItem[] | null;
        if (outline) {
          const processOutline = async (items: RawOutlineItem[], level = 0): Promise<TocItem[]> => {
            return Promise.all(
              items.map(async (item) => {
                let pageNumber = 1;
                if (item.dest) {
                  try {
                    const dest =
                      typeof item.dest === 'string'
                        ? await pdf.getDestination(item.dest)
                        : item.dest;
                    if (dest && dest[0]) {
                      const pageIndex = await pdf.getPageIndex(dest[0]);
                      pageNumber = pageIndex + 1;
                    }
                  } catch (e) {
                    console.error('Failed to get page index for TOC item', e);
                  }
                }
                const children =
                  item.items && item.items.length > 0
                    ? await processOutline(item.items, level + 1)
                    : undefined;

                return {
                  title: item.title,
                  pageNumber,
                  level,
                  children,
                };
              })
            );
          };
          setTocItems(await processOutline(outline));
        }

        // Fetch highlights and bookmarks
        if (window.api?.library) {
          const loadedHighlights = await window.api.library.getHighlights(book.id);
          const loadedBookmarks = await window.api.library.getBookmarks(book.id);
          setHighlights(loadedHighlights);
          setBookmarks(loadedBookmarks);

          const startPageNum =
            typeof book.last_read_page === 'number'
              ? book.last_read_page
              : parseInt(String(book.last_read_page || 1), 10) || 1;
          startPageRef.current = startPageNum;

          const session = await window.api.library.startReadingSession({
            book_id: book.id,
            start_page: startPageNum,
          });
          sessionIdRef.current = session.id;
        }

        setLoading(false);
      } catch (err: unknown) {
        console.error('Error loading PDF:', err);
        const errObj = err as { name?: string; message?: string } | null;
        const isPdfStructureError = Boolean(
          errObj?.name === 'InvalidPDFException' ||
          errObj?.message?.includes('Invalid PDF structure')
        );

        if (isPdfStructureError) {
          if (
            isBookEpub(book) ||
            (typeof book.last_read_page === 'string' && book.last_read_page.includes('epubcfi')) ||
            book.epub_locations
          ) {
            console.info(`[usePdfDocument] InvalidPDFException on suspected EPUB "${book.title}". Auto-healing format.`);
            const canonicalPath = book.file_path?.includes('.epub')
              ? book.file_path
              : (book.file_path?.startsWith('indexeddb://')
                  ? `${book.file_path}.epub`
                  : `indexeddb://${book.id}.epub`);

            onUpdateBookRef.current({
              id: book.id,
              format: 'epub',
              file_path: canonicalPath,
              is_local: true,
            });
            setLoading(false);
            return;
          }
        }

        const errorMsg = err instanceof Error ? err.message : 'Falha desconhecida ao carregar o PDF.';
        setPdfError(errorMsg);
        setLoading(false);
      }
    };

    loadPdf();
    return () => {
      active = false;
      loadingTaskRef.current?.destroy();
      loadingTaskRef.current = null;
    };
  }, [book.id, book.file_path, book.drive_file_id, state.moduleKeys, reloadCounter]);

  // Teardown reading session cleanly only on component unmount
  useEffect(() => {
    return () => {
      if (sessionIdRef.current && window.api?.library?.endReadingSession) {
        window.api.library.endReadingSession({
          id: sessionIdRef.current,
          end_page: currentPageRef.current,
          pages_read: Math.max(1, Math.abs(currentPageRef.current - startPageRef.current) + 1),
        });
        sessionIdRef.current = null;
      }
    };
  }, []);

  const toggleBookmark = async (pageNum: number) => {
    if (!window.api?.library) return;
    try {
      const existing = bookmarks.find((b) => b.page_number === pageNum);
      if (existing) {
        await window.api.library.deleteBookmark(existing.id);
        setBookmarks((prev) => prev.filter((b) => b.id !== existing.id));
        triggerToast(`Marcador da página ${pageNum} removido.`, 'info');
      } else {
        const newBookmark = await window.api.library.createBookmark({
          book_id: book.id,
          page_number: pageNum,
          label: `Página ${pageNum}`,
        });
        setBookmarks((prev) => [...prev, newBookmark]);
        triggerToast(`Página ${pageNum} marcada!`, 'success');
      }
    } catch (err: unknown) {
      console.error('Failed to toggle bookmark', err);
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar marcador.';
      triggerToast(msg, 'error');
    }
  };

  return {
    pdfDoc,
    totalPages,
    pdfError,
    loading,
    loadProgress,
    tocItems,
    highlights,
    setHighlights,
    bookmarks,
    setBookmarks,
    toggleBookmark,
    reload,
  };
}
