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
  isMuted?: boolean;
  setIsMuted?: React.Dispatch<React.SetStateAction<boolean>>;
  volume?: number;
  setVolume?: React.Dispatch<React.SetStateAction<number>>;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
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
  isMuted: externalIsMuted,
  setIsMuted: externalSetIsMuted,
  volume: externalVolume,
  setVolume: externalSetVolume,
}: UseVideoPlaybackEngineProps) {
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;
  const setIsPlaying = externalSetIsPlaying || setInternalIsPlaying;

  const [internalIsBuffering, setInternalIsBuffering] = useState(true);
  const isBuffering = externalIsBuffering !== undefined ? externalIsBuffering : internalIsBuffering;
  const setIsBuffering = externalSetIsBuffering || setInternalIsBuffering;

  const [internalVolume, setInternalVolume] = useState(1);
  const volume = externalVolume !== undefined ? externalVolume : internalVolume;
  const setVolume = (externalSetVolume as unknown as React.Dispatch<React.SetStateAction<number>>) || setInternalVolume;

  const [internalIsMuted, setInternalIsMuted] = useState(false);
  const isMuted = externalIsMuted !== undefined ? externalIsMuted : internalIsMuted;
  const setIsMuted = externalSetIsMuted || setInternalIsMuted;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [playbackRate, setPlaybackRate] = useState(1);
  const [subtitleOffset, setSubtitleOffset] = useState(0);

  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);

  const clearLoop = () => {
    setLoopA(null);
    setLoopB(null);
  };

  const changePlaybackRate = (rate: number) => {
    if (videoRef.current) videoRef.current.playbackRate = rate;
    if (audioRef.current) audioRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        if (audioRef.current && activeAudioUrl) {
          audioRef.current.play().catch(() => {});
        }
        setIsPlaying(true);
        if (showResumePrompt) setShowResumePrompt(false);
      } else {
        videoRef.current.pause();
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
        setIsBuffering(false);
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

  const setVolumeDirectly = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    if (videoRef.current) {
      if (activeAudioUrl && audioRef.current) {
        audioRef.current.volume = clamped;
      } else {
        videoRef.current.volume = clamped;
      }
      setVolume(clamped);
      if (clamped === 0) setIsMuted(true);
      else setIsMuted(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolumeDirectly(val);
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
      if (loopA !== null && loopB !== null && videoRef.current.currentTime >= loopB) {
        videoRef.current.currentTime = loopA;
        if (audioRef.current) audioRef.current.currentTime = loopA;
      }
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
    setVolumeDirectly,
    handleVolumeChange,
    handleSeek,
    handleTimeUpdate,
    handleLoadedMetadata,
    playbackRate,
    changePlaybackRate,
    subtitleOffset,
    setSubtitleOffset,
    loopA,
    setLoopA,
    loopB,
    setLoopB,
    clearLoop,
  };
}
