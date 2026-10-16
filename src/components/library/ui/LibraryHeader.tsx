import { useState } from 'react';
import { Search, Plus, BarChart3, Library, Cloud, BookOpen, Folder, FolderPlus, Archive, HelpCircle } from 'lucide-react';
import type {
  LibraryCollection,
  ReadingStatus,
  BookFormatFilter,
  BookArchiveFilter,
  LibraryViewMode,
} from '../../../types';
import { LibrarySortDropdown, type SortBy, type SortOrder } from './LibrarySortDropdown';
import { LibraryCollectionDropdown } from './LibraryCollectionDropdown';
import { LibraryAuthorDropdown } from './LibraryAuthorDropdown';
import { LibraryHelpModal } from '../modals/LibraryHelpModal';
import { useI18n } from '../../../i18n';

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

  viewMode?: LibraryViewMode;
  setViewMode?: (mode: LibraryViewMode) => void;
  formatFilter?: BookFormatFilter;
  setFormatFilter?: (f: BookFormatFilter) => void;
  archiveFilter?: BookArchiveFilter;
  setArchiveFilter?: (a: BookArchiveFilter) => void;
  archivedCount?: number;
  onOpenCreateCollection?: () => void;
}

export function LibraryHeader({
  booksCount, setShowDriveAuth, hasDriveAuth, setShowStats, handleImport,
  searchQuery, setSearchQuery,
  sortBy, setSortBy, sortOrder, setSortOrder, showSortDropdown, setShowSortDropdown,
  statusFilter, setStatusFilter,
  collections, selectedCollection, setSelectedCollection, showCollectionDropdown, setShowCollectionDropdown,
  editingCollectionId, setEditingCollectionId, editingCollectionName, setEditingCollectionName, handleSaveRename, handleStartRename,
  authors, selectedAuthor, setSelectedAuthor, showAuthorDropdown, setShowAuthorDropdown,
  viewMode = 'books', setViewMode,
  formatFilter = 'all', setFormatFilter,
  archiveFilter = 'active', setArchiveFilter,
  archivedCount = 0,
  onOpenCreateCollection,
}: LibraryHeaderProps) {
  const { t } = useI18n();
  const [showHelpModal, setShowHelpModal] = useState(false);

  const statusLabels: Record<ReadingStatus | 'all', string> = {
    all: t('library.status.all'),
    not_started: t('library.status.not_started_plural'),
    reading: t('library.status.reading'),
    finished: t('library.status.finished_plural'),
  };

  return (
    <div className="relative z-50 flex-shrink-0 border-b border-white/5 bg-dark-bg/80 backdrop-blur-sm">
      <div className="px-6 py-4">
        {/* Top row: title + view mode toggle + actions */}
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-500/10">
                <Library size={22} className="text-brand-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-dark-text">{t('library.title')}</h1>
                <p className="text-xs text-dark-subtext mt-0.5">
                  {viewMode === 'collections'
                    ? (collections.length === 1 ? t('library.collectionCount', { count: 1 }) : t('library.collectionCountPlural', { count: collections.length }))
                    : archiveFilter === 'archived'
                    ? (booksCount === 1 ? t('library.archivedCount', { count: 1 }) : t('library.archivedCountPlural', { count: booksCount }))
                    : (booksCount === 1 ? t('library.bookCount', { count: 1 }) : t('library.bookCountPlural', { count: booksCount }))}
                </p>
              </div>
            </div>

            {/* View Mode Toggle: Livros vs Coleções */}
            {setViewMode && (
              <div className="flex items-center gap-1 bg-dark-card rounded-xl p-1 border border-white/5 ml-2">
                <button
                  type="button"
                  aria-label="Visualizar Livros"
                  onClick={() => setViewMode('books')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    viewMode === 'books'
                      ? 'bg-brand-500/20 text-brand-300 shadow-sm'
                      : 'text-dark-subtext hover:text-white'
                  }`}
                >
                  <BookOpen size={14} />
                  <span>{t('library.books')}</span>
                </button>
                <button
                  type="button"
                  aria-label="Visualizar Coleções"
                  onClick={() => setViewMode('collections')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    viewMode === 'collections'
                      ? 'bg-brand-500/20 text-brand-300 shadow-sm'
                      : 'text-dark-subtext hover:text-white'
                  }`}
                >
                  <Folder size={14} />
                  <span>{t('library.collections')}</span>
                  {collections.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-white/80 font-semibold">
                      {collections.length}
                    </span>
                  )}
                </button>
              </div>
            )}
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
              <span className="hidden sm:inline">{t('library.drive')}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white/5 text-dark-subtext hover:bg-white/10 hover:text-white border border-white/10 transition-colors"
              title={t('library.guideTitle')}
              aria-label="Guia da Biblioteca"
            >
              <HelpCircle size={16} />
              <span className="hidden sm:inline">{t('library.guide')}</span>
            </button>
            <button
              onClick={() => setShowStats(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all"
              title={t('library.stats')}
            >
              <BarChart3 size={18} />
            </button>
            {viewMode === 'collections' && onOpenCreateCollection ? (
              <button
                onClick={onOpenCreateCollection}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-brand-600 hover:bg-brand-500 text-white transition-all active:scale-95 shadow-lg shadow-brand-500/20"
              >
                <FolderPlus size={16} />
                <span>{t('library.newCollection')}</span>
              </button>
            ) : (
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-brand-600 hover:bg-brand-500 text-white transition-all active:scale-95 shadow-lg shadow-brand-500/20"
              >
                <Plus size={16} />
                <span>{t('library.importPdfEpub')}</span>
              </button>
            )}
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
              placeholder={t('library.searchPlaceholder')}
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
            {(Object.keys(statusLabels) as (ReadingStatus | 'all')[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-brand-500/20 text-brand-400 shadow-sm'
                    : 'text-dark-subtext hover:text-dark-text'
                }`}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>

          {/* Format filter pills */}
          {setFormatFilter && (
            <div className="flex items-center gap-1 bg-dark-card rounded-lg p-1 border border-white/5">
              {(['all', 'pdf', 'epub'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormatFilter(fmt)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium uppercase tracking-wide transition-all ${
                    formatFilter === fmt
                      ? 'bg-brand-500/20 text-brand-400 shadow-sm'
                      : 'text-dark-subtext hover:text-dark-text'
                  }`}
                >
                  {fmt === 'all' ? t('library.formats') : fmt.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Archive Toggle Button */}
          {setArchiveFilter && (
            <button
              onClick={() => {
                setArchiveFilter(archiveFilter === 'archived' ? 'active' : 'archived');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                archiveFilter === 'archived'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-sm'
                  : 'bg-dark-card border-white/5 text-dark-subtext hover:text-white'
              }`}
              title={archiveFilter === 'archived' ? t('library.backToActive') : t('library.archived')}
            >
              <Archive size={14} className={archiveFilter === 'archived' ? 'text-amber-400' : 'text-dark-subtext'} />
              <span>{t('library.archived')}</span>
              {archivedCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    archiveFilter === 'archived'
                      ? 'bg-amber-500/30 text-amber-200'
                      : 'bg-white/10 text-white/70'
                  }`}
                >
                  {archivedCount}
                </span>
              )}
            </button>
          )}

          {/* Collection filter (relevant in books mode) */}
          {viewMode === 'books' && (
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
          )}

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

      {showHelpModal && (
        <LibraryHelpModal onClose={() => setShowHelpModal(false)} />
      )}
    </div>
  );
}
