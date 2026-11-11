import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HighlightToolbar from './HighlightToolbar';

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

vi.mock('../../../ui/ToastContext', () => ({
  triggerToast: vi.fn(),
}));

describe('HighlightToolbar', () => {
  const defaultProps = {
    position: { x: 200, y: 300 },
    selectedText: 'Texto selecionado para teste',
    onHighlight: vi.fn(),
    onUpdateHighlight: vi.fn(),
    onDeleteHighlight: vi.fn(),
    onDictionary: vi.fn(),
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 5 highlight colors and action buttons', () => {
    render(<HighlightToolbar {...defaultProps} />);

    expect(screen.getByTitle('Amarelo')).toBeDefined();
    expect(screen.getByTitle('Verde')).toBeDefined();
    expect(screen.getByTitle('Azul')).toBeDefined();
    expect(screen.getByTitle('Rosa')).toBeDefined();
    expect(screen.getByTitle('Laranja')).toBeDefined();
    expect(screen.getByTitle('Copiar texto')).toBeDefined();
    expect(screen.getByTitle('Dicionário / Traduzir')).toBeDefined();
    expect(screen.getByTitle('Adicionar nota')).toBeDefined();
  });

  it('calls onHighlight with selected color when a color is clicked', () => {
    render(<HighlightToolbar {...defaultProps} />);

    fireEvent.click(screen.getByTitle('Amarelo'));
    expect(defaultProps.onHighlight).toHaveBeenCalledWith('yellow');
  });

  it('copies text and triggers toast when copy button is clicked', async () => {
    const { triggerToast } = await import('../../../ui/ToastContext');
    render(<HighlightToolbar {...defaultProps} />);

    const copyBtn = screen.getByTitle('Copiar texto');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Texto selecionado para teste');
    await waitFor(() => {
      expect(triggerToast).toHaveBeenCalledWith(
        'Texto copiado para a área de transferência',
        'success'
      );
    });
  });

  it('calls onDismiss when Escape key is pressed', () => {
    render(<HighlightToolbar {...defaultProps} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when close button is clicked', () => {
    render(<HighlightToolbar {...defaultProps} />);

    const closeBtn = screen.getByTitle(/Fechar/i);
    fireEvent.click(closeBtn);
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('toggles note input and submits note with color', () => {
    render(<HighlightToolbar {...defaultProps} />);

    const noteToggleBtn = screen.getByTitle('Adicionar nota');
    fireEvent.click(noteToggleBtn);

    const noteInput = screen.getByPlaceholderText('Adicionar nota...');
    fireEvent.change(noteInput, { target: { value: 'Minha anotação importante' } });

    // Select color first
    fireEvent.click(screen.getByTitle('Verde'));

    const okBtn = screen.getByRole('button', { name: /ok/i });
    fireEvent.click(okBtn);

    expect(defaultProps.onHighlight).toHaveBeenCalledWith('green', 'Minha anotação importante');
  });

  it('calls onDeleteHighlight when trash icon is clicked on existing highlight', () => {
    render(
      <HighlightToolbar
        {...defaultProps}
        existingHighlight={{ id: 'hl-99', color: 'blue' }}
      />
    );

    const deleteBtn = screen.getByTitle('Excluir marcação');
    fireEvent.click(deleteBtn);

    expect(defaultProps.onDeleteHighlight).toHaveBeenCalledWith('hl-99');
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });
});
