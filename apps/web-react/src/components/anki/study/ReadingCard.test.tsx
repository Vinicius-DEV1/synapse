import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ReadingCard } from './ReadingCard';
import type { Card } from '../types';

describe('ReadingCard Component', () => {
  const mockCard: Card = {
    id: 'card_read_1',
    deck_id: 'deck_1',
    card_type: 'reading',
    front: 'Ephemeral',
    back: 'Passageiro, temporário, efêmero',
    media_url: null,
    state: 0,
    created_at: '2026-08-22T08:00:00Z',
    updated_at: '2026-08-22T08:00:00Z',
    tags: ['vocabulário'],
    validation_mode: 'manual',
    custom_prompt: null,
  };

  it('renders card front and hides back when showingAnswer is false', () => {
    const { getByText, queryByText } = render(
      <ReadingCard
        card={mockCard}
        showingAnswer={false}
        onAnswerSubmit={vi.fn()}
        playAudio={vi.fn()}
        evaluating={false}
        exactMatch={null}
        aiFeedback={null}
      />
    );

    expect(getByText('Ephemeral')).toBeDefined();
    expect(queryByText('Passageiro, temporário, efêmero')).toBeNull();
  });

  it('renders both front and back when showingAnswer is true', () => {
    const { getByText } = render(
      <ReadingCard
        card={mockCard}
        showingAnswer={true}
        onAnswerSubmit={vi.fn()}
        playAudio={vi.fn()}
        evaluating={false}
        exactMatch={null}
        aiFeedback={null}
      />
    );

    expect(getByText('Ephemeral')).toBeDefined();
    expect(getByText('Passageiro, temporário, efêmero')).toBeDefined();
  });
});
