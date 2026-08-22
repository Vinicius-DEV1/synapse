import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ListeningCard } from './ListeningCard';
import type { Card } from '../types';

describe('ListeningCard Component', () => {
  const mockCard: Card = {
    id: 'card_listen_1',
    deck_id: 'deck_1',
    card_type: 'listening',
    front: 'Bonjour le monde',
    back: 'Olá mundo',
    media_url: 'https://example.com/audio.mp3',
    state: 0,
    created_at: '2026-08-22T08:00:00Z',
    updated_at: '2026-08-22T08:00:00Z',
    tags: ['francês'],
    validation_mode: 'manual',
    custom_prompt: null,
  };

  it('renders audio play button when question is hidden', () => {
    const playAudio = vi.fn();
    const onAnswerSubmit = vi.fn();

    const { getByRole } = render(
      <ListeningCard
        card={mockCard}
        showingAnswer={false}
        onAnswerSubmit={onAnswerSubmit}
        playAudio={playAudio}
        evaluating={false}
        exactMatch={null}
        aiFeedback={null}
      />
    );

    const button = getByRole('button');
    expect(button).toBeDefined();

    fireEvent.click(button);
    expect(playAudio).toHaveBeenCalled();
  });

  it('renders transcription and answer translation when showingAnswer is true', () => {
    const playAudio = vi.fn();
    const onAnswerSubmit = vi.fn();

    const { getByText } = render(
      <ListeningCard
        card={mockCard}
        showingAnswer={true}
        onAnswerSubmit={onAnswerSubmit}
        playAudio={playAudio}
        evaluating={false}
        exactMatch={null}
        aiFeedback={null}
      />
    );

    expect(getByText('Bonjour le monde')).toBeDefined();
    expect(getByText('Olá mundo')).toBeDefined();
    expect(getByText(/Ouvir Novamente/i)).toBeDefined();
  });
});
