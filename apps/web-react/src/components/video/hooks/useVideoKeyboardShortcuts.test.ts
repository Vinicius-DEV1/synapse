import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVideoKeyboardShortcuts } from './useVideoKeyboardShortcuts';

describe('useVideoKeyboardShortcuts Hook', () => {
  it('handles Space for play/pause, F for fullscreen, and Arrows for seek', () => {
    const togglePlay = vi.fn();
    const toggleFullscreen = vi.fn();
    const seekBy = vi.fn();
    const setActiveAudioIndex = vi.fn();
    const setActiveSubtitleIndex = vi.fn();

    renderHook(() =>
      useVideoKeyboardShortcuts({
        dictState: null,
        isFullscreen: false,
        audioTracks: [],
        subtitleTracks: [],
        togglePlay,
        toggleFullscreen,
        seekBy,
        setActiveAudioIndex,
        setActiveSubtitleIndex,
      })
    );

    // Space -> togglePlay
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(togglePlay).toHaveBeenCalled();

    // KeyF -> toggleFullscreen
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }));
    expect(toggleFullscreen).toHaveBeenCalled();

    // ArrowLeft -> seekBy(-5)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
    expect(seekBy).toHaveBeenCalledWith(-5);

    // ArrowRight -> seekBy(5)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
    expect(seekBy).toHaveBeenCalledWith(5);
  });
});
