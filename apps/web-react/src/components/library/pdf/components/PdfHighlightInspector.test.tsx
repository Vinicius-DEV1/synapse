import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PdfHighlightInspector } from './PdfHighlightInspector';
import type { LibraryHighlight } from '../../../../types';

describe('PdfHighlightInspector', () => {
  const mockHighlight: LibraryHighlight = {
    id: 'hl-1',
    book_id: 'book-1',
    page_number: 5,
    text_content: 'Este livro é uma introdução',
    color: 'pink',
    rects: '[]',
    highlight_type: 'text',
    note: 'Nota de estudo importante',
    created_at: '2026-01-01T00:00:00Z',
  };

  const defaultProps = {
    highlight: mockHighlight,
    position: { x: 300, y: 400 },
    onClose: vi.fn(),
    onDelete: vi.fn(),
    onUpdateColor: vi.fn(),
    onUpdateNote: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders highlight text and existing note', () => {
    render(<PdfHighlightInspector {...defaultProps} />);

    expect(screen.getByText('Marcação')).toBeDefined();
    expect(screen.getByText(/Este livro é uma introdução/i)).toBeDefined();
    expect(screen.getByText('Nota de estudo importante')).toBeDefined();
  });

  it('calls onDelete immediately on delete button click without race conditions', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<PdfHighlightInspector {...defaultProps} onDelete={onDelete} />);

    const deleteBtn = screen.getByRole('button', { name: /remover marcação/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith('hl-1');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('calls onUpdateColor when a color button is clicked', () => {
    const onUpdateColor = vi.fn();
    render(<PdfHighlightInspector {...defaultProps} onUpdateColor={onUpdateColor} />);

    const blueBtn = screen.getByTitle('Alterar para cor Azul');
    fireEvent.click(blueBtn);

    expect(onUpdateColor).toHaveBeenCalledWith('hl-1', 'blue');
  });

  it('allows editing and saving note', async () => {
    const onUpdateNote = vi.fn().mockResolvedValue(undefined);
    render(<PdfHighlightInspector {...defaultProps} onUpdateNote={onUpdateNote} />);

    const editBtn = screen.getByRole('button', { name: /editar/i });
    fireEvent.click(editBtn);

    const textarea = screen.getByPlaceholderText(/escreva uma nota/i);
    fireEvent.change(textarea, { target: { value: 'Nova nota atualizada' } });

    const saveBtn = screen.getByRole('button', { name: /salvar/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onUpdateNote).toHaveBeenCalledWith('hl-1', 'Nova nota atualizada');
    });
  });

  it('closes on Escape key press', () => {
    const onClose = vi.fn();
    render(<PdfHighlightInspector {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
