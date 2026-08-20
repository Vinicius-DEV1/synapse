import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeckBrowser from './DeckBrowser';
import type { Deck, Card } from './types';

vi.mock('./hooks/useDecks', () => ({
  useDecks: () => ({ decks: [{ id: 'deck_1', name: 'Inglês' }] }),
}));

vi.mock('./hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({ play: vi.fn() }),
}));

vi.mock('./hooks/useCardSelection', () => ({
  useCardSelection: () => ({
    selectedIds: new Set(),
    toggleSelectAll: vi.fn(),
    toggleSelectGroup: vi.fn(),
    clearSelection: vi.fn(),
  }),
}));

const mockCards: Card[] = [
  {
    id: 'c1',
    deck_id: 'deck_1',
    front: 'Hello',
    back: 'Olá',
    card_type: 'basic',
    validation_mode: 'exact',
    interval: 1,
    ease_factor: 2.5,
    reps: 0,
    lapses: 0,
    state: 'new',
    due: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

vi.mock('./hooks/useDeckCards', () => ({
  useDeckCards: () => ({
    cards: mockCards,
    loading: false,
    refresh: vi.fn(),
  }),
}));

describe('DeckBrowser Component', () => {
  const sampleDeck: Deck = {
    id: 'deck_1',
    name: 'Inglês Básico',
    description: 'Vocabulário essencial',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('renders deck title and card list', () => {
    render(
      <DeckBrowser
        deck={sampleDeck}
        onClose={vi.fn()}
        onDeckDeleted={vi.fn()}
        onDeckUpdated={vi.fn()}
      />
    );

    expect(screen.getByText('Inglês Básico')).toBeInTheDocument();
    expect(screen.getByText('Vocabulário essencial')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Olá')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();

    render(
      <DeckBrowser
        deck={sampleDeck}
        onClose={onClose}
        onDeckDeleted={vi.fn()}
        onDeckUpdated={vi.fn()}
      />
    );

    const closeBtn = document.body.querySelector('.lucide-x')?.closest('button');
    expect(closeBtn).not.toBeNull();
    fireEvent.click(closeBtn!);

    expect(onClose).toHaveBeenCalled();
  });
});
