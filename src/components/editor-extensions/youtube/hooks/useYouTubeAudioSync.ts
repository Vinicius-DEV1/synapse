import { useEffect, useRef } from 'react';
import type { YouTubeStreamInfo } from '../../../../api/types';

interface UseYouTubeAudioSyncProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  streamInfo: YouTubeStreamInfo | null;
  isUsingEmbedFallback: boolean;
}

/**
 * Synchronizes separate DASH audio and video streams for native YouTube playback.
 * Registers media event handlers and runs a micro-sync RAF loop to eliminate drift.
 */
export function useYouTubeAudioSync({
  videoRef,
  audioRef,
  streamInfo,
  isUsingEmbedFallback,
}: UseYouTubeAudioSyncProps) {
  const syncLoopRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio || !streamInfo?.audio_url || isUsingEmbedFallback) return;

    // Sync initial audio volume and mute state
    audio.volume = video.volume;
    audio.muted = video.muted;

    const handlePlay = () => {
      audio.play().catch(() => {});
    };

    const handlePause = () => {
      audio.pause();
    };

    const handleSeeking = () => {
      audio.currentTime = video.currentTime;
      audio.pause();
    };

    const handleSeeked = () => {
      audio.currentTime = video.currentTime;
      if (!video.paused) {
        audio.play().catch(() => {});
      }
    };

    const handleWaiting = () => {
      audio.pause();
    };

    const handlePlaying = () => {
      audio.currentTime = video.currentTime;
      if (!video.paused) {
        audio.play().catch(() => {});
      }
    };

    const handleRateChange = () => {
      audio.playbackRate = video.playbackRate;
    };

    const handleVolumeChange = () => {
      audio.volume = video.volume;
      audio.muted = video.muted;
    };

    const handleEnded = () => {
      audio.pause();
      audio.currentTime = 0;
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('ratechange', handleRateChange);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('ended', handleEnded);

    // Micro-sync RAF loop to correct any minor playback drift (> 250ms)
    const syncAudio = () => {
      if (video && audio && !video.paused && !video.seeking && !audio.seeking) {
        const drift = Math.abs(video.currentTime - audio.currentTime);
        if (drift > 0.25) {
          audio.currentTime = video.currentTime;
        }
      }
      syncLoopRef.current = requestAnimationFrame(syncAudio);
    };
    syncLoopRef.current = requestAnimationFrame(syncAudio);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('ratechange', handleRateChange);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ended', handleEnded);
      if (syncLoopRef.current) {
        cancelAnimationFrame(syncLoopRef.current);
      }
    };
  }, [videoRef, audioRef, streamInfo, isUsingEmbedFallback]);
}
