import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { LibraryHeader } from './ui/LibraryHeader';
import { LibraryBulkActionsBar } from './ui/LibraryBulkActionsBar';
import type { LibraryBook, LibraryCollection, ReadingStatus } from '../../types';
import LibraryGrid from './LibraryGrid';
import BookEditModal from './BookEditModal';
import ReadingStatsView from './ReadingStatsView';
import PdfReader from './PdfReader';
import EpubReader from './EpubReader';
import DriveAuthModal from './DriveAuthModal';
import { useStore } from '../../store/useStore';
import { useLibraryData } from './hooks/useLibraryData';
import { useLibraryFilter } from './hooks/useLibraryFilter';
import { triggerToast } from '../ui/ToastContext';

export default function LibraryView({ tabId }: { tabId?: string }) {
  const { state, dispatch } = useStore();
  const activeTab = state.tabs.find((t) => t.id === tabId) || state.tabs[0];
  const selectedBookId = activeTab.module === 'library' ? activeTab.bookId : null;

  const {
    books,
    collections,
    
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
    handleSaveRename: saveCollectionRename
  } = useLibraryData(selectedBookId);

  const {
    searchQuery,
    setSearchQuery,
    selectedCollection,
    setSelectedCollection,
    selectedAuthor,
    setSelectedAuthor,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    showSortDropdown,
    setShowSortDropdown,
    showCollectionDropdown,
    setShowCollectionDropdown,
    showAuthorDropdown,
    setShowAuthorDropdown,
    authors,
    filteredAndSorted
  } = useLibraryFilter(books);

  const [showStats, setShowStats] = useState(false);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingCollectionName, setEditingCollectionName] = useState('');
  const [showDriveAuth, setShowDriveAuth] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleBulkDelete = async () => {
    if (!window.api?.library || selectedIds.size === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.size} livros?`)) return;
    try {
      const count = selectedIds.size;
      for (const id of selectedIds) {
        await window.api.library.deleteBook(id);
      }
      setSelectedIds(new Set());
      triggerToast(`${count} livro(s) excluído(s).`, 'info');
      await loadData();
    } catch (err: any) {
      console.error('Bulk delete failed', err);
      triggerToast(err.message || 'Falha ao excluir alguns livros.', 'error');
    }
  };

  const handleBulkStatusChange = async (status: ReadingStatus) => {
    if (!window.api?.library || selectedIds.size === 0) return;
    try {
      const count = selectedIds.size;
      for (const id of selectedIds) {
        await window.api.library.updateBook({ id, reading_status: status });
      }
      setSelectedIds(new Set());
      triggerToast(`Status de ${count} livro(s) atualizado!`, 'success');
      await loadData();
    } catch (err: any) {
      console.error('Bulk status update failed', err);
      triggerToast(err.message || 'Falha ao alterar status dos livros.', 'error');
    }
  };

  const handleStatusChange = async (book: LibraryBook, status: ReadingStatus) => {
    if (!window.api?.library) return;
    try {
      await window.api.library.updateBook({ id: book.id, reading_status: status });
      triggerToast(`Status de "${book.title}" atualizado.`, 'success');
      await loadData();
    } catch (err: any) {
      console.error('Status update failed', err);
      triggerToast(err.message || 'Erro ao atualizar status do livro.', 'error');
    }
  };

  const handleStartRename = (e: React.MouseEvent, col: LibraryCollection) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingCollectionId(col.id);
    setEditingCollectionName(col.name);
  };

  const handleSaveRename = async (col: LibraryCollection) => {
    await saveCollectionRename(col, editingCollectionName);
    setEditingCollectionId(null);
  };

  const handleSelectBook = (book: LibraryBook) => {
    dispatch({ type: 'OPEN_LIBRARY_BOOK', bookId: book.id, title: book.title });
  };

  const handleBackFromReader = () => {
    dispatch({ type: 'CLOSE_LIBRARY_BOOK', tabId: activeTab.id });
    loadData();
  };

  if (selectedBook) {
    const filePathLower = (selectedBook.file_path || '').toLowerCase();
    const titleLower = (selectedBook.title || '').toLowerCase();
    const origNameLower = (selectedBook.original_name || '').toLowerCase();

    const isEpub = filePathLower.endsWith('.epub') || 
                   filePathLower.endsWith('.epub.enc') ||
                   filePathLower.includes('.epub.') ||
                   titleLower.endsWith('.epub') ||
                   origNameLower.endsWith('.epub');

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

  return (
    <div className="h-full flex flex-col bg-dark-bg">
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

      <div className="flex-1 overflow-auto">
        {filteredAndSorted.length > 0 && (
          <div className="px-6 pt-3 flex items-center justify-between">
            <button
              onClick={() => {
                if (selectedIds.size === filteredAndSorted.length) {
                  setSelectedIds(new Set());
                } else {
                  setSelectedIds(new Set(filteredAndSorted.map(b => b.id)));
                }
              }}
              className="flex items-center gap-2 text-xs text-dark-subtext hover:text-white transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedIds.size > 0 && selectedIds.size === filteredAndSorted.length}
                onChange={() => {}}
                className="rounded border-white/20 bg-dark-bg text-brand-500 focus:ring-brand-500 cursor-pointer"
              />
              <span>
                {selectedIds.size === filteredAndSorted.length
                  ? 'Desmarcar todos'
                  : 'Selecionar todos os filtrados'}
              </span>
            </button>
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="text-brand-400 animate-spin" />
          </div>
        ) : (
          <LibraryGrid
            books={filteredAndSorted}
            collections={collections}
            selectedIds={selectedIds}
            onToggleSelect={(id) => {
              setSelectedIds(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onSelectBook={handleSelectBook}
            onImportBook={handleImport}
            onEditBook={setEditingBook}
            onDeleteBook={handleDelete}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>

      <LibraryBulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onStatusChange={handleBulkStatusChange}
        onDelete={handleBulkDelete}
      />

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

      {showStats && <ReadingStatsView onClose={() => setShowStats(false)} />}

      {showDriveAuth && (
        <DriveAuthModal 
          onClose={() => setShowDriveAuth(false)}
          onSuccess={() => setHasDriveAuth(true)}
        />
      )}

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
