import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGeminiLiveSession } from './useGeminiLiveSession';
import type { TutorSession } from '../../../../types';

describe('useGeminiLiveSession Hook', () => {
  const mockSession: TutorSession = {
    id: 'tutor_sess_1',
    title: 'English Conversation Practice',
    created_at: 1000,
    updated_at: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes session state in disconnected mode', () => {
    const saveMessage = vi.fn();
    const saveMemory = vi.fn();
    const setLiveTranscript = vi.fn();

    const { result } = renderHook(() =>
      useGeminiLiveSession({
        session: mockSession,
        globalSystemPrompt: 'Prompt',
        aiVoice: 'Puck',
        memories: [],
        saveMessage,
        saveMemory,
        setLiveTranscript,
      })
    );

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.connectWebSocket).toBe('function');
    expect(typeof result.current.disconnectWebSocket).toBe('function');
  });
});
