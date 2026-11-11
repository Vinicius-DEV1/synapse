import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TypingCard } from './TypingCard';
import type { AnkiCard } from '../../../types/anki';

describe('TypingCard Component', () => {
  const sampleTypingCard: AnkiCard = {
    id: 'card_type_1',
    deck_id: 'deck_1',
    front: 'Traduza: Book',
    back: 'Livro',
    card_type: 'typing',
    validation_mode: 'exact',
    interval: 1,
    ease_factor: 2.5,
    reps: 0,
    lapses: 0,
    state: 'new',
    due: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('renders front prompt and allows submitting typed answer', () => {
    const onAnswerSubmit = vi.fn();

    render(
      <TypingCard
        card={sampleTypingCard}
        showingAnswer={false}
        onAnswerSubmit={onAnswerSubmit}
        evaluating={false}
        exactMatch={null}
        aiFeedback={null}
      />
    );

    expect(screen.getByText('Traduza: Book')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Digite a resposta...');

    fireEvent.change(input, { target: { value: 'Livro' } });
    fireEvent.submit(input.closest('form')!);

    expect(onAnswerSubmit).toHaveBeenCalledWith('Livro');
  });

  it('displays correct feedback when answer is shown', () => {
    render(
      <TypingCard
        card={sampleTypingCard}
        showingAnswer={true}
        onAnswerSubmit={vi.fn()}
        evaluating={false}
        exactMatch={true}
        aiFeedback={null}
      />
    );

    expect(screen.getByText(/Sua resposta:/)).toBeInTheDocument();
    expect(screen.getByText('Livro')).toBeInTheDocument();
  });
});
