import { useEffect } from 'react';
import type { YouTubeStreamInfo } from '../../../../api/types';

interface UseYouTubeStallDetectionProps {
  isUsingEmbedFallback: boolean;
  streamInfo: YouTubeStreamInfo | null;
  videoId: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isMountedRef: React.RefObject<boolean>;
  onTriggerFallback: (isFallback: boolean) => void;
}

/**
 * Smart auto-fallback stall detection:
 * If native streaming stalls or fails to buffer within 3.5s, smoothly switches
 * to the official YouTube embed player.
 */
export function useYouTubeStallDetection({
  isUsingEmbedFallback,
  streamInfo,
  videoId,
  videoRef,
  isMountedRef,
  onTriggerFallback,
}: UseYouTubeStallDetectionProps) {
  useEffect(() => {
    if (isUsingEmbedFallback || !streamInfo || !videoId) return;

    let stallTimer: ReturnType<typeof setTimeout> | null = null;
    let hasStartedPlayback = false;

    const clearTimer = () => {
      if (stallTimer) {
        clearTimeout(stallTimer);
        stallTimer = null;
      }
    };

    const triggerFallback = (reason: string) => {
      if (isMountedRef.current && !hasStartedPlayback) {
        console.warn(`[YouTubeWatchModal] Native stream stalled (${reason}), falling back to official player.`);
        clearTimer();
        onTriggerFallback(true);
      }
    };

    stallTimer = setTimeout(() => {
      const video = videoRef.current;
      if (!video) return;
      if (video.currentTime === 0 && video.readyState < 2) {
        triggerFallback('timeout: buffer not ready after 3.5s');
      }
    }, 3500);

    const video = videoRef.current;
    if (!video) return clearTimer;

    const handlePlaying = () => {
      hasStartedPlayback = true;
      clearTimer();
    };

    const handleTimeUpdate = () => {
      if (video.currentTime > 0.1) {
        hasStartedPlayback = true;
        clearTimer();
      }
    };

    const handleStalled = () => {
      if (!hasStartedPlayback) {
        clearTimer();
        stallTimer = setTimeout(() => {
          triggerFallback('video stalled event');
        }, 1500);
      }
    };

    const handleError = () => {
      triggerFallback('native video error');
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('error', handleError);

    return () => {
      clearTimer();
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('error', handleError);
    };
  }, [streamInfo, isUsingEmbedFallback, videoId, videoRef, isMountedRef, onTriggerFallback]);
}
