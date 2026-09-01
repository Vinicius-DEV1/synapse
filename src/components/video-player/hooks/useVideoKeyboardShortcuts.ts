import { useEffect, useRef } from 'react';
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
  playbackRate: number;
  changePlaybackRate: (rate: number) => void;
  subtitleOffset: number;
  setSubtitleOffset: React.Dispatch<React.SetStateAction<number>>;
  setLoopA: React.Dispatch<React.SetStateAction<number | null>>;
  setLoopB: React.Dispatch<React.SetStateAction<number | null>>;
  clearLoop: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  triggerFeedback?: (text: string, icon: 'rewind' | 'forward' | 'speed' | 'subtitle' | 'volume' | 'loop') => void;
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
  playbackRate,
  changePlaybackRate,
  subtitleOffset,
  setSubtitleOffset,
  setLoopA,
  setLoopB,
  clearLoop,
  videoRef,
  triggerFeedback,
}: UseVideoKeyboardShortcutsProps) {
  const seekAccumulatorRef = useRef(0);
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      } else if (e.key === '>') {
        e.preventDefault();
        const newRate = Math.min(2.5, playbackRate + 0.25);
        changePlaybackRate(newRate);
        if (triggerFeedback) triggerFeedback(`${newRate.toFixed(2)}x`, 'speed');
      } else if (e.key === '<') {
        e.preventDefault();
        const newRate = Math.max(0.25, playbackRate - 0.25);
        changePlaybackRate(newRate);
        if (triggerFeedback) triggerFeedback(`${newRate.toFixed(2)}x`, 'speed');
      } else if (e.key === ']') {
        e.preventDefault();
        setSubtitleOffset(prev => {
          const next = prev + 100;
          if (triggerFeedback) triggerFeedback(`Legenda ${next > 0 ? '+' : ''}${next}ms`, 'subtitle');
          return next;
        });
      } else if (e.key === '[') {
        e.preventDefault();
        setSubtitleOffset(prev => {
          const next = prev - 100;
          if (triggerFeedback) triggerFeedback(`Legenda ${next > 0 ? '+' : ''}${next}ms`, 'subtitle');
          return next;
        });
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        if (videoRef?.current) {
          const time = videoRef.current.currentTime;
          setLoopA(time);
          if (triggerFeedback) triggerFeedback('Loop A Marcado', 'loop');
        }
      } else if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        if (videoRef?.current) {
          const time = videoRef.current.currentTime;
          setLoopB(time);
          if (triggerFeedback) triggerFeedback('Loop B Marcado', 'loop');
        }
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        clearLoop();
        if (triggerFeedback) triggerFeedback('Loop Removido', 'loop');
      } else if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
        seekBy(-5);
        
        seekAccumulatorRef.current -= 5;
        const sign = seekAccumulatorRef.current > 0 ? '+' : '';
        if (triggerFeedback) triggerFeedback(`${sign}${seekAccumulatorRef.current}s`, seekAccumulatorRef.current > 0 ? 'forward' : 'rewind');
        
        if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = setTimeout(() => {
          seekAccumulatorRef.current = 0;
        }, 800);
      } else if (e.code === 'ArrowRight' || e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
        seekBy(5);
        
        seekAccumulatorRef.current += 5;
        const sign = seekAccumulatorRef.current > 0 ? '+' : '';
        if (triggerFeedback) triggerFeedback(`${sign}${seekAccumulatorRef.current}s`, seekAccumulatorRef.current > 0 ? 'forward' : 'rewind');
        
        if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = setTimeout(() => {
          seekAccumulatorRef.current = 0;
        }, 800);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    dictState, isFullscreen, audioTracks, subtitleTracks, togglePlay, toggleFullscreen, seekBy,
    setActiveAudioIndex, setActiveSubtitleIndex, playbackRate, changePlaybackRate, subtitleOffset,
    setSubtitleOffset, setLoopA, setLoopB, clearLoop, videoRef, triggerFeedback
  ]);
}
