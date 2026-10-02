import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecommendationDetailsModal } from './RecommendationDetailsModal';
import type { HydratedRecommendation } from '../../../types/culture-recommendations';

describe('RecommendationDetailsModal', () => {
  const mockItem: HydratedRecommendation = {
    id: 'rec_filme_blade_runner_2049',
    title: 'Blade Runner 2049',
    original_title: 'Blade Runner 2049',
    type: 'filme',
    year: 2017,
    tier: 'classic',
    cluster: 'Distopias Cyberpunk & Consciência Sintética',
    creator: 'Dir. Denis Villeneuve',
    affinity_reason: 'Por sua admiração pela atmosfera melancólica e fotografia imersiva de ficções científicas maduras.',
    confidence_score: 0.96,
    synopsis: 'Young Blade Runner K unearths a long-buried secret that leads him to former Blade Runner Rick Deckard.',
    cover_image: 'https://example.com/blade_runner.jpg',
    rating: 8.0,
    genres: ['Sci-Fi', 'Mystery', 'Drama'],
  };

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <RecommendationDetailsModal
        item={mockItem}
        isOpen={false}
        onClose={vi.fn()}
        onAdd={vi.fn()}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
        isAdded={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders all detailed metadata, affinity rationale, and synopsis when open', () => {
    render(
      <RecommendationDetailsModal
        item={mockItem}
        isOpen={true}
        onClose={vi.fn()}
        onAdd={vi.fn()}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
        isAdded={false}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Blade Runner 2049')).toBeInTheDocument();
    expect(screen.getByText('(2017)')).toBeInTheDocument();
    expect(screen.getByText('Dir. Denis Villeneuve')).toBeInTheDocument();
    expect(screen.getByText(/Distopias Cyberpunk & Consciência Sintética/)).toBeInTheDocument();
    expect(screen.getByText(/Por Que Recomendamos Para Você/i)).toBeInTheDocument();
    expect(screen.getByText(/Por sua admiração pela atmosfera melancólica/)).toBeInTheDocument();
    expect(screen.getByText(/Young Blade Runner K unearths a long-buried secret/)).toBeInTheDocument();
    expect(screen.getByText('96% de afinidade')).toBeInTheDocument();
    expect(screen.getByText('8.0')).toBeInTheDocument();
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <RecommendationDetailsModal
        item={mockItem}
        isOpen={true}
        onClose={handleClose}
        onAdd={vi.fn()}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
        isAdded={false}
      />
    );

    const closeBtn = screen.getByTitle('Fechar (Esc)');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <RecommendationDetailsModal
        item={mockItem}
        isOpen={true}
        onClose={handleClose}
        onAdd={vi.fn()}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
        isAdded={false}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onAdd when clicking "Adicionar à Coleção"', () => {
    const handleAdd = vi.fn();
    render(
      <RecommendationDetailsModal
        item={mockItem}
        isOpen={true}
        onClose={vi.fn()}
        onAdd={handleAdd}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
        isAdded={false}
      />
    );

    const addBtn = screen.getByRole('button', { name: /adicionar à coleção/i });
    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledWith(mockItem);
  });

  it('calls onMarkAlreadySeen when clicking "Já Vi / Li"', () => {
    const handleMarkSeen = vi.fn();
    render(
      <RecommendationDetailsModal
        item={mockItem}
        isOpen={true}
        onClose={vi.fn()}
        onAdd={vi.fn()}
        onDislike={vi.fn()}
        onMarkAlreadySeen={handleMarkSeen}
        isAdded={false}
      />
    );

    const seenBtn = screen.getByRole('button', { name: /já vi \/ li/i });
    fireEvent.click(seenBtn);
    expect(handleMarkSeen).toHaveBeenCalledWith(mockItem);
  });

  it('calls onDislike when clicking "Não Tenho Interesse"', () => {
    const handleDislike = vi.fn();
    render(
      <RecommendationDetailsModal
        item={mockItem}
        isOpen={true}
        onClose={vi.fn()}
        onAdd={vi.fn()}
        onDislike={handleDislike}
        onMarkAlreadySeen={vi.fn()}
        isAdded={false}
      />
    );

    const dislikeBtn = screen.getByRole('button', { name: /não tenho interesse/i });
    fireEvent.click(dislikeBtn);
    expect(handleDislike).toHaveBeenCalledWith(mockItem);
  });

  it('displays added status when isAdded is true', () => {
    render(
      <RecommendationDetailsModal
        item={mockItem}
        isOpen={true}
        onClose={vi.fn()}
        onAdd={vi.fn()}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
        isAdded={true}
      />
    );

    expect(screen.getByText('Adicionado à Coleção')).toBeInTheDocument();
  });

  it('sanitizes legacy "Estrelando: ..." into cast and avoids displaying it as a synopsis', () => {
    const legacyItem: HydratedRecommendation = {
      ...mockItem,
      synopsis: 'Estrelando: Anya Taylor-Joy, Lee Pace',
      cast: undefined,
    };

    render(
      <RecommendationDetailsModal
        item={legacyItem}
        isOpen={true}
        onClose={vi.fn()}
        onAdd={vi.fn()}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
        isAdded={false}
      />
    );

    expect(screen.getByText('Elenco:')).toBeInTheDocument();
    expect(screen.getByText(/Anya Taylor-Joy, Lee Pace/)).toBeInTheDocument();
    expect(screen.queryByText(/^Sinopse$/)).not.toBeInTheDocument();
  });
});

