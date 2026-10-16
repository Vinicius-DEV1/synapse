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
    expect(screen.getByText('Importar PDF / EPUB')).toBeInTheDocument();
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

  it('toggles view mode between books and collections', () => {
    const setViewMode = vi.fn();
    render(
      <LibraryHeader
        {...defaultProps}
        viewMode="books"
        setViewMode={setViewMode}
        collections={[{ id: 'c1', name: 'Ficção', color: '#6366f1', created_at: '' }]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Visualizar Coleções' }));
    expect(setViewMode).toHaveBeenCalledWith('collections');
  });

  it('changes format filter on click', () => {
    const setFormatFilter = vi.fn();
    render(
      <LibraryHeader
        {...defaultProps}
        formatFilter="all"
        setFormatFilter={setFormatFilter}
      />
    );

    fireEvent.click(screen.getByText('PDF'));
    expect(setFormatFilter).toHaveBeenCalledWith('pdf');
  });

  it('toggles archive filter when clicking archive button', () => {
    const setArchiveFilter = vi.fn();
    render(
      <LibraryHeader
        {...defaultProps}
        archiveFilter="active"
        setArchiveFilter={setArchiveFilter}
        archivedCount={5}
      />
    );

    fireEvent.click(screen.getByText('Arquivados'));
    expect(setArchiveFilter).toHaveBeenCalledWith('archived');
  });

  it('opens LibraryHelpModal when clicking Guia button', () => {
    render(<LibraryHeader {...defaultProps} />);

    const guideBtn = screen.getByRole('button', { name: 'Guia da Biblioteca' });
    expect(guideBtn).toBeDefined();

    fireEvent.click(guideBtn);
    expect(screen.getByRole('dialog', { name: 'Guia do Usuário da Biblioteca' })).toBeDefined();
    expect(screen.getByText('O Básico & Formatos')).toBeDefined();
  });
});

