import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PdfHighlightNoteTooltip } from './PdfHighlightNoteTooltip';
import type { LibraryHighlight } from '../../../../types';

describe('PdfHighlightNoteTooltip', () => {
  it('renders nothing when highlight has no note', () => {
    const highlight: LibraryHighlight = {
      id: 'h1',
      book_id: 'b1',
      page_number: 1,
      text_content: 'Texto qualquer',
      color: 'yellow',
      rects: '[]',
      highlight_type: 'text',
      note: '',
      created_at: '2026-01-01',
    };

    const { container } = render(
      <PdfHighlightNoteTooltip highlight={highlight} position={{ x: 100, y: 100 }} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders note content and title when note is present', () => {
    const highlight: LibraryHighlight = {
      id: 'h2',
      book_id: 'b1',
      page_number: 1,
      text_content: 'Conceitos fundamentais',
      color: 'pink',
      rects: '[]',
      highlight_type: 'text',
      note: 'Revisar este capítulo para o exame.',
      created_at: '2026-01-01',
    };

    render(
      <PdfHighlightNoteTooltip highlight={highlight} position={{ x: 100, y: 100 }} />
    );

    expect(screen.getByText('Nota da marcação')).toBeDefined();
    expect(screen.getByText('Revisar este capítulo para o exame.')).toBeDefined();
    expect(screen.getByText(/"Conceitos fundamentais"/i)).toBeDefined();
  });
});
