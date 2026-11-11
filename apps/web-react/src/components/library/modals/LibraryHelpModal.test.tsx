import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryHelpModal } from './LibraryHelpModal';

describe('LibraryHelpModal', () => {
  it('renders modal with default overview tab and allows tab switching', () => {
    const handleClose = vi.fn();
    render(<LibraryHelpModal onClose={handleClose} />);

    expect(screen.getByRole('dialog', { name: 'Guia do Usuário da Biblioteca' })).toBeDefined();
    expect(screen.getByText('Visão Geral da Biblioteca')).toBeDefined();

    // Switch to Collections tab
    const collectionsTab = screen.getByRole('button', { name: 'Coleções & Decks 3D' });
    fireEvent.click(collectionsTab);
    expect(screen.getByText('Coleções & Cards em Deck 3D')).toBeDefined();

    // Switch to Shortcuts tab
    const shortcutsTab = screen.getByRole('button', { name: 'Atalhos de Teclado' });
    fireEvent.click(shortcutsTab);
    expect(screen.getByText('Alternar tela cheia / ocultar barras')).toBeDefined();
  });

  it('closes on Escape key press or close button click', () => {
    const handleClose = vi.fn();
    render(<LibraryHelpModal onClose={handleClose} />);

    const closeBtn = screen.getByTitle('Fechar (Esc)');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
