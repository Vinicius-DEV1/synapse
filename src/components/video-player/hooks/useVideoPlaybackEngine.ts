import { useState, type RefObject } from 'react';
import type { VideoItem } from '../../../types';

interface UseVideoPlaybackEngineProps {
  video: VideoItem;
  videoRef: RefObject<HTMLVideoElement | null>;
  audioRef: RefObject<HTMLAudioElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  activeAudioUrl?: string | null;
  duration: number;
  setDuration: (dur: number) => void;
  saveProgress: (time: number) => Promise<void>;
  showResumePrompt: boolean;
  setShowResumePrompt: (show: boolean) => void;
  resetControls: () => void;
  onDurationLoaded?: (duration: number) => void;
  isPlaying?: boolean;
  setIsPlaying?: React.Dispatch<React.SetStateAction<boolean>>;
  isBuffering?: boolean;
  setIsBuffering?: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useVideoPlaybackEngine({
  video,
  videoRef,
  audioRef,
  containerRef,
  activeAudioUrl,
  duration,
  setDuration,
  saveProgress,
  showResumePrompt,
  setShowResumePrompt,
  resetControls,
  onDurationLoaded,
  isPlaying: externalIsPlaying,
  setIsPlaying: externalSetIsPlaying,
  isBuffering: externalIsBuffering,
  setIsBuffering: externalSetIsBuffering,
}: UseVideoPlaybackEngineProps) {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;
  const setIsPlaying = externalSetIsPlaying || setInternalIsPlaying;

  const [internalIsBuffering, setInternalIsBuffering] = useState(true);
  const isBuffering = externalIsBuffering !== undefined ? externalIsBuffering : internalIsBuffering;
  const setIsBuffering = externalSetIsBuffering || setInternalIsBuffering;

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        if (audioRef.current && activeAudioUrl) {
          if (Math.abs(audioRef.current.currentTime - videoRef.current.currentTime) > 0.05) {
            audioRef.current.currentTime = videoRef.current.currentTime;
          }
          audioRef.current.play().catch(() => {});
        }
        setIsPlaying(true);
        if (showResumePrompt) setShowResumePrompt(false);
      } else {
        videoRef.current.pause();
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
        saveProgress(videoRef.current.currentTime);
      }
    }
  };

  const seekBy = (seconds: number) => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const maxDuration = duration || videoRef.current.duration || 0;
      const newTime = Math.max(0, Math.min(maxDuration, currentTime + seconds));

      videoRef.current.currentTime = newTime;
      if (audioRef.current) audioRef.current.currentTime = newTime;
      resetControls();
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Error fullscreen:', err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (activeAudioUrl && audioRef.current) {
        audioRef.current.muted = !isMuted;
      } else {
        videoRef.current.muted = !isMuted;
      }
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (videoRef.current) {
      if (activeAudioUrl && audioRef.current) {
        audioRef.current.volume = val;
      } else {
        videoRef.current.volume = val;
      }
      setVolume(val);
      if (val === 0) setIsMuted(true);
      else setIsMuted(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      if (audioRef.current) audioRef.current.currentTime = time;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setIsBuffering(false);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      let vidDur = videoRef.current.duration;
      if (!Number.isFinite(vidDur) || vidDur < (video.duration || 0)) {
        vidDur = video.duration || vidDur;
      }
      setDuration(vidDur);
      if (onDurationLoaded) onDurationLoaded(vidDur);
    }
  };

  return {
    isPlaying,
    setIsPlaying,
    volume,
    isMuted,
    isFullscreen,
    isBuffering,
    setIsBuffering,
    errorMsg,
    setErrorMsg,
    togglePlay,
    seekBy,
    toggleFullscreen,
    toggleMute,
    handleVolumeChange,
    handleSeek,
    handleTimeUpdate,
    handleLoadedMetadata,
  };
}
