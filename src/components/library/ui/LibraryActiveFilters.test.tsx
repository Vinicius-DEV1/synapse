import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryActiveFilters } from './LibraryActiveFilters';

describe('LibraryActiveFilters', () => {
  const defaultProps = {
    searchQuery: '',
    onClearSearch: vi.fn(),
    statusFilter: 'all' as const,
    onClearStatus: vi.fn(),
    selectedCollection: null,
    collections: [],
    onClearCollection: vi.fn(),
    selectedAuthor: null,
    onClearAuthor: vi.fn(),
    formatFilter: 'all' as const,
    onClearFormat: vi.fn(),
    archiveFilter: 'active' as const,
    onClearArchive: vi.fn(),
    onClearAll: vi.fn(),
  };

  it('renders nothing when no filters are active', () => {
    const { container } = render(<LibraryActiveFilters {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders search query chip and clears on click', () => {
    const onClearSearch = vi.fn();
    render(
      <LibraryActiveFilters
        {...defaultProps}
        searchQuery="clean architecture"
        onClearSearch={onClearSearch}
      />
    );

    expect(screen.getByText(/Busca:/i)).toBeDefined();
    expect(screen.getByText(/clean architecture/i)).toBeDefined();

    const clearBtn = screen.getByTitle('Remover filtro de busca');
    fireEvent.click(clearBtn);
    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });

  it('renders format chip (PDF) and clears on click', () => {
    const onClearFormat = vi.fn();
    render(
      <LibraryActiveFilters
        {...defaultProps}
        formatFilter="pdf"
        onClearFormat={onClearFormat}
      />
    );

    expect(screen.getByText(/Formato:/i)).toBeDefined();
    const clearBtn = screen.getByTitle('Remover filtro de formato');
    fireEvent.click(clearBtn);
    expect(onClearFormat).toHaveBeenCalledTimes(1);
  });

  it('renders archive chip when showing archived books', () => {
    const onClearArchive = vi.fn();
    render(
      <LibraryActiveFilters
        {...defaultProps}
        archiveFilter="archived"
        onClearArchive={onClearArchive}
      />
    );

    expect(screen.getByText(/Visualizando: Arquivados/i)).toBeDefined();
    const clearBtn = screen.getByTitle('Voltar para livros ativos');
    fireEvent.click(clearBtn);
    expect(onClearArchive).toHaveBeenCalledTimes(1);
  });

  it('renders "Limpar filtros" button when filters are active and triggers onClearAll', () => {
    const onClearAll = vi.fn();
    render(
      <LibraryActiveFilters
        {...defaultProps}
        searchQuery="test"
        formatFilter="epub"
        onClearAll={onClearAll}
      />
    );

    const clearAllBtn = screen.getByRole('button', { name: /limpar filtros/i });
    expect(clearAllBtn).toBeDefined();
    fireEvent.click(clearAllBtn);
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });
});
