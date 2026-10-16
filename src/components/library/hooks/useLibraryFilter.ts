import { useState, useMemo, useCallback } from 'react';
import type {
  LibraryBook,
  ReadingStatus,
  BookFormatFilter,
  BookArchiveFilter,
  LibraryViewMode,
} from '../../../types';
import { isBookEpub } from '../../../utils/book-format';

export function useLibraryFilter(books: LibraryBook[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'all'>('all');
  const [formatFilter, setFormatFilter] = useState<BookFormatFilter>('all');
  const [archiveFilter, setArchiveFilter] = useState<BookArchiveFilter>('active');
  const [viewMode, setViewMode] = useState<LibraryViewMode>('books');

  const [sortBy, setSortBy] = useState<'last_read' | 'title' | 'created' | 'author'>('last_read');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(false);
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);

  // Author list based on non-archived books (or current archive filter context)
  const authors = useMemo(() => {
    const authorSet = new Set(books.map((b) => b.author).filter(Boolean));
    return Array.from(authorSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [books]);

  // Aggregate book counts
  const activeCount = useMemo(
    () => books.filter((b) => b.is_archived !== true).length,
    [books]
  );
  const archivedCount = useMemo(
    () => books.filter((b) => b.is_archived === true).length,
    [books]
  );

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      searchQuery.trim() ||
        statusFilter !== 'all' ||
        selectedCollection !== null ||
        selectedAuthor !== null ||
        formatFilter !== 'all' ||
        archiveFilter !== 'active'
    );
  }, [
    searchQuery,
    statusFilter,
    selectedCollection,
    selectedAuthor,
    formatFilter,
    archiveFilter,
  ]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setSelectedCollection(null);
    setSelectedAuthor(null);
    setFormatFilter('all');
    setArchiveFilter('active');
  }, []);

  const filteredAndSorted = useMemo(() => {
    let result = [...books];

    // 1. Archive filter
    if (archiveFilter === 'active') {
      result = result.filter((b) => b.is_archived !== true);
    } else if (archiveFilter === 'archived') {
      result = result.filter((b) => b.is_archived === true);
    }

    // 2. Format filter
    if (formatFilter === 'epub') {
      result = result.filter((b) => isBookEpub(b));
    } else if (formatFilter === 'pdf') {
      result = result.filter((b) => !isBookEpub(b));
    }

    // 3. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q)
      );
    }

    // 4. Status filter
    if (statusFilter !== 'all') {
      result = result.filter((b) => b.reading_status === statusFilter);
    }

    // 5. Collection filter
    if (selectedCollection) {
      result = result.filter(
        (b) =>
          b.collections?.some((c) => c.id === selectedCollection) ||
          (b as { collection_id?: string | null }).collection_id === selectedCollection
      );
    }

    // 6. Author filter
    if (selectedAuthor) {
      result = result.filter((b) => b.author === selectedAuthor);
    }

    // 7. Sort
    result.sort((a, b) => {
      let cmp: number;
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
        default: {
          const aTime = a.last_read_at ? new Date(a.last_read_at).getTime() : 0;
          const bTime = b.last_read_at ? new Date(b.last_read_at).getTime() : 0;
          cmp = aTime - bTime;
          break;
        }
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [
    books,
    archiveFilter,
    formatFilter,
    searchQuery,
    statusFilter,
    selectedCollection,
    selectedAuthor,
    sortBy,
    sortOrder,
  ]);

  return {
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
    hasActiveFilters,
    clearAllFilters,
    filteredAndSorted,
  };
}

