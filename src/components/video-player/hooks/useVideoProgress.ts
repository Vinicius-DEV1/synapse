import { useState, useEffect } from 'react';
import type { VideoItem } from '../../../types_video';

export function useVideoProgress(
  video: VideoItem,
  isPlaying: boolean,
  videoRef: React.RefObject<HTMLVideoElement>
) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
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
      const updated = { ...video, progress: currentTime };
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
      if (videoRef.current) {
        saveProgress(videoRef.current.currentTime);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isPlaying, video, videoRef]);

  return {
    progress,
    setProgress,
    duration,
    setDuration,
    showResumePrompt,
    setShowResumePrompt,
    savedProgress,
    saveProgress
  };
}
