import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAudioVisualizer } from './useAudioVisualizer';

describe('useAudioVisualizer Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes visualizer refs and animation frame when in call', () => {
    const isPlayingRef = { current: false };
    const isRecordingRef = { current: false };
    const playbackAnalyserRef = { current: null };
    const analyserRef = { current: null };
    const playbackContextRef = { current: null };
    const nextAudioTimeRef = { current: 0 };

    const { result } = renderHook(() =>
      useAudioVisualizer({
        isInCall: true,
        isPlayingRef,
        isRecordingRef,
        playbackAnalyserRef,
        analyserRef,
        playbackContextRef,
        nextAudioTimeRef,
      })
    );

    expect(result.current.visualizerRefs).toBeDefined();
    expect(result.current.isPlaying).toBe(false);
  });
});
