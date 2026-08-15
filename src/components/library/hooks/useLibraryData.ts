import { useState, useEffect, useMemo, useCallback } from 'react';
import type { LibraryBook, LibraryCollection } from '../../../types';
import { getDriveCredentials } from '../../../services/drive';

export function useLibraryData(selectedBookId: string | null | undefined) {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [collections, setCollections] = useState<LibraryCollection[]>([]);
  const [virtualBook, setVirtualBook] = useState<LibraryBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadResult, setUploadResult] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);
  const [hasDriveAuth, setHasDriveAuth] = useState(false);

  const selectedBook = useMemo(() => {
    if (!selectedBookId) return null;
    const found = books.find(b => b.id === selectedBookId);
    if (found) return found;
    return virtualBook?.id === selectedBookId ? virtualBook : null;
  }, [books, selectedBookId, virtualBook]);

  // Load single virtual book if opened by ID outside the regular library list
  useEffect(() => {
    if (selectedBookId && !books.find(b => b.id === selectedBookId) && window.api?.files) {
      window.api.files.getById(selectedBookId).then((file: any) => {
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
            cover_image: null,
            collections: [],
            total_pages: storedPrefs.total_pages || 0,
            current_page: storedPrefs.current_page || 0,
            reading_status: 'reading',
            last_read_page: storedPrefs.last_read_page || null,
            epub_locations: storedPrefs.epub_locations || null,
            created_at: file.created_at || new Date().toISOString(),
            updated_at: file.updated_at || new Date().toISOString(),
            deleted_at: null,
            reading_preferences: storedPrefs.reading_preferences || null,
            language: null,
            last_read_at: new Date().toISOString(),
            original_name: file.name,
            published_year: null,
            publisher: null
          } as LibraryBook);
        }
      }).catch(console.error);
    }
  }, [selectedBookId, books]);

  // Drive auth check
  useEffect(() => {
    const checkDriveAuth = () => {
      getDriveCredentials().then(creds => {
        setHasDriveAuth(!!creds.token);
      });
    };
    checkDriveAuth();
    window.addEventListener('caderno-sync-success', checkDriveAuth);
    return () => window.removeEventListener('caderno-sync-success', checkDriveAuth);
  }, []);

  const loadData = useCallback(async () => {
    if (!window.api?.library) return;
    try {
      setLoading(true);
      const [booksData, collectionsData] = await Promise.all([
        window.api.library.getBooks(),
        window.api.library.getCollections(),
      ]);

      const enriched = await Promise.all(
        booksData.map(async (book) => {
          try {
            const bookCols = await window.api.library.getBookCollections(book.id);
            return { ...book, collections: bookCols };
          } catch {
            return { ...book, collections: [] };
          }
        })
      );

      setBooks(enriched);
      setCollections(collectionsData);
    } catch (err) {
      console.error('Failed to load library data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onUploadStart = () => setLoading(true);
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
        setUploadResult({
          title: "Upload Concluído",
          message: list.length > 1
            ? `${list.length} livros foram importados com sucesso para a nuvem.`
            : `O arquivo "${list[0]?.title || 'Livro'}" foi importado com sucesso para a nuvem.`,
          type: "success"
        });
      }
    } catch (err: any) {
      console.error('Import failed', err);
      setUploadResult({
        title: "Erro no Upload",
        message: err.message || "Ocorreu um erro desconhecido ao tentar enviar o arquivo.",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.api?.library) return;
    try {
      await window.api.library.deleteBook(id);
      await loadData();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleUpdateBook = async (id: string, updates: Partial<LibraryBook>) => {
    if (!window.api?.library) return;
    try {
      const book = books.find(b => b.id === id);
      if (book) {
        await window.api.library.updateBook({ ...book, ...updates } as any);
        await loadData();
      } else if (virtualBook && virtualBook.id === id) {
        const updatedAvulso = { ...virtualBook, ...updates };
        setVirtualBook(updatedAvulso);
        const prefsToSave = {
          total_pages: updatedAvulso.total_pages,
          current_page: updatedAvulso.current_page,
          last_read_page: updatedAvulso.last_read_page,
          epub_locations: updatedAvulso.epub_locations,
          reading_preferences: updatedAvulso.reading_preferences,
        };
        localStorage.setItem(`caderno_avulso_${id}`, JSON.stringify(prefsToSave));
      }
    } catch (err) {
      console.error('Book update failed', err);
    }
  };

  const handleSaveRename = async (col: LibraryCollection, newName: string) => {
    if (!newName || newName.trim() === '') return;
    
    if (newName.trim() !== col.name) {
      if (!window.api?.library) return;
      try {
        await window.api.library.updateCollection({ id: col.id, name: newName.trim() });
        const updated = collections.map(c => c.id === col.id ? { ...c, name: newName.trim() } : c);
        setCollections(updated);
        await loadData();
      } catch (err) {
        console.error('Failed to rename collection', err);
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
