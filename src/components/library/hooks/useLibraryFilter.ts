import { useState, useMemo } from 'react';
import type { LibraryBook, ReadingStatus } from '../../../types';

export function useLibraryFilter(books: LibraryBook[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'last_read' | 'title' | 'created' | 'author'>('last_read');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(false);
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false);

  const authors = useMemo(() => {
    const authorSet = new Set(books.map(b => b.author).filter(Boolean));
    return Array.from(authorSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [books]);

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

  return {
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
  };
}
