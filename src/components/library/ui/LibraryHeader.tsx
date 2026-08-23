import React from 'react';
import { Search, Plus, BarChart3, Library, Cloud } from 'lucide-react';
import type { LibraryCollection, ReadingStatus } from '../../../types';
import { LibrarySortDropdown, type SortBy, type SortOrder } from './LibrarySortDropdown';
import { LibraryCollectionDropdown } from './LibraryCollectionDropdown';
import { LibraryAuthorDropdown } from './LibraryAuthorDropdown';

const STATUS_LABELS: Record<ReadingStatus | 'all', string> = {
  all: 'Todos',
  not_started: 'Não iniciados',
  reading: 'Lendo',
  finished: 'Concluídos',
};

interface LibraryHeaderProps {
  booksCount: number;
  setShowDriveAuth: (show: boolean) => void;
  hasDriveAuth: boolean;
  setShowStats: (show: boolean) => void;
  handleImport: () => void;
  
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  
  sortBy: SortBy;
  setSortBy: (s: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (s: SortOrder) => void;
  showSortDropdown: boolean;
  setShowSortDropdown: (show: boolean) => void;
  
  statusFilter: ReadingStatus | 'all';
  setStatusFilter: (s: ReadingStatus | 'all') => void;
  
  collections: LibraryCollection[];
  selectedCollection: string | null;
  setSelectedCollection: (id: string | null) => void;
  showCollectionDropdown: boolean;
  setShowCollectionDropdown: (show: boolean) => void;
  editingCollectionId: string | null;
  setEditingCollectionId: (id: string | null) => void;
  editingCollectionName: string;
  setEditingCollectionName: (name: string) => void;
  handleSaveRename: (col: LibraryCollection) => void;
  handleStartRename: (e: React.MouseEvent, col: LibraryCollection) => void;
  
  authors: string[];
  selectedAuthor: string | null;
  setSelectedAuthor: (a: string | null) => void;
  showAuthorDropdown: boolean;
  setShowAuthorDropdown: (show: boolean) => void;
}

export function LibraryHeader({
  booksCount, setShowDriveAuth, hasDriveAuth, setShowStats, handleImport,
  searchQuery, setSearchQuery,
  sortBy, setSortBy, sortOrder, setSortOrder, showSortDropdown, setShowSortDropdown,
  statusFilter, setStatusFilter,
  collections, selectedCollection, setSelectedCollection, showCollectionDropdown, setShowCollectionDropdown,
  editingCollectionId, setEditingCollectionId, editingCollectionName, setEditingCollectionName, handleSaveRename, handleStartRename,
  authors, selectedAuthor, setSelectedAuthor, showAuthorDropdown, setShowAuthorDropdown,
}: LibraryHeaderProps) {
  return (
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
                {booksCount} {booksCount === 1 ? 'livro' : 'livros'}
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
              <span>Importar PDF / EPUB</span>
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
          <LibrarySortDropdown
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            showSortDropdown={showSortDropdown}
            setShowSortDropdown={setShowSortDropdown}
            onOpen={() => {
              setShowSortDropdown(!showSortDropdown);
              setShowCollectionDropdown(false);
              setShowAuthorDropdown(false);
            }}
          />

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
          <LibraryCollectionDropdown
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
            onOpen={() => {
              setShowCollectionDropdown(!showCollectionDropdown);
              setShowSortDropdown(false);
              setShowAuthorDropdown(false);
            }}
          />

          {/* Author filter */}
          <LibraryAuthorDropdown
            authors={authors}
            selectedAuthor={selectedAuthor}
            setSelectedAuthor={setSelectedAuthor}
            showAuthorDropdown={showAuthorDropdown}
            setShowAuthorDropdown={setShowAuthorDropdown}
            onOpen={() => {
              setShowAuthorDropdown(!showAuthorDropdown);
              setShowCollectionDropdown(false);
              setShowSortDropdown(false);
            }}
          />
        </div>
      </div>
    </div>
  );
}
