import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import LibraryGrid from './LibraryGrid';
import type { LibraryBook } from '../../types';

vi.mock('lucide-react', () => ({
  FileText: () => <div data-testid="icon-file-text" />,
  Plus: () => <div data-testid="icon-plus" />,
  MoreVertical: () => <div data-testid="icon-more" />,
  BookOpen: () => <div data-testid="icon-book-open" />,
  CheckCircle2: () => <div data-testid="icon-check" />,
  Circle: () => <div data-testid="icon-circle" />,
  Pencil: () => <div data-testid="icon-pencil" />,
  Trash2: () => <div data-testid="icon-trash" />,
  BookMarked: () => <div data-testid="icon-bookmarked" />,
  Cloud: () => <div data-testid="icon-cloud" />,
  CloudDownload: () => <div data-testid="icon-cloud-download" />,
  HardDrive: () => <div data-testid="icon-hard-drive" />,
  CloudOff: () => <div data-testid="icon-cloud-off" />,
}));

describe('LibraryGrid Component', () => {
  const mockBooks: LibraryBook[] = [
    {
      id: 'book1',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      file_path: 'local/path/cleancode.pdf',
      total_pages: 400,
      last_read_page: 200,
      reading_status: 'reading',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'book2',
      title: 'Refactoring',
      author: 'Martin Fowler',
      file_path: 'drive://12345/refactoring.epub',
      total_pages: 0,
      last_read_page: 0,
      reading_status: 'not_started',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it('renders correctly with given books', () => {
    const { getByText, getByTestId, getAllByTestId } = render(
      <LibraryGrid
        books={mockBooks}
        collections={[]}
        onSelectBook={vi.fn()}
        onImportBook={vi.fn()}
        onEditBook={vi.fn()}
        onDeleteBook={vi.fn()}
        onStatusChange={vi.fn()}
      />
    );

    expect(getByText('Clean Code')).toBeDefined();
    expect(getByText('Refactoring')).toBeDefined();
    expect(getByText('PDF')).toBeDefined();
    expect(getByText('EPUB')).toBeDefined();
    
    // Check if progress bar logic calculates 50% for Clean Code
    const progressBar = document.querySelector('.bg-brand-400') as HTMLElement;
    expect(progressBar).not.toBeNull();
    expect(progressBar.style.width).toBe('50%');
  });

  it('handles book selection properly', () => {
    const onSelectBook = vi.fn();
    const { getByText } = render(
      <LibraryGrid
        books={mockBooks}
        collections={[]}
        onSelectBook={onSelectBook}
        onImportBook={vi.fn()}
        onEditBook={vi.fn()}
        onDeleteBook={vi.fn()}
        onStatusChange={vi.fn()}
      />
    );

    fireEvent.click(getByText('Clean Code'));
    expect(onSelectBook).toHaveBeenCalledWith(mockBooks[0]);
  });
});
