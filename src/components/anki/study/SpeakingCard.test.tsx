import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { SpeakingCard } from './SpeakingCard';
import type { Card } from '../types';

let mockStartRecording = vi.fn();
let mockStopRecording = vi.fn();
let mockIsRecording = false;

vi.mock('../hooks/useAudioRecorder', () => ({
  useAudioRecorder: vi.fn(() => ({
    isRecording: mockIsRecording,
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
  })),
}));

describe('SpeakingCard Component', () => {
  const mockCard: Card = {
    id: 'card_speak_1',
    deck_id: 'deck_1',
    card_type: 'speaking',
    front: 'Pronuncie: "Thorough"',
    back: '/ˈθʌr.ə/ (Completo, minucioso)',
    media_url: null,
    state: 0,
    created_at: '2026-08-22T08:00:00Z',
    updated_at: '2026-08-22T08:00:00Z',
    tags: ['pronúncia'],
    validation_mode: 'ai',
    custom_prompt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRecording = false;
  });

  it('renders speech prompt and starts recording on mic button click', () => {
    const onAnswerSubmit = vi.fn();

    const { getByText, getByRole } = render(
      <SpeakingCard
        card={mockCard}
        showingAnswer={false}
        onAnswerSubmit={onAnswerSubmit}
        playAudio={vi.fn()}
        evaluating={false}
        exactMatch={null}
        aiFeedback={null}
      />
    );

    expect(getByText('Pronuncie: "Thorough"')).toBeDefined();
    const micBtn = getByRole('button');
    fireEvent.click(micBtn);

    expect(mockStartRecording).toHaveBeenCalled();
  });

  it('displays AI verdict and transcription feedback when answer is shown', () => {
    const { getByText } = render(
      <SpeakingCard
        card={mockCard}
        showingAnswer={true}
        onAnswerSubmit={vi.fn()}
        playAudio={vi.fn()}
        evaluating={false}
        exactMatch={null}
        aiFeedback={{
          verdict: 'Correto',
          feedback: 'Excelente entonação e pronúncia clara do /θ/.',
          transcription: 'thorough',
        }}
      />
    );

    expect(getByText(/IA: Correto/i)).toBeDefined();
    expect(getByText(/Excelente entonação/i)).toBeDefined();
    expect(getByText(/Transcrição da Fala:/i)).toBeDefined();
    expect(getByText(/\/ˈθʌr.ə\/ \(Completo, minucioso\)/i)).toBeDefined();
  });
});
