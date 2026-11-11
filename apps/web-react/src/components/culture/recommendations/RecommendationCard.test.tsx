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

  it('renders title, year, emoji badges, and omits affinity reason on the small card', () => {
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
    expect(screen.getByTitle('Clássico')).toHaveTextContent('🏆');
    expect(screen.getByTitle('Formato: filme')).toHaveTextContent('🎬');
    // Affinity reason should NOT be rendered on the compact card to keep it clean
    expect(
      screen.queryByText(/Porque você assistiu Her/)
    ).not.toBeInTheDocument();
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

    const button = screen.getByRole('button', { name: /na coleção/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
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

    expect(screen.getByTitle('Dezembro 2026')).toHaveTextContent('⏳');
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

  it('calls onClick when clicking on the card', () => {
    const handleClick = vi.fn();
    render(
      <RecommendationCard
        item={mockItem}
        isAdded={false}
        onAdd={vi.fn()}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
        onClick={handleClick}
      />
    );

    const card = screen.getByRole('button', { name: /ver detalhes de arrival/i });
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledWith(mockItem);
  });

  it('calls onClick when pressing Enter key on the card', () => {
    const handleClick = vi.fn();
    render(
      <RecommendationCard
        item={mockItem}
        isAdded={false}
        onAdd={vi.fn()}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
        onClick={handleClick}
      />
    );

    const card = screen.getByRole('button', { name: /ver detalhes de arrival/i });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledWith(mockItem);
  });

  it('does not trigger onClick when clicking on the Add button', () => {
    const handleClick = vi.fn();
    const handleAdd = vi.fn();
    render(
      <RecommendationCard
        item={mockItem}
        isAdded={false}
        onAdd={handleAdd}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
        onClick={handleClick}
      />
    );

    const addButton = screen.getByRole('button', { name: /adicionar à coleção/i });
    fireEvent.click(addButton);

    expect(handleAdd).toHaveBeenCalledWith(mockItem);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders rating badge and duration below title while omitting platform', () => {
    const enrichedItem: HydratedRecommendation = {
      ...mockItem,
      rating: 8.7,
      rating_source: 'IMDb',
      platform: 'Paramount+ / Cinema',
      duration: '116 min',
    };

    render(
      <RecommendationCard
        item={enrichedItem}
        isAdded={false}
        onAdd={vi.fn()}
        onDislike={vi.fn()}
        onMarkAlreadySeen={vi.fn()}
      />
    );

    expect(screen.getByText('8.7')).toBeInTheDocument();
    expect(screen.getByText('• 116 min')).toBeInTheDocument();
    // Platform should NOT be rendered on the compact card to keep it clean
    expect(screen.queryByText('Paramount+ / Cinema')).not.toBeInTheDocument();
  });
});

