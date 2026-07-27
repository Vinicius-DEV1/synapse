import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen, Loader2, Library, Cloud
} from 'lucide-react';
import { Portal } from '../ui/Portal';
import { LibraryHeader } from './ui/LibraryHeader';
import type { LibraryBook, LibraryCollection, ReadingStatus } from '../../types';
import LibraryGrid from './LibraryGrid';
import BookEditModal from './BookEditModal';
import ReadingStatsView from './ReadingStatsView';
import PdfReader from './PdfReader';
import EpubReader from './EpubReader';
import DriveAuthModal from './DriveAuthModal';
import { getDriveCredentials } from '../../services/drive';
import { useStore } from '../../store/useStore';



export default function LibraryView({ tabId }: { tabId: string }) {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [collections, setCollections] = useState<LibraryCollection[]>([]);
  
  const { state, dispatch } = useStore();
  const activeTab = state.tabs.find((t) => t.id === tabId) || state.tabs[0];
  const selectedBookId = activeTab.module === 'library' ? activeTab.bookId : null;
  const selectedBook = useMemo(() => {
    return selectedBookId ? books.find(b => b.id === selectedBookId) || null : null;
  }, [books, selectedBookId]);

  const [loading, setLoading] = useState(true);
  const [uploadResult, setUploadResult] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'last_read' | 'title' | 'created' | 'author'>('last_read');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showStats, setShowStats] = useState(false);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(false);
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingCollectionName, setEditingCollectionName] = useState('');
  const [showDriveAuth, setShowDriveAuth] = useState(false);
  const [hasDriveAuth, setHasDriveAuth] = useState(false);

  useEffect(() => {
    const checkDriveAuth = () => {
      getDriveCredentials().then(creds => {
        setHasDriveAuth(!!creds.token);
      });
    };
    
    // Check initially
    checkDriveAuth();
    
    // Re-check when sync completes (e.g. pulled from cloud on incognito load)
    window.addEventListener('caderno-sync-success', checkDriveAuth);
    return () => window.removeEventListener('caderno-sync-success', checkDriveAuth);
  }, []);

  // --- Derived Data ---
  const authors = useMemo(() => {
    const authorSet = new Set(books.map(b => b.author).filter(Boolean));
    return Array.from(authorSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [books]);

  // --- Data loading ---
  const loadData = useCallback(async () => {
    if (!window.api?.library) return;
    try {
      setLoading(true);
      const [booksData, collectionsData] = await Promise.all([
        window.api.library.getBooks(),
        window.api.library.getCollections(),
      ]);

      // Enrich each book with its collections
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

  // --- Actions ---
  const handleImport = async () => {
    if (!window.api?.library) return;
    try {
      const imported = await window.api.library.importBook();
      if (imported) {
        await loadData();
        setUploadResult({
          title: "Upload Concluído",
          message: `O arquivo "${imported.title}" foi importado com sucesso para a nuvem.`,
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

  const handleStatusChange = async (book: LibraryBook, status: ReadingStatus) => {
    if (!window.api?.library) return;
    try {
      await window.api.library.updateBook({ id: book.id, reading_status: status });
      await loadData();
    } catch (err) {
      console.error('Status update failed', err);
    }
  };

  const handleUpdateBook = async (id: string, updates: Partial<LibraryBook>) => {
    if (!window.api?.library) return;
    try {
      const book = books.find(b => b.id === id);
      if (book) {
        await window.api.library.updateBook({ ...book, ...updates } as any);
        await loadData();
      }
    } catch (err) {
      console.error('Book update failed', err);
    }
  };

  const handleStartRename = (e: React.MouseEvent, col: LibraryCollection) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingCollectionId(col.id);
    setEditingCollectionName(col.name);
  };

  const handleSaveRename = async (col: LibraryCollection) => {
    if (!editingCollectionName || editingCollectionName.trim() === '') {
      setEditingCollectionId(null);
      return;
    }
    
    if (editingCollectionName.trim() !== col.name) {
      if (!window.api?.library) return;
      try {
        await window.api.library.updateCollection({ id: col.id, name: editingCollectionName.trim() });
        const updated = collections.map(c => c.id === col.id ? { ...c, name: editingCollectionName.trim() } : c);
        setCollections(updated);
        await loadData();
      } catch (err) {
        console.error('Failed to rename collection', err);
      }
    }
    setEditingCollectionId(null);
  };

  const handleSelectBook = (book: LibraryBook) => {
    dispatch({ type: 'OPEN_LIBRARY_BOOK', bookId: book.id, title: book.title });
  };

  const handleBackFromReader = () => {
    dispatch({ type: 'CLOSE_LIBRARY_BOOK', tabId: activeTab.id });
    loadData(); // refresh data after reading session
  };

  // --- Filtering & Sorting ---
  const filteredAndSorted = useMemo(() => {
    let result = [...books];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((b) => b.reading_status === statusFilter);
    }

    // Collection filter
    if (selectedCollection) {
      result = result.filter((b) =>
        b.collections?.some((c) => c.id === selectedCollection)
      );
    }

    // Author filter
    if (selectedAuthor) {
      result = result.filter((b) => b.author === selectedAuthor);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'title':
          cmp = a.title.localeCompare(b.title, 'pt-BR');
          break;
        case 'author':
          cmp = a.author.localeCompare(b.author, 'pt-BR');
          break;
        case 'created':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'last_read':
        default:
          const aTime = a.last_read_at ? new Date(a.last_read_at).getTime() : 0;
          const bTime = b.last_read_at ? new Date(b.last_read_at).getTime() : 0;
          cmp = aTime - bTime;
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [books, searchQuery, statusFilter, selectedCollection, selectedAuthor, sortBy, sortOrder]);

  if (selectedBook) {
    const isEpub = selectedBook.file_path?.toLowerCase().endsWith('.epub') || 
                   selectedBook.title?.toLowerCase().endsWith('.epub') ||
                   selectedBook.original_name?.toLowerCase().endsWith('.epub');

    if (isEpub) {
      return (
        <EpubReader
          book={selectedBook}
          onBack={handleBackFromReader}
          onUpdateBook={(updates) => handleUpdateBook(selectedBook.id, updates)}
        />
      );
    }

    return (
      <PdfReader
        book={selectedBook}
        onBack={handleBackFromReader}
        onUpdateBook={(updates) => handleUpdateBook(selectedBook.id, updates)}
      />
    );
  }

  // --- Main Grid View ---
  return (
    <div className="h-full flex flex-col bg-dark-bg">
      {/* Header */}
      <LibraryHeader
        booksCount={books.length}
        setShowDriveAuth={setShowDriveAuth}
        hasDriveAuth={hasDriveAuth}
        setShowStats={setShowStats}
        handleImport={handleImport}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy as any}
        setSortBy={setSortBy as any}
        sortOrder={sortOrder as any}
        setSortOrder={setSortOrder as any}
        showSortDropdown={showSortDropdown}
        setShowSortDropdown={setShowSortDropdown}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        collections={collections}
        selectedCollection={selectedCollection}
        setSelectedCollection={setSelectedCollection}
        showCollectionDropdown={showCollectionDropdown}
        setShowCollectionDropdown={setShowCollectionDropdown}
        editingCollectionId={editingCollectionId}
        setEditingCollectionId={setEditingCollectionId}
        editingCollectionName={editingCollectionName}
        setEditingCollectionName={setEditingCollectionName}
        handleSaveRename={handleSaveRename}
        handleStartRename={handleStartRename}
        authors={authors}
        selectedAuthor={selectedAuthor}
        setSelectedAuthor={setSelectedAuthor}
        showAuthorDropdown={showAuthorDropdown}
        setShowAuthorDropdown={setShowAuthorDropdown}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="text-brand-400 animate-spin" />
          </div>
        ) : (
          <LibraryGrid
            books={filteredAndSorted}
            collections={collections}
            onSelectBook={handleSelectBook}
            onImportBook={handleImport}
            onEditBook={setEditingBook}
            onDeleteBook={handleDelete}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      {/* Edit Modal */}
      {editingBook && (
        <BookEditModal
          book={editingBook}
          allBooks={books}
          collections={collections}
          bookCollections={editingBook.collections?.map((c) => c.id) || []}
          onSave={async () => {
            setEditingBook(null);
            await loadData();
          }}
          onClose={() => setEditingBook(null)}
        />
      )}

      {/* Stats Overlay */}
      {showStats && <ReadingStatsView onClose={() => setShowStats(false)} />}

      {/* Drive Auth Modal */}
      {showDriveAuth && (
        <DriveAuthModal 
          onClose={() => setShowDriveAuth(false)}
          onSuccess={() => setHasDriveAuth(true)}
        />
      )}

      {/* Upload Feedback Modal */}
      {uploadResult && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-900 border border-brand-700/50 rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center text-center">
            {uploadResult.type === 'success' ? (
              <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <h3 className="text-xl font-bold text-white mb-2">{uploadResult.title}</h3>
            <p className="text-brand-300 text-sm mb-6">{uploadResult.message}</p>
            <button 
              onClick={() => setUploadResult(null)}
              className="w-full py-2.5 px-4 bg-brand-800 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors"
            >
              OK
            </button>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}
