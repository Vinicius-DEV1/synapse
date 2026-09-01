import { useEffect } from 'react';
import type { TrackItem } from '../../../types';

interface UseVideoKeyboardShortcutsProps {
  dictState: Record<string, unknown> | null;
  isFullscreen: boolean;
  audioTracks: TrackItem[];
  subtitleTracks: TrackItem[];
  togglePlay: () => void;
  toggleFullscreen: () => void;
  seekBy: (seconds: number) => void;
  setActiveAudioIndex: React.Dispatch<React.SetStateAction<number>>;
  setActiveSubtitleIndex: React.Dispatch<React.SetStateAction<number>>;
}

export function useVideoKeyboardShortcuts({
  dictState,
  isFullscreen,
  audioTracks,
  subtitleTracks,
  togglePlay,
  toggleFullscreen,
  seekBy,
  setActiveAudioIndex,
  setActiveSubtitleIndex,
}: UseVideoKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (dictState) return;
      const target = e.target as HTMLElement;
      if (
        (target instanceof HTMLInputElement && target.type !== 'range' && target.type !== 'button') ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'Escape' || e.key === 'Escape') {
        if (isFullscreen) toggleFullscreen();
      } else if (e.code === 'KeyF' || e.key === 'f') {
        toggleFullscreen();
      } else if (e.code === 'KeyA' || e.key === 'a') {
        setActiveAudioIndex(prev => (prev >= audioTracks.length - 1 ? -1 : prev + 1));
      } else if (e.code === 'KeyS' || e.key === 's') {
        if (subtitleTracks.length > 1) {
          setActiveSubtitleIndex(prev => (prev >= subtitleTracks.length - 1 ? 0 : prev + 1));
        }
      } else if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J' || e.key === '<') {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
        seekBy(-5);
      } else if (e.code === 'ArrowRight' || e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L' || e.key === '>') {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
        seekBy(5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dictState, isFullscreen, audioTracks, subtitleTracks, togglePlay, toggleFullscreen, seekBy, setActiveAudioIndex, setActiveSubtitleIndex]);
}
