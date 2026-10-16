import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LibraryHeader } from './ui/LibraryHeader';
import { LibraryBulkActionsBar } from './ui/LibraryBulkActionsBar';
import { LibraryActiveFilters } from './ui/LibraryActiveFilters';
import type { LibraryBook, LibraryCollection, ReadingStatus } from '../../types';
import LibraryGrid from './LibraryGrid';
import {
  BookEditModal,
  DriveAuthModal,
  ReadingStatsModal,
  UploadResultModal,
  LibraryCreateCollectionModal,
} from './modals';
import { LibraryReaderHost } from './LibraryReaderHost';
import { useStore } from '../../store/useStore';
import { useLibraryData } from './hooks/useLibraryData';
import { useLibraryFilter } from './hooks/useLibraryFilter';
import { triggerToast } from '../ui/ToastContext';
import { useI18n } from '../../i18n';

export default function LibraryView({ tabId }: { tabId?: string }) {
  const { t } = useI18n();
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
    formatFilter,
    setFormatFilter,
    archiveFilter,
    setArchiveFilter,
    viewMode,
    setViewMode,
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
    activeCount,
    archivedCount,
    clearAllFilters,
    filteredAndSorted
  } = useLibraryFilter(books);

  const [showStats, setShowStats] = useState(false);
  const [editingBook, setEditingBook] = useState<LibraryBook | null>(null);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editingCollectionName, setEditingCollectionName] = useState('');
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);
  const [editingCollectionModal, setEditingCollectionModal] = useState<LibraryCollection | null>(null);
  const [showDriveAuth, setShowDriveAuth] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleBulkDelete = async () => {
    if (!window.api?.library || selectedIds.size === 0) return;
    const msg = `Tem certeza que deseja excluir ${selectedIds.size} livros?`;
    const confirmed = window.api?.app?.showConfirm
      ? (await window.api.app.showConfirm({
          title: 'Excluir Livros',
          message: msg,
          kind: 'warning',
        })) === 1
      : typeof window !== 'undefined' && typeof window.confirm === 'function' && window.confirm(msg);
    if (!confirmed) return;
    try {
      const count = selectedIds.size;
      for (const id of selectedIds) {
        await window.api.library.deleteBook(id);
      }
      setSelectedIds(new Set());
      triggerToast(`${count} livro(s) excluído(s).`, 'info');
      await loadData();
    } catch (err) {
      console.error('Bulk delete failed', err);
      triggerToast(err instanceof Error ? err.message : 'Falha ao excluir alguns livros.', 'error');
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
    } catch (err) {
      console.error('Bulk status update failed', err);
      triggerToast(err instanceof Error ? err.message : 'Falha ao alterar status dos livros.', 'error');
    }
  };

  const handleStatusChange = async (book: LibraryBook, status: ReadingStatus) => {
    try {
      if (window.api?.library?.updateBook) {
        await window.api.library.updateBook({
          id: book.id,
          reading_status: status
        });
        triggerToast(`Status alterado para ${status === 'reading' ? 'lendo' : 'concluído'}`, 'success');
        await loadData();
      }
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const handleEvictLocalCache = async (id: string) => {
    try {
      if (window.api?.library?.evictBookLocalCache) {
        await window.api.library.evictBookLocalCache(id);
        triggerToast('Arquivo local removido. Disponível apenas na nuvem.', 'success');
        await loadData();
      } else {
        triggerToast('Função não disponível na plataforma', 'info');
      }
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const handleDownloadOffline = async (book: LibraryBook) => {
    try {
      if (!window.api?.library?.getBookFile) return;
      triggerToast(`Baixando "${book.title}" para leitura offline...`, 'info');
      const fileData = await window.api.library.getBookFile(book.id);
      if (fileData) {
        triggerToast(`"${book.title}" disponível offline!`, 'success');
        await loadData();
      } else {
        triggerToast('Não foi possível baixar o livro da nuvem.', 'error');
      }
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const handleCreateCollection = async (data: { name: string; color: string }) => {
    if (!window.api?.library?.createCollection) return;
    try {
      await window.api.library.createCollection(data);
      await loadData();
      triggerToast('Coleção criada com sucesso!', 'success');
    } catch (err) {
      console.error('Failed to create collection', err);
      triggerToast(err instanceof Error ? err.message : 'Falha ao criar coleção.', 'error');
    }
  };

  const handleDeleteCollection = async (colId: string) => {
    if (!window.api?.library?.deleteCollection) return;
    const col = collections.find((c) => c.id === colId);
    const msg = `Tem certeza que deseja excluir a coleção "${col?.name || 'Coleção'}"? Os livros não serão excluídos.`;
    const confirmed = window.api?.app?.showConfirm
      ? (await window.api.app.showConfirm({
          title: 'Excluir Coleção',
          message: msg,
          kind: 'warning',
        })) === 1
      : typeof window !== 'undefined' && typeof window.confirm === 'function' && window.confirm(msg);
    if (!confirmed) return;
    try {
      await window.api.library.deleteCollection(colId);
      if (selectedCollection === colId) {
        setSelectedCollection(null);
      }
      await loadData();
      triggerToast('Coleção excluída com sucesso.', 'info');
    } catch (err) {
      console.error('Failed to delete collection', err);
      triggerToast(err instanceof Error ? err.message : 'Falha ao excluir coleção.', 'error');
    }
  };

  const handleSaveCollectionEdit = async (data: { name: string; color: string }) => {
    if (!editingCollectionModal || !window.api?.library?.updateCollection) return;
    try {
      await window.api.library.updateCollection({
        id: editingCollectionModal.id,
        name: data.name,
        color: data.color,
      });
      await loadData();
      triggerToast('Coleção atualizada com sucesso!', 'success');
    } catch (err) {
      console.error('Failed to update collection', err);
      triggerToast(err instanceof Error ? err.message : 'Falha ao atualizar coleção.', 'error');
    }
  };

  const handleArchiveBook = async (book: LibraryBook) => {
    await handleUpdateBook(book.id, {
      is_archived: true,
      archived_at: new Date().toISOString(),
    });
    triggerToast(`"${book.title}" foi arquivado.`, 'info');
  };

  const handleUnarchiveBook = async (book: LibraryBook) => {
    await handleUpdateBook(book.id, {
      is_archived: false,
      archived_at: null,
    });
    triggerToast(`"${book.title}" restaurado para a biblioteca.`, 'success');
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    try {
      const count = selectedIds.size;
      for (const id of selectedIds) {
        await handleUpdateBook(id, {
          is_archived: true,
          archived_at: new Date().toISOString(),
        });
      }
      setSelectedIds(new Set());
      triggerToast(`${count} livro(s) arquivado(s).`, 'info');
    } catch (err) {
      console.error('Bulk archive failed', err);
      triggerToast('Falha ao arquivar livros.', 'error');
    }
  };

  const handleBulkUnarchive = async () => {
    if (selectedIds.size === 0) return;
    try {
      const count = selectedIds.size;
      for (const id of selectedIds) {
        await handleUpdateBook(id, {
          is_archived: false,
          archived_at: null,
        });
      }
      setSelectedIds(new Set());
      triggerToast(`${count} livro(s) restaurado(s).`, 'success');
    } catch (err) {
      console.error('Bulk unarchive failed', err);
      triggerToast('Falha ao desarquivar livros.', 'error');
    }
  };

  const handleBulkAssignCollection = async (colId: string) => {
    if (!window.api?.library?.setBookCollections || selectedIds.size === 0) return;
    try {
      const count = selectedIds.size;
      for (const bookId of selectedIds) {
        const book = books.find((b) => b.id === bookId);
        const existingColIds = book?.collections?.map((c) => c.id) || [];
        if (!existingColIds.includes(colId)) {
          await window.api.library.setBookCollections(bookId, [...existingColIds, colId]);
        }
      }
      setSelectedIds(new Set());
      await loadData();
      triggerToast(`${count} livro(s) adicionado(s) à coleção!`, 'success');
    } catch (err) {
      console.error('Bulk collection assign failed', err);
      triggerToast('Falha ao adicionar livros à coleção.', 'error');
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
    return (
      <LibraryReaderHost
        book={selectedBook}
        onBack={handleBackFromReader}
        onUpdateBook={(updates) => handleUpdateBook(selectedBook.id, updates)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-dark-bg">
      <LibraryHeader
        booksCount={viewMode === 'collections' ? collections.length : activeCount}
        setShowDriveAuth={setShowDriveAuth}
        hasDriveAuth={hasDriveAuth}
        setShowStats={setShowStats}
        handleImport={handleImport}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
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
        viewMode={viewMode}
        setViewMode={setViewMode}
        formatFilter={formatFilter}
        setFormatFilter={setFormatFilter}
        archiveFilter={archiveFilter}
        setArchiveFilter={setArchiveFilter}
        archivedCount={archivedCount}
        onOpenCreateCollection={() => setIsCreateCollectionOpen(true)}
      />

      {viewMode === 'books' && (
        <LibraryActiveFilters
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery('')}
          statusFilter={statusFilter}
          onClearStatus={() => setStatusFilter('all')}
          selectedCollection={selectedCollection}
          collections={collections}
          onClearCollection={() => setSelectedCollection(null)}
          selectedAuthor={selectedAuthor}
          onClearAuthor={() => setSelectedAuthor(null)}
          formatFilter={formatFilter}
          onClearFormat={() => setFormatFilter('all')}
          archiveFilter={archiveFilter}
          onClearArchive={() => setArchiveFilter('active')}
          totalBooks={books.length}
          filteredBooks={filteredAndSorted.length}
          onClearAll={clearAllFilters}
        />
      )}

      <div className="flex-1 overflow-auto">
        {viewMode === 'books' && filteredAndSorted.length > 0 && (
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
                  ? t('library.deselectAll')
                  : t('library.selectAllFiltered')}
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
            allBooks={books}
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
            onEvictBook={handleEvictLocalCache}
            onDownloadOffline={handleDownloadOffline}
            viewMode={viewMode}
            onSelectCollection={(colId) => {
              setSelectedCollection(colId);
              setViewMode('books');
            }}
            onEditCollection={(col) => setEditingCollectionModal(col)}
            onDeleteCollection={handleDeleteCollection}
            onOpenCreateCollection={() => setIsCreateCollectionOpen(true)}
            selectedCollectionId={selectedCollection}
            onClearSelectedCollection={() => setSelectedCollection(null)}
            onArchiveBook={handleArchiveBook}
            onUnarchiveBook={handleUnarchiveBook}
            isViewingArchived={archiveFilter === 'archived'}
            onClearArchivedView={() => setArchiveFilter('active')}
          />
        )}
      </div>

      <LibraryBulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        onStatusChange={handleBulkStatusChange}
        onDelete={handleBulkDelete}
        isViewingArchived={archiveFilter === 'archived'}
        onArchive={handleBulkArchive}
        onUnarchive={handleBulkUnarchive}
        collections={collections}
        onAssignCollection={handleBulkAssignCollection}
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

      {isCreateCollectionOpen && (
        <LibraryCreateCollectionModal
          onSave={handleCreateCollection}
          onClose={() => setIsCreateCollectionOpen(false)}
        />
      )}

      {editingCollectionModal && (
        <LibraryCreateCollectionModal
          initialCollection={editingCollectionModal}
          onSave={handleSaveCollectionEdit}
          onClose={() => setEditingCollectionModal(null)}
        />
      )}

      {showStats && <ReadingStatsModal onClose={() => setShowStats(false)} />}

      {showDriveAuth && (
        <DriveAuthModal
          onClose={() => setShowDriveAuth(false)}
          onSuccess={() => setHasDriveAuth(true)}
        />
      )}

      {uploadResult && (
        <UploadResultModal
          result={uploadResult}
          onClose={() => setUploadResult(null)}
        />
      )}
    </div>
  );
}
