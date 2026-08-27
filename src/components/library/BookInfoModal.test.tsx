import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import BookInfoModal from './BookInfoModal';
import type { LibraryBook } from '../../types';

vi.mock('../ui/Portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('BookInfoModal Component', () => {
  const mockSyncedBook: LibraryBook = {
    id: 'book-123',
    title: 'Domain-Driven Design',
    author: 'Eric Evans',
    publisher: 'Addison-Wesley',
    published_year: 2003,
    language: 'Inglês',
    original_name: 'ddd.pdf',
    file_path: 'drive://folder/ddd.pdf',
    drive_file_id: 'drive-file-abc',
    reading_status: 'reading',
    total_pages: 500,
    last_read_page: 250,
    last_read_at: '2026-08-20T10:00:00Z',
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z',
    collections: [
      { id: 'col-1', name: 'Arquitetura', color: '#8b5cf6' }
    ]
  };

  const mockLocalOnlyBook: LibraryBook = {
    id: 'book-456',
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    reading_status: 'not_started',
    total_pages: 300,
    last_read_page: 1,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
  };

  it('renders correctly for a synced book with all metadata', () => {
    const onClose = vi.fn();
    const { getByText, getAllByText } = render(
      <BookInfoModal book={mockSyncedBook} onClose={onClose} />
    );

    expect(getAllByText('Domain-Driven Design').length).toBeGreaterThan(0);
    expect(getByText('Eric Evans')).toBeDefined();
    expect(getByText('Addison-Wesley')).toBeDefined();
    expect(getByText('2003')).toBeDefined();
    expect(getByText('Inglês')).toBeDefined();
    expect(getByText('Sincronizado no Drive')).toBeDefined();
    expect(getByText('ID: drive-file-abc')).toBeDefined();
    expect(getByText('Arquitetura')).toBeDefined();
    expect(getByText('50%')).toBeDefined();
  });

  it('renders pending cloud upload badge for local only book', () => {
    const onClose = vi.fn();
    const { getByText } = render(
      <BookInfoModal book={mockLocalOnlyBook} onClose={onClose} />
    );

    expect(getByText('Pendente de Upload (Apenas Local)')).toBeDefined();
    expect(getByText('Não Iniciado')).toBeDefined();
  });

  it('triggers onClose when close button is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <BookInfoModal book={mockSyncedBook} onClose={onClose} />
    );

    const closeBtn = container.querySelector('button');
    expect(closeBtn).not.toBeNull();
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    }
  });
});
