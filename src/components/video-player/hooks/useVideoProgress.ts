import { useState, useEffect, useRef, useCallback } from 'react';
import type { VideoItem } from '../../../types';

export function useVideoProgress(
  video: VideoItem,
  isPlaying: boolean,
  videoRef: React.RefObject<HTMLVideoElement>
) {
  const [duration, setDuration] = useState(video.duration || 0);
  const [savedProgress] = useState(video.progress || 0);
  const [showResumePrompt, setShowResumePrompt] = useState(() => (video.progress || 0) > 5);
  const lastSavedTime = useRef(video.progress || 0);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (savedProgress > 5 && videoRef.current) {
      videoRef.current.pause();
    }
  }, [savedProgress, videoRef]);

  const saveProgress = useCallback(async (currentTime: number) => {
    if (!window.api?.sync || currentTime <= 0) return;
    if (Math.abs(currentTime - lastSavedTime.current) < 0.5) return;
    lastSavedTime.current = currentTime;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      const now = new Date().toISOString();
      try {
        let currentRecord = video;
        if (window.api.sync.getTable) {
          const allVideos = (await window.api.sync.getTable('videos')) as VideoItem[];
          const fresh = allVideos.find(v => v.id === video.id);
          if (fresh) currentRecord = fresh;
        }
        const updated: VideoItem = { 
          ...currentRecord, 
          progress: currentTime,
          last_watched_at: now,
          updated_at: now 
        };
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
