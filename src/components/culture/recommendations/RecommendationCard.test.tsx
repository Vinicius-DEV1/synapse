import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecommendationCard } from './RecommendationCard';
import type { HydratedRecommendation } from '../../../types/culture-recommendations';

describe('RecommendationCard', () => {
  const mockItem: HydratedRecommendation = {
    id: 'rec_filme_arrival_2016',
    title: 'Arrival',
    original_title: 'Arrival',
    type: 'filme',
    year: 2016,
    tier: 'classic',
    cluster: 'Ficção Científica Existencial',
    affinity_reason: 'Porque você assistiu Her e aprecia abordagens reflexivas de comunicação e tempo.',
    confidence_score: 0.98,
    synopsis: 'A linguist works to communicate with extraterrestrial lifeforms.',
    cover_image: 'https://example.com/arrival.jpg',
  };

  it('renders title, year, tier badge, and affinity reason', () => {
    render(
      <RecommendationCard
        item={mockItem}
        isAdded={false}
        onAdd={vi.fn()}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
      />
    );

    expect(screen.getByText('Arrival')).toBeInTheDocument();
    expect(screen.getByText('2016')).toBeInTheDocument();
    expect(screen.getByText('Clássico')).toBeInTheDocument();
    expect(
      screen.getByText(/Porque você assistiu Her e aprecia abordagens reflexivas/)
    ).toBeInTheDocument();
  });

  it('calls onAdd when clicking the add button', () => {
    const handleAdd = vi.fn();
    render(
      <RecommendationCard
        item={mockItem}
        isAdded={false}
        onAdd={handleAdd}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /adicionar à coleção/i });
    fireEvent.click(button);
    expect(handleAdd).toHaveBeenCalledWith(mockItem);
  });

  it('shows "Na Coleção" state when isAdded is true', () => {
    render(
      <RecommendationCard
        item={mockItem}
        isAdded={true}
        onAdd={vi.fn()}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
      />
    );

    expect(screen.getByText('Na Coleção')).toBeInTheDocument();
  });

  it('renders upcoming badge and "Aguardar / Meta" button for upcoming tier', () => {
    const upcomingItem: HydratedRecommendation = {
      ...mockItem,
      id: 'rec_filme_dune_3',
      title: 'Dune: Messiah',
      tier: 'upcoming',
      expected_release_date: 'Dezembro 2026',
    };

    render(
      <RecommendationCard
        item={upcomingItem}
        isAdded={false}
        onAdd={vi.fn()}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
      />
    );

    expect(screen.getByText('Dezembro 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aguardar \/ meta/i })).toBeInTheDocument();
  });

  it('renders creator / director when provided', () => {
    const creatorItem: HydratedRecommendation = {
      ...mockItem,
      creator: 'Denis Villeneuve',
    };

    render(
      <RecommendationCard
        item={creatorItem}
        isAdded={false}
        onAdd={vi.fn()}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
      />
    );

    expect(screen.getByText('Denis Villeneuve')).toBeInTheDocument();
  });
});
