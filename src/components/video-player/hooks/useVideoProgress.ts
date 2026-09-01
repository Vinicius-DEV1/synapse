import { useState, useEffect, useRef, useCallback } from 'react';
import type { VideoItem } from '../../../types';

export function useVideoProgress(
  video: VideoItem,
  isPlaying: boolean,
  videoRef: React.RefObject<HTMLVideoElement>
) {
  const [duration, setDuration] = useState(video.duration || 0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedProgress] = useState(video.progress || 0);
  const lastSavedTime = useRef(video.progress || 0);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (savedProgress > 5) {
      setShowResumePrompt(true);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  }, [savedProgress, videoRef]);

  const saveProgress = useCallback(async (currentTime: number) => {
    if (!window.api?.sync || currentTime <= 0) return;
    if (Math.abs(currentTime - lastSavedTime.current) < 0.5) return;
    lastSavedTime.current = currentTime;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const now = new Date().toISOString();
      const updated = { 
        ...video, 
        progress: currentTime,
        last_watched_at: now,
        updated_at: now 
      };
      try {
        await window.api.sync.upsertRow('videos', updated);
      } catch (e) {
        console.error('Failed to save video progress:', e);
      }
    }, 200);
  }, [video]);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
       if (videoRef.current) saveProgress(videoRef.current.currentTime);
    }, 10000);
    return () => clearInterval(interval);
  }, [isPlaying, saveProgress, videoRef]);

  return {
    duration,
    setDuration,
    showResumePrompt,
    setShowResumePrompt,
    savedProgress,
    saveProgress
  };
}
