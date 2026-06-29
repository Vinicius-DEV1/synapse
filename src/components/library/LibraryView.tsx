import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Plus, BarChart3, ArrowUpDown, ChevronDown,
  BookOpen, Loader2, Library, Edit2, Cloud
} from 'lucide-react';
import type { LibraryBook, LibraryCollection, ReadingStatus } from '../../types';
import LibraryGrid from './LibraryGrid';
import BookEditModal from './BookEditModal';
import ReadingStatsView from './ReadingStatsView';
import PdfReader from './PdfReader';
import EpubReader from './EpubReader';
import DriveAuthModal from './DriveAuthModal';
import { getDriveCredentials } from '../../services/drive';
import { useStore } from '../../store/useStore';

type SortBy = 'last_read' | 'title' | 'created' | 'author';
type SortOrder = 'asc' | 'desc';

const SORT_LABELS: Record<SortBy, string> = {
  last_read: 'Último lido',
  title: 'Título A-Z',
  created: 'Data de adição',
  author: 'Autor',
};

const STATUS_LABELS: Record<ReadingStatus | 'all', string> = {
  all: 'Todos',
  not_started: 'Não iniciados',
  reading: 'Lendo',
  finished: 'Concluídos',
};

export default function LibraryView() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [collections, setCollections] = useState<LibraryCollection[]>([]);
  
  const { state, dispatch } = useStore();
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0];
  const selectedBookId = activeTab.module === 'library' ? activeTab.bookId : null;
  const selectedBook = useMemo(() => {
    return selectedBookId ? books.find(b => b.id === selectedBookId) || null : null;
  }, [books, selectedBookId]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('last_read');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
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
    getDriveCredentials().then(creds => {
      setHasDriveAuth(!!creds.token);
    });
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
      if (imported) await loadData();
    } catch (err) {
      console.error('Import failed', err);
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
      await window.api.library.updateBook({ id, ...updates } as any);
      await loadData();
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
    const isEpub = selectedBook.file_path?.toLowerCase().endsWith('.epub') || selectedBook.title?.toLowerCase().endsWith('.epub');

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
      <div className="relative z-50 flex-shrink-0 border-b border-white/5 bg-dark-bg/80 backdrop-blur-sm">
        <div className="px-6 py-4">
          {/* Top row: title + actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-500/10">
                <Library size={22} className="text-brand-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-dark-text">Biblioteca</h1>
                <p className="text-xs text-dark-subtext mt-0.5">
                  {books.length} {books.length === 1 ? 'livro' : 'livros'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDriveAuth(true)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  hasDriveAuth 
                    ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' 
                    : 'bg-white/5 text-dark-subtext hover:bg-white/10 hover:text-white border border-white/10'
                }`}
              >
                <Cloud size={16} />
                <span className="hidden sm:inline">Drive</span>
              </button>
              <button
                onClick={() => setShowStats(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all"
                title="Estatísticas de leitura"
              >
                <BarChart3 size={18} />
              </button>
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-brand-600 hover:bg-brand-500 text-white transition-all active:scale-95 shadow-lg shadow-brand-500/20"
              >
                <Plus size={16} />
                <span>Importar PDF</span>
              </button>
            </div>
          </div>

          {/* Search + Filters row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-subtext pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por título ou autor..."
                className="w-full pl-9 pr-3 py-2 bg-dark-card border border-white/5 rounded-lg text-sm text-dark-text placeholder:text-dark-subtext/50 focus:border-brand-500/50 outline-none transition-colors"
              />
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSortDropdown(!showSortDropdown);
                  setShowCollectionDropdown(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 border border-white/5 transition-all"
              >
                <ArrowUpDown size={14} />
                <span>{SORT_LABELS[sortBy]}</span>
                <ChevronDown size={14} />
              </button>
              {showSortDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
                  <div className="absolute top-full mt-1 right-0 z-50 bg-dark-card border border-white/10 rounded-lg shadow-2xl py-1 min-w-[180px] animate-scale-in">
                    {(Object.keys(SORT_LABELS) as SortBy[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          if (sortBy === key) {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy(key);
                            setSortOrder(key === 'title' || key === 'author' ? 'asc' : 'desc');
                          }
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          sortBy === key
                            ? 'text-brand-400 bg-brand-500/10'
                            : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
                        }`}
                      >
                        {SORT_LABELS[key]}
                        {sortBy === key && (
                          <span className="ml-2 text-xs opacity-60">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Status pills */}
            <div className="flex items-center gap-1 bg-dark-card rounded-lg p-1 border border-white/5">
              {(Object.keys(STATUS_LABELS) as (ReadingStatus | 'all')[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    statusFilter === status
                      ? 'bg-brand-500/20 text-brand-400 shadow-sm'
                      : 'text-dark-subtext hover:text-dark-text'
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>

            {/* Collection filter */}
            {collections.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowCollectionDropdown(!showCollectionDropdown);
                    setShowSortDropdown(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all ${
                    selectedCollection
                      ? 'border-brand-500/30 text-brand-400 bg-brand-500/10'
                      : 'border-white/5 text-dark-subtext hover:text-dark-text hover:bg-white/5'
                  }`}
                >
                  <BookOpen size={14} />
                  <span>
                    {selectedCollection
                      ? collections.find((c) => c.id === selectedCollection)?.name || 'Coleção'
                      : 'Coleções'}
                  </span>
                  <ChevronDown size={14} />
                </button>
                {showCollectionDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowCollectionDropdown(false)} />
                    <div className="absolute top-full mt-1 right-0 z-50 bg-dark-card border border-white/10 rounded-lg shadow-2xl py-1 min-w-[180px] animate-scale-in">
                      <button
                        onClick={() => {
                          setSelectedCollection(null);
                          setShowCollectionDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          !selectedCollection
                            ? 'text-brand-400 bg-brand-500/10'
                            : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
                        }`}
                      >
                        Todas as coleções
                      </button>
                      {collections.map((col) => (
                        <div key={col.id} className="relative group">
                          {editingCollectionId === col.id ? (
                            <div className="px-3 py-1.5 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <input
                                type="text"
                                autoFocus
                                value={editingCollectionName}
                                onChange={e => setEditingCollectionName(e.target.value)}
                                onKeyDown={async e => {
                                  if (e.key === 'Enter') {
                                    await handleSaveRename(col);
                                  } else if (e.key === 'Escape') {
                                    setEditingCollectionId(null);
                                  }
                                }}
                                onBlur={() => handleSaveRename(col)}
                                className="w-full bg-dark-bg/50 border border-brand-500/50 rounded px-2 py-1 text-sm text-dark-text outline-none"
                              />
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedCollection(col.id);
                                  setShowCollectionDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors pr-10 ${
                                  selectedCollection === col.id
                                    ? 'text-brand-400 bg-brand-500/10'
                                    : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
                                }`}
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: col.color }}
                                />
                                {col.name}
                              </button>
                              <button
                                onClick={(e) => handleStartRename(e, col)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-dark-subtext/50 hover:text-brand-400 hover:bg-brand-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                                title="Renomear coleção"
                              >
                                <Edit2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Author filter */}
            {authors.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowAuthorDropdown(!showAuthorDropdown);
                    setShowCollectionDropdown(false);
                    setShowSortDropdown(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all ${
                    selectedAuthor
                      ? 'border-brand-500/30 text-brand-400 bg-brand-500/10'
                      : 'border-white/5 text-dark-subtext hover:text-dark-text hover:bg-white/5'
                  }`}
                >
                  <BookOpen size={14} className="opacity-70" />
                  <span className="truncate max-w-[120px]">
                    {selectedAuthor || 'Autor'}
                  </span>
                  <ChevronDown size={14} />
                </button>
                {showAuthorDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAuthorDropdown(false)} />
                    <div className="absolute top-full mt-1 right-0 z-50 bg-dark-card border border-white/10 rounded-lg shadow-2xl py-1 min-w-[200px] max-h-64 overflow-y-auto animate-scale-in">
                      <button
                        onClick={() => {
                          setSelectedAuthor(null);
                          setShowAuthorDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          !selectedAuthor
                            ? 'text-brand-400 bg-brand-500/10'
                            : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
                        }`}
                      >
                        Todos os autores
                      </button>
                      {authors.map((author) => (
                        <button
                          key={author}
                          onClick={() => {
                            setSelectedAuthor(author);
                            setShowAuthorDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            selectedAuthor === author
                              ? 'text-brand-400 bg-brand-500/10'
                              : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
                          }`}
                        >
                          {author}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
}
