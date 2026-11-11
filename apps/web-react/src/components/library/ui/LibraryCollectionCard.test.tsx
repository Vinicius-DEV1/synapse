import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryCollectionCard, NewCollectionCard } from './LibraryCollectionCard';
import type { LibraryCollection, LibraryBook } from '../../../types';

describe('LibraryCollectionCard', () => {
  const mockCollection: LibraryCollection = {
    id: 'col-1',
    name: 'Ciência da Computação',
    color: '#6366f1',
    created_at: '2026-01-01T00:00:00Z',
  };

  const mockBooks: LibraryBook[] = [
    {
      id: 'book-1',
      title: 'Estruturas de Dados',
      file_path: '/path/ed.pdf',
      original_name: 'ed.pdf',
      cover_image: '',
      total_pages: 300,
      last_read_page: 0,
      reading_status: 'reading',
      collections: [mockCollection],
      last_read_at: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
    {
      id: 'book-2',
      title: 'Algoritmos',
      file_path: '/path/alg.epub',
      original_name: 'alg.epub',
      cover_image: '',
      total_pages: 500,
      last_read_page: 0,
      reading_status: 'completed',
      collections: [mockCollection],
      last_read_at: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    },
  ];

  it('renders collection title and correct book count pluralization', () => {
    const handleSelect = vi.fn();
    render(
      <LibraryCollectionCard
        collection={mockCollection}
        books={mockBooks}
        onSelect={handleSelect}
      />
    );

    expect(screen.getByText('Ciência da Computação')).toBeDefined();
    expect(screen.getByText('2 livros')).toBeDefined();
  });

  it('calls onSelect when the card is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <LibraryCollectionCard
        collection={mockCollection}
        books={mockBooks}
        onSelect={handleSelect}
      />
    );

    fireEvent.click(screen.getByText('Ciência da Computação'));
    expect(handleSelect).toHaveBeenCalledWith('col-1');
  });

  it('renders NewCollectionCard and triggers onClick', () => {
    const handleCreate = vi.fn();
    render(<NewCollectionCard onClick={handleCreate} />);

    const button = screen.getByRole('button', { name: /nova coleção/i });
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(handleCreate).toHaveBeenCalledTimes(1);
  });
});
