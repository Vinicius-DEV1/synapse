import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { LibraryBook, LibraryCollection } from '../../../types';
import { getDriveCredentials } from '../../../services/drive';
import { triggerToast } from '../../ui/ToastContext';

export function useLibraryData(selectedBookId: string | null | undefined) {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [collections, setCollections] = useState<LibraryCollection[]>([]);
  const [virtualBook, setVirtualBook] = useState<LibraryBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadResult, setUploadResult] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);
  const [hasDriveAuth, setHasDriveAuth] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const selectedBook = useMemo(() => {
    if (!selectedBookId) return null;
    const found = books.find(b => b.id === selectedBookId);
    if (found) return found;
    return virtualBook?.id === selectedBookId ? virtualBook : null;
  }, [books, selectedBookId, virtualBook]);

  // Load single virtual book if opened by ID outside the regular library list
  useEffect(() => {
    if (selectedBookId && !books.find(b => b.id === selectedBookId) && window.api?.files) {
      window.api.files.getById(selectedBookId).then((file: { id: string; name: string; local_path?: string; drive_file_id?: string; created_at?: string; updated_at?: string }) => {
        if (!isMounted.current) return;
        if (file) {
          const storedPrefsStr = localStorage.getItem(`caderno_avulso_${file.id}`);
          const storedPrefs = storedPrefsStr ? JSON.parse(storedPrefsStr) : {};

          setVirtualBook({
            id: file.id,
            title: file.name,
            author: 'Arquivo Avulso',
            file_path: file.local_path,
            drive_file_id: file.drive_file_id,
            cover_color: '#3b82f6',
            cover_image: undefined,
            collections: [],
            total_pages: storedPrefs.total_pages || 0,
            current_page: storedPrefs.current_page || 0,
            reading_status: 'reading',
            last_read_page: storedPrefs.last_read_page || undefined,
            epub_locations: storedPrefs.epub_locations || undefined,
            created_at: file.created_at || new Date().toISOString(),
            updated_at: file.updated_at || new Date().toISOString(),
            deleted_at: undefined,
            reading_preferences: storedPrefs.reading_preferences || undefined,
            language: undefined,
            last_read_at: new Date().toISOString(),
            original_name: file.name,
            published_year: undefined,
            publisher: undefined
          } as unknown as LibraryBook);
        }
      }).catch(console.error);
    }
  }, [selectedBookId, books]);



  const booksRef = useRef(books);
  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  const loadData = useCallback(async () => {
    if (!window.api?.library) {
      if (isMounted.current) setLoading(false);
      return;
    }
    try {
      // Only set full loading state on initial fetch when no books are loaded in memory yet
      if (isMounted.current && booksRef.current.length === 0) {
        setLoading(true);
      }
      const [booksData, collectionsData] = await Promise.all([
        window.api.library.getBooks(),
        window.api.library.getCollections(),
      ]);

      if (!isMounted.current) return;

      const collectionsById = new Map(collectionsData.map(c => [c.id, c]));

      let enriched: LibraryBook[];
      if (typeof window.api.library.getAllBookCollections === 'function') {
        try {
          const batchMap = await window.api.library.getAllBookCollections();
          enriched = booksData.map(book => {
            const colIds = batchMap[book.id] || [];
            const bookCols = colIds.map(id => collectionsById.get(id)).filter(Boolean) as LibraryCollection[];
            return { ...book, collections: bookCols };
          });
        } catch {
          enriched = booksData.map(book => ({ ...book, collections: [] }));
        }
      } else {
        enriched = await Promise.all(
          booksData.map(async (book) => {
            try {
              const bookCols = await window.api.library.getBookCollections(book.id);
              const mapped = (bookCols as (string | LibraryCollection)[]).map(c => typeof c === 'string' ? collectionsById.get(c) : c).filter(Boolean) as LibraryCollection[];
              return { ...book, collections: mapped };
            } catch {
              return { ...book, collections: [] };
            }
          })
        );
      }

      if (isMounted.current) {
        setBooks(enriched);
        setCollections(collectionsData);
      }
    } catch (err) {
      console.error('Failed to load library data', err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // Drive auth check and sync listeners
  useEffect(() => {
    const checkDriveAuth = () => {
      getDriveCredentials().then(creds => {
        setHasDriveAuth(!!creds.token);
      });
    };
    const onSyncComplete = () => {
      checkDriveAuth();
      loadData();
    };
    
    checkDriveAuth();
    window.addEventListener('caderno-sync-success', checkDriveAuth);
    window.addEventListener('caderno-drive-connected', onSyncComplete);
    window.addEventListener('caderno-sync-complete', onSyncComplete);
    
    return () => {
      window.removeEventListener('caderno-sync-success', checkDriveAuth);
      window.removeEventListener('caderno-drive-connected', onSyncComplete);
      window.removeEventListener('caderno-sync-complete', onSyncComplete);
    };
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onUploadStart = () => {
      if (booksRef.current.length === 0) setLoading(true);
    };
    const onUploadEnd = () => setLoading(false);
    window.addEventListener('library-upload-start', onUploadStart);
    window.addEventListener('library-upload-end', onUploadEnd);
    return () => {
      window.removeEventListener('library-upload-start', onUploadStart);
      window.removeEventListener('library-upload-end', onUploadEnd);
    };
  }, []);

  const handleImport = async () => {
    if (!window.api?.library) return;
    try {
      const imported = await window.api.library.importBook();
      if (imported) {
        const list = Array.isArray(imported) ? imported : [imported];
        await loadData();
        
        // Dispara o sync imediatamente (completamente ignorando debounces)
        window.dispatchEvent(new Event('app-sync-trigger-immediate'));

        const successMsg = hasDriveAuth
          ? (list.length > 1
              ? `${list.length} livros foram importados e sincronizados com a nuvem.`
              : `O livro "${list[0]?.title || 'Livro'}" foi importado e sincronizado com o Drive.`)
          : (list.length > 1
              ? `${list.length} livros foram importados localmente (Google Drive desconectado).`
              : `O livro "${list[0]?.title || 'Livro'}" foi importado localmente (Google Drive desconectado).`);

        triggerToast(successMsg, hasDriveAuth ? 'success' : 'info');
      }
    } catch (err) {
      console.error('Import failed', err);
      const errMsg = err instanceof Error ? err.message : "Ocorreu um erro ao tentar importar o arquivo.";
      triggerToast(errMsg, 'error', 5000);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.api?.library) return;
    try {
      await window.api.library.deleteBook(id);
      triggerToast('Livro excluído com sucesso.', 'info');
      await loadData();
    } catch (err) {
      console.error('Delete failed', err);
      triggerToast(err instanceof Error ? err.message : 'Falha ao excluir o livro.', 'error');
    }
  };

  const handleUpdateBook = async (id: string, updates: Partial<LibraryBook>) => {
    if (!window.api?.library) return;
    try {
      const book = books.find(b => b.id === id);
      if (book) {
        const merged = { ...book, ...updates };
        const payload = {
          ...merged,
          total_pages: typeof merged.total_pages === 'number' ? merged.total_pages : (parseInt(String(merged.total_pages || 0), 10) || 0),
          current_page: typeof merged.current_page === 'number' ? merged.current_page : (parseInt(String(merged.current_page || 0), 10) || 0),
          last_read_page: merged.last_read_page != null ? String(merged.last_read_page) : undefined,
        };
        await window.api.library.updateBook(payload as any);
        await loadData();
      } else if (virtualBook && virtualBook.id === id) {
        const updatedAvulso = { ...virtualBook, ...updates };
        setVirtualBook(updatedAvulso);
        const updatedExtended = updatedAvulso as LibraryBook & { current_page?: number, reading_preferences?: unknown };
        const prefsToSave = {
          total_pages: updatedExtended.total_pages,
          current_page: updatedExtended.current_page,
          last_read_page: updatedExtended.last_read_page,
          epub_locations: updatedExtended.epub_locations,
          reading_preferences: updatedExtended.reading_preferences,
        };
        localStorage.setItem(`caderno_avulso_${id}`, JSON.stringify(prefsToSave));
      }
    } catch (err) {
      console.error('Book update failed', err);
      triggerToast(err instanceof Error ? err.message : 'Falha ao atualizar o livro.', 'error');
    }
  };

  const handleSaveRename = async (col: LibraryCollection, newName: string) => {
    if (!newName || newName.trim() === '') return;
    
    if (newName.trim() !== col.name) {
      if (!window.api?.library) return;
      try {
        await window.api.library.updateCollection({ id: col.id, name: newName.trim() });
        const updated = collections.map(c => c.id === col.id ? { ...c, name: newName.trim() } : c);
        if (isMounted.current) setCollections(updated);
        await loadData();
        triggerToast('Coleção renomeada com sucesso!', 'success');
      } catch (err) {
        console.error('Failed to rename collection', err);
        triggerToast(err instanceof Error ? err.message : 'Falha ao renomear coleção.', 'error');
      }
    }
  };

  return {
    books,
    setBooks,
    collections,
    setCollections,
    virtualBook,
    loading,
    uploadResult,
    setUploadResult,
    hasDriveAuth,
    setHasDriveAuth,
    selectedBook,
    loadData,
    handleImport,
    handleDelete,
    handleUpdateBook,
    handleSaveRename
  };
}
