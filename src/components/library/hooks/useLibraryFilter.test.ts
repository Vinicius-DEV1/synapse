import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLibraryFilter } from './useLibraryFilter';
import type { LibraryBook } from '../../../types';

describe('useLibraryFilter', () => {
  const sampleBooks: LibraryBook[] = [
    {
      id: 'book-1',
      title: 'Clean Code',
      file_path: '/path/clean-code.pdf',
      author: 'Robert C. Martin',
      status: 'reading',
      collection_id: 'col-dev',
      is_archived: false,
      progress: 50,
      total_pages: 400,
    },
    {
      id: 'book-2',
      title: 'Design Patterns',
      file_path: '/path/design-patterns.epub',
      author: 'Gang of Four',
      status: 'completed',
      collection_id: 'col-dev',
      is_archived: false,
      progress: 100,
      total_pages: 395,
    },
    {
      id: 'book-3',
      title: 'Old Archived Book',
      file_path: '/path/archived-manual.pdf',
      author: 'Unknown',
      status: 'unread',
      collection_id: null,
      is_archived: true,
      archived_at: '2026-01-01T00:00:00Z',
      progress: 0,
      total_pages: 50,
    },
  ];

  it('filters out archived books by default (active only)', () => {
    const { result } = renderHook(() => useLibraryFilter(sampleBooks));

    expect(result.current.archiveFilter).toBe('active');
    expect(result.current.filteredAndSorted.map((b) => b.id)).toEqual(['book-1', 'book-2']);
    expect(result.current.activeCount).toBe(2);
    expect(result.current.archivedCount).toBe(1);
  });

  it('shows only archived books when archiveFilter is archived', () => {
    const { result } = renderHook(() => useLibraryFilter(sampleBooks));

    act(() => {
      result.current.setArchiveFilter('archived');
    });

    expect(result.current.archiveFilter).toBe('archived');
    expect(result.current.filteredAndSorted.map((b) => b.id)).toEqual(['book-3']);
  });

  it('filters books by format (pdf vs epub)', () => {
    const { result } = renderHook(() => useLibraryFilter(sampleBooks));

    act(() => {
      result.current.setFormatFilter('epub');
    });

    expect(result.current.filteredAndSorted.map((b) => b.id)).toEqual(['book-2']);

    act(() => {
      result.current.setFormatFilter('pdf');
    });

    expect(result.current.filteredAndSorted.map((b) => b.id)).toEqual(['book-1']);
  });

  it('filters books by collection', () => {
    const { result } = renderHook(() => useLibraryFilter(sampleBooks));

    act(() => {
      result.current.setSelectedCollection('col-dev');
    });

    expect(result.current.filteredAndSorted.map((b) => b.id)).toEqual(['book-1', 'book-2']);

    act(() => {
      result.current.setSelectedCollection('col-other');
    });

    expect(result.current.filteredAndSorted).toHaveLength(0);
  });

  it('correctly tracks hasActiveFilters and resets with clearAllFilters', () => {
    const { result } = renderHook(() => useLibraryFilter(sampleBooks));

    expect(result.current.hasActiveFilters).toBe(false);

    act(() => {
      result.current.setSearchQuery('Clean');
      result.current.setFormatFilter('pdf');
    });

    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.filteredAndSorted.map((b) => b.id)).toEqual(['book-1']);

    act(() => {
      result.current.clearAllFilters();
    });

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.formatFilter).toBe('all');
    expect(result.current.archiveFilter).toBe('active');
    expect(result.current.filteredAndSorted.map((b) => b.id)).toEqual(['book-1', 'book-2']);
  });

  it('supports toggling viewMode between books and collections', () => {
    const { result } = renderHook(() => useLibraryFilter(sampleBooks));

    expect(result.current.viewMode).toBe('books');

    act(() => {
      result.current.setViewMode('collections');
    });

    expect(result.current.viewMode).toBe('collections');
  });
});
