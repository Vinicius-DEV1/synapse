import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePushToTalk } from './usePushToTalk';

describe('usePushToTalk Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getAudioTracks: () => [{ label: 'Mock Microphone' }],
        }),
      },
      writable: true,
      configurable: true,
    });
  });

  it('initializes in non-recording state', () => {
    const wsRef = { current: null };
    const saveMessage = vi.fn();
    const setLiveTranscript = vi.fn();
    const setError = vi.fn();

    const { result } = renderHook(() =>
      usePushToTalk({
        isConnected: true,
        isInCall: true,
        isMobile: false,
        wsRef,
        saveMessage,
        setLiveTranscript,
        setError,
      })
    );

    expect(result.current.isRecording).toBe(false);
    expect(result.current.micButtonRef).toBeDefined();
  });
});
