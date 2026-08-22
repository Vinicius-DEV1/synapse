import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ChatTranscript } from './ChatTranscript';
import type { TutorMessage } from '../../../types';

vi.mock('./AudioMessagePlayer', () => ({
  AudioMessagePlayer: ({ src }: any) => <div data-testid="audio-player">{src}</div>,
}));

describe('ChatTranscript Component', () => {
  it('renders user and AI messages and system notifications correctly', () => {
    const messages: TutorMessage[] = [
      {
        id: 'm1',
        session_id: 's1',
        role: 'user',
        text_content: 'How do you say "desenvolvimento" in English?',
        created_at: 1000,
      },
      {
        id: 'm2',
        session_id: 's1',
        role: 'model',
        text_content: 'You say "development". [audio:data:audio/wav;base64,UklGRg==]',
        created_at: 1001,
      },
      {
        id: 'm3',
        session_id: 's1',
        role: 'model',
        text_content: '[SISTEMA] Chamada encerrada',
        created_at: 1002,
      },
    ];

    const { getByText, getByTestId } = render(<ChatTranscript messages={messages} />);

    expect(getByText('How do you say "desenvolvimento" in English?')).toBeDefined();
    expect(getByText('You say "development".')).toBeDefined();
    expect(getByTestId('audio-player')).toBeDefined();
    expect(getByText('Chamada encerrada')).toBeDefined();
  });
});
