import React from 'react';
import { Search, Plus, BarChart3, ArrowUpDown, ChevronDown, BookOpen, Library, Cloud, Edit2 } from 'lucide-react';
import type { LibraryCollection, ReadingStatus } from '../../../types';

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
  authors, selectedAuthor, setSelectedAuthor, showAuthorDropdown, setShowAuthorDropdown
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
                setShowAuthorDropdown(false);
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
                  setShowAuthorDropdown(false);
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
  );
}
