import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryHeader } from './LibraryHeader';

describe('LibraryHeader component', () => {
  const defaultProps = {
    booksCount: 12,
    setShowDriveAuth: vi.fn(),
    hasDriveAuth: false,
    setShowStats: vi.fn(),
    handleImport: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    sortBy: 'title' as any,
    setSortBy: vi.fn(),
    sortOrder: 'asc' as any,
    setSortOrder: vi.fn(),
    showSortDropdown: false,
    setShowSortDropdown: vi.fn(),
    statusFilter: 'all' as any,
    setStatusFilter: vi.fn(),
    collections: [],
    selectedCollection: null,
    setSelectedCollection: vi.fn(),
    showCollectionDropdown: false,
    setShowCollectionDropdown: vi.fn(),
    editingCollectionId: null,
    setEditingCollectionId: vi.fn(),
    editingCollectionName: '',
    setEditingCollectionName: vi.fn(),
    handleSaveRename: vi.fn(),
    handleStartRename: vi.fn(),
    authors: ['Isaac Asimov', 'Arthur C. Clarke'],
    selectedAuthor: null,
    setSelectedAuthor: vi.fn(),
    showAuthorDropdown: false,
    setShowAuthorDropdown: vi.fn(),
  };

  it('renders library title, books count and import button', () => {
    render(<LibraryHeader {...defaultProps} />);

    expect(screen.getByRole('heading', { name: 'Biblioteca' })).toBeInTheDocument();
    expect(screen.getByText('12 livros')).toBeInTheDocument();
    expect(screen.getByText('Importar PDF')).toBeInTheDocument();
  });

  it('updates search query on typing', () => {
    const setSearchQuery = vi.fn();
    render(<LibraryHeader {...defaultProps} setSearchQuery={setSearchQuery} />);

    const input = screen.getByPlaceholderText('Buscar por título ou autor...');
    fireEvent.change(input, { target: { value: 'Foundation' } });

    expect(setSearchQuery).toHaveBeenCalledWith('Foundation');
  });

  it('changes reading status filter on click', () => {
    const setStatusFilter = vi.fn();
    render(<LibraryHeader {...defaultProps} setStatusFilter={setStatusFilter} />);

    fireEvent.click(screen.getByText('Lendo'));
    expect(setStatusFilter).toHaveBeenCalledWith('reading');
  });
});
