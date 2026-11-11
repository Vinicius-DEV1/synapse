import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CultureHelpModal } from './CultureHelpModal';

describe('CultureHelpModal', () => {
  it('renders modal when isOpen is true and allows tab switching', () => {
    const handleClose = vi.fn();
    render(<CultureHelpModal isOpen={true} onClose={handleClose} />);

    expect(screen.getByRole('dialog', { name: 'Guia da Área de Cultura' })).toBeDefined();
    expect(screen.getByText('Catálogo de Mídias, Status e Avaliações')).toBeDefined();

    // Switch to Episodes tab
    const episodesTab = screen.getByRole('button', { name: /Séries & Episódios/i });
    fireEvent.click(episodesTab);
    expect(screen.getByText('Acompanhamento Granular de Episódios')).toBeDefined();

    // Switch to Goals tab
    const goalsTab = screen.getByRole('button', { name: /Metas & Objetivos/i });
    fireEvent.click(goalsTab);
    expect(screen.getByText('Objetivos de Consumo Cultural & Notas de Foco')).toBeDefined();
  });

  it('closes on Escape key press or close button click', () => {
    const handleClose = vi.fn();
    render(<CultureHelpModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByTitle('Fechar (Esc)');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('does not render when isOpen is false', () => {
    const handleClose = vi.fn();
    render(<CultureHelpModal isOpen={false} onClose={handleClose} />);

    expect(screen.queryByRole('dialog', { name: 'Guia da Área de Cultura' })).toBeNull();
  });
});
