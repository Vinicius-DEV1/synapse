import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PdfToolbar } from './PdfToolbar';

describe('PdfToolbar', () => {
  const defaultProps = {
    bookTitle: 'Dom Casmurro',
    onBack: vi.fn(),
    showMobileTools: false,
    onResetMobileToolsTimer: vi.fn(),
    currentPage: 3,
    totalPages: 25,
    onPageChange: vi.fn(),
    zoom: 1.0,
    onZoom: vi.fn(),
    onFitWidth: vi.fn(),
    showSearch: false,
    onToggleSearch: vi.fn(),
    isBookmarked: false,
    onToggleBookmark: vi.fn(),
    readingMode: 'light',
    onCycleReadingMode: vi.fn(),
    showAnnotations: false,
    onToggleAnnotations: vi.fn(),
    onShowInfo: vi.fn(),
  };

  it('renders page numbers, zoom and action buttons', () => {
    render(<PdfToolbar {...defaultProps} />);

    expect(screen.getByText('25')).toBeDefined();
    expect(screen.getByTitle('Voltar')).toBeDefined();
    expect(screen.getByTitle('Aumentar (Ctrl++)')).toBeDefined();
    expect(screen.getByTitle('Diminuir (Ctrl+-)')).toBeDefined();
    expect(screen.getByTitle('Buscar (Ctrl+F)')).toBeDefined();
    expect(screen.getByTitle('Marcar página (B)')).toBeDefined();
  });

  it('calls onBack when back button is clicked', () => {
    render(<PdfToolbar {...defaultProps} />);

    fireEvent.click(screen.getByTitle('Voltar'));
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onPageChange when page input is changed', () => {
    render(<PdfToolbar {...defaultProps} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '7' } });
    expect(defaultProps.onPageChange).toHaveBeenCalledWith(7);
  });

  it('calls onZoom when zoom buttons are clicked', () => {
    render(<PdfToolbar {...defaultProps} />);

    fireEvent.click(screen.getByTitle('Aumentar (Ctrl++)'));
    expect(defaultProps.onZoom).toHaveBeenCalledTimes(1);
  });

  it('disappears completely on mobile when showMobileTools is false', () => {
    const { container } = render(<PdfToolbar {...defaultProps} showMobileTools={false} />);

    const verticalToolbar = container.querySelector('.top-1\\/2');
    expect(verticalToolbar).toBeDefined();
    expect(verticalToolbar?.className).toContain('opacity-0');
    expect(verticalToolbar?.className).toContain('pointer-events-none');
    expect(verticalToolbar?.className).toContain('md:pointer-events-auto');
    expect(verticalToolbar?.className).toContain('md:opacity-30');
  });

  it('displays with full opacity when showMobileTools is true', () => {
    const { container } = render(<PdfToolbar {...defaultProps} showMobileTools={true} />);

    const verticalToolbar = container.querySelector('.top-1\\/2');
    expect(verticalToolbar).toBeDefined();
    expect(verticalToolbar?.className).toContain('opacity-100');
    expect(verticalToolbar?.className).toContain('pointer-events-auto');
  });

  it('calls onResetMobileToolsTimer when touched or clicked', () => {
    const onResetMobileToolsTimer = vi.fn();
    const { container } = render(
      <PdfToolbar {...defaultProps} onResetMobileToolsTimer={onResetMobileToolsTimer} />
    );

    const verticalToolbar = container.querySelector('.top-1\\/2') as HTMLElement;
    fireEvent.touchStart(verticalToolbar);
    expect(onResetMobileToolsTimer).toHaveBeenCalled();

    fireEvent.click(verticalToolbar);
    expect(onResetMobileToolsTimer).toHaveBeenCalledTimes(2);
  });
});
