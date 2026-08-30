import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import BookEditModal from './BookEditModal';
import type { LibraryBook } from '../../types';

vi.mock('../../ui/Portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../ui/CoverPickerSection', () => ({
  CoverPickerSection: () => <div data-testid="cover-picker-section">Cover Picker</div>,
}));

describe('BookEditModal Component', () => {
  const mockBook: LibraryBook = {
    id: 'book_edit_1',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    publisher: 'Prentice Hall',
    published_year: 2008,
    language: 'pt-BR',
    format: 'pdf',
    total_pages: 464,
    reading_status: 'reading',
    created_at: 1000,
    updated_at: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      library: {
        updateBook: vi.fn().mockResolvedValue(undefined),
        setBookCollections: vi.fn().mockResolvedValue(undefined),
        createCollection: vi.fn(),
        addBookToCollection: vi.fn(),
        removeBookFromCollection: vi.fn(),
      },
    };
  });

  it('renders book fields and submits edits on save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    const { getByDisplayValue, getByRole } = render(
      <BookEditModal
        book={mockBook}
        allBooks={[mockBook]}
        collections={[]}
        bookCollections={[]}
        onSave={onSave}
        onClose={onClose}
      />
    );

    const titleInput = getByDisplayValue('Clean Code');
    expect(titleInput).toBeDefined();

    fireEvent.change(titleInput, { target: { value: 'Clean Code: Edição Especial' } });

    const saveBtn = getByRole('button', { name: /^Salvar$/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(window.api.library.updateBook).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'book_edit_1',
          title: 'Clean Code: Edição Especial',
        })
      );
      expect(window.api.library.setBookCollections).toHaveBeenCalledWith(
        'book_edit_1',
        []
      );
      expect(onSave).toHaveBeenCalled();
    });
  });
});
