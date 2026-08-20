import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClozeCard } from './ClozeCard';
import type { AnkiCard } from '../../../types/anki';

describe('ClozeCard Component', () => {
  const sampleClozeCard: AnkiCard = {
    id: 'card_cloze_1',
    deck_id: 'deck_1',
    front: 'A capital da França é {{c1::Paris}}.',
    back: 'Cidade luz.',
    card_type: 'cloze',
    validation_mode: 'exact',
    ord: 0,
    interval: 1,
    ease_factor: 2.5,
    reps: 0,
    lapses: 0,
    state: 'new',
    due: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('renders input for the active cloze target when answer is not yet shown', () => {
    const onAnswerSubmit = vi.fn();

    render(
      <ClozeCard
        card={sampleClozeCard}
        showingAnswer={false}
        onAnswerSubmit={onAnswerSubmit}
        evaluating={false}
        exactMatch={null}
        aiFeedback={null}
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Paris' } });
    fireEvent.submit(input.closest('form')!);

    expect(onAnswerSubmit).toHaveBeenCalledWith('Paris');
  });

  it('renders answer with green styling when exactMatch is true', () => {
    render(
      <ClozeCard
        card={sampleClozeCard}
        showingAnswer={true}
        onAnswerSubmit={vi.fn()}
        evaluating={false}
        exactMatch={true}
        aiFeedback={null}
      />
    );

    expect(screen.getByText('___')).toBeInTheDocument();
    expect(screen.getByText('Cidade luz.')).toBeInTheDocument();
  });
});
