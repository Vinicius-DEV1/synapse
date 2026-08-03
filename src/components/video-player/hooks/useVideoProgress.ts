import { useState, useEffect, useRef } from 'react';
import type { VideoItem } from '../../../types';

export function useVideoProgress(
  video: VideoItem,
  isPlaying: boolean,
  videoRef: React.RefObject<HTMLVideoElement>
) {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const setProgressWithRef = (p: number) => {
    progressRef.current = p;
    setProgress(p);
  };
  const [duration, setDuration] = useState(video.duration || 0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedProgress] = useState(video.progress || 0);

  useEffect(() => {
    if (savedProgress > 5) {
      setShowResumePrompt(true);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  }, [savedProgress, videoRef]);

  const saveProgress = async (currentTime: number) => {
    if (window.api?.sync && currentTime > 0) {
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
        console.error(e);
      }
    }
  };

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
       saveProgress(progressRef.current);
    }, 10000);
    return () => clearInterval(interval);
  }, [isPlaying, video]);

  return {
    progress,
    setProgress: setProgressWithRef,
    duration,
    setDuration,
    showResumePrompt,
    setShowResumePrompt,
    savedProgress,
    saveProgress
  };
}
