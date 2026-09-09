import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import PracticeChat from './PracticeChat';
import type { TutorSession } from '../../types';

vi.mock('./hooks/usePracticeData', () => ({
  usePracticeData: vi.fn(() => ({
    messages: [
      { id: 'm1', session_id: 's1', role: 'model', text_content: 'Olá! Como posso ajudar?', created_at: 1000 },
    ],
    memories: [],
    saveMessage: vi.fn(),
    saveMemory: vi.fn(),
    deleteMemory: vi.fn(),
  })),
}));

vi.mock('./chat/hooks/useGeminiLiveSession', () => ({
  useGeminiLiveSession: vi.fn(() => ({
    wsRef: { current: null },
    playbackContextRef: { current: null },
    playbackAnalyserRef: { current: null },
    nextAudioTimeRef: { current: 0 },
    isPlayingRef: { current: false },
    isConnected: false,
    error: null,
    setError: vi.fn(),
    connectWebSocket: vi.fn(),
    disconnectWebSocket: vi.fn(),
    previewingVoice: null,
    previewVoice: vi.fn(),
    initPlayback: vi.fn(),
  })),
}));

vi.mock('./chat/hooks/useAudioVisualizer', () => ({
  useAudioVisualizer: vi.fn(() => ({
    visualizerRefs: { current: [] },
    isPlaying: false,
    setIsPlaying: vi.fn(),
  })),
}));

vi.mock('./chat/hooks/usePushToTalk', () => ({
  usePushToTalk: vi.fn(() => ({
    isRecording: false,
    micButtonRef: { current: null },
    startAudioCapture: vi.fn(),
    stopAudioCapture: vi.fn(),
  })),
}));

vi.mock('./chat/PracticeChatHeader', () => ({
  PracticeChatHeader: ({ session }: any) => (
    <div data-testid="practice-chat-header">{session.title}</div>
  ),
}));

vi.mock('./chat/ChatTranscript', () => ({
  ChatTranscript: ({ messages }: any) => (
    <div data-testid="chat-transcript">Mensagens: {messages.length}</div>
  ),
}));

vi.mock('./chat/PracticeCallControls', () => ({
  PracticeCallControls: () => <div data-testid="practice-call-controls" />,
}));

describe('PracticeChat Component', () => {
  const mockSession: TutorSession = {
    id: 's1',
    title: 'Sessão com IA Tutor',
    created_at: 1000,
    updated_at: 1000,
  };

  it('renders chat header, transcript and start call button, then shows call controls after start', () => {
    const { getByTestId, getByText } = render(<PracticeChat session={mockSession} />);

    expect(getByTestId('practice-chat-header')).toBeDefined();
    expect(getByText('Sessão com IA Tutor')).toBeDefined();
    expect(getByTestId('chat-transcript')).toBeDefined();
    expect(getByText('Mensagens: 1')).toBeDefined();

    const startBtn = getByText(/INICIAR LIGAÇÃO/i);
    expect(startBtn).toBeDefined();

    fireEvent.click(startBtn);

    expect(getByTestId('practice-call-controls')).toBeDefined();
  });
});
