import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import StudySession from './StudySession';

let mockHandleRating = vi.fn();
let mockRevealAnswer = vi.fn();
let mockLoadDueCards = vi.fn();

vi.mock('./hooks/useStudySession', () => ({
  useStudySession: vi.fn(() => ({
    cards: [
      {
        id: 'card_1',
        deck_id: 'deck_1',
        card_type: 'reading',
        front: 'Serendipity',
        back: 'Achar algo bom por acaso',
        state: 0,
      },
    ],
    currentIndex: 0,
    currentCard: {
      id: 'card_1',
      deck_id: 'deck_1',
      card_type: 'reading',
      front: 'Serendipity',
      back: 'Achar algo bom por acaso',
      state: 0,
    },
    showingAnswer: false,
    setShowingAnswer: vi.fn(),
    loading: false,
    editingCard: null,
    setEditingCard: vi.fn(),
    evaluating: false,
    setEvaluating: vi.fn(),
    aiFeedback: null,
    setAiFeedback: vi.fn(),
    exactMatch: null,
    setExactMatch: vi.fn(),
    isRetry: false,
    intervals: { again: '< 1m', hard: '< 5m', good: '< 10m', easy: '1d' },
    sessionStartTime: Date.now(),
    sessionStats: { reviewed: 0, correct: 0 },
    flipState: 'front',
    loadDueCards: mockLoadDueCards,
    handleDeleteCard: vi.fn(),
    handleRating: mockHandleRating,
    handleRetryPractice: vi.fn(),
    revealAnswer: mockRevealAnswer,
  })),
}));

vi.mock('./hooks/useAudioPlayer', () => ({
  useAudioPlayer: vi.fn(() => ({
    play: vi.fn(),
    stop: vi.fn(),
    isPlaying: false,
  })),
}));

vi.mock('../ui/Portal', () => ({
  Portal: ({ children }: any) => <div data-testid="study-session-portal">{children}</div>,
}));

describe('StudySession Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders front card and shows answer button', () => {
    const onClose = vi.fn();
    const { getByText } = render(
      <StudySession deckId="deck_1" onClose={onClose} />
    );

    expect(getByText('Serendipity')).toBeDefined();
    const showBtn = getByText(/Mostrar Resposta/i);
    expect(showBtn).toBeDefined();

    fireEvent.click(showBtn);
    expect(mockRevealAnswer).toHaveBeenCalled();
  });
});
