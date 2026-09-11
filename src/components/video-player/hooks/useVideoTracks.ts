import { useState, useEffect, useRef } from 'react';
import type { VideoItem, TrackItem } from '../../../types';

function parseAudioTracks(json?: string | null): TrackItem[] {
  if (json) {
    try {
      return JSON.parse(json);
    } catch (e) {
      console.error('Failed to parse audio tracks', e);
    }
  }
  return [];
}

function parseSubtitleTracks(json?: string | null): TrackItem[] {
  const tracks: TrackItem[] = [{ id: 'none', label: 'Sem Legenda' }];
  if (json) {
    try {
      const parsedSubs = JSON.parse(json);
      tracks.push(...parsedSubs);
    } catch (e) {
      console.warn(e);
    }
  }
  return tracks;
}

export function useVideoTracks(
  video: VideoItem,
  isPlaying: boolean,
  isMuted: boolean,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  audioRef: React.RefObject<HTMLAudioElement | null>
) {
  const [prevVideoId, setPrevVideoId] = useState(video.id);
  const [audioTracks, setAudioTracks] = useState<TrackItem[]>(() => parseAudioTracks(video.audio_tracks_json));
  const [subtitleTracks, setSubtitleTracks] = useState<TrackItem[]>(() => parseSubtitleTracks(video.subtitles_json));
  const [activeAudioIndex, setActiveAudioIndex] = useState<number>(-1);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number>(() => {
    const subs = parseSubtitleTracks(video.subtitles_json);
    return subs.length > 1 ? 1 : 0;
  });
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);

  if (video.id !== prevVideoId) {
    setPrevVideoId(video.id);
    const newAudio = parseAudioTracks(video.audio_tracks_json);
    const newSubs = parseSubtitleTracks(video.subtitles_json);
    setAudioTracks(newAudio);
    setSubtitleTracks(newSubs);
    setActiveSubtitleIndex(newSubs.length > 1 ? 1 : 0);
    setActiveAudioIndex(-1);
    setActiveAudioUrl(null);
  }
  
  const syncLoopRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    if (activeAudioIndex === -1) {
      if (videoRef.current) videoRef.current.muted = isMuted;
      Promise.resolve().then(() => {
        if (isMounted) setActiveAudioUrl(null);
      });
      return;
    }
    
    const track = audioTracks[activeAudioIndex];
    if (track) {
      if (videoRef.current) videoRef.current.muted = true;
      
      const resolveUrl = async () => {
        if (track.local_path && window.api?.video?.convertFileSrc) {
          const streamUrl = window.api.video.convertFileSrc(track.local_path);
          if (isMounted) setActiveAudioUrl(streamUrl);
        } else if (track.drive_id) {
          const { getVideoStreamLink } = await import('../../../services/video');
          try {
            const url = await getVideoStreamLink(track.drive_id);
            if (isMounted) setActiveAudioUrl(url);
          } catch(e) { console.error(e); }
        }
      };
      resolveUrl();
    }
    return () => {
      isMounted = false;
    };
  }, [activeAudioIndex, audioTracks, isMuted, videoRef]);

  const lastPlayTimeRef = useRef<number>(0);

  useEffect(() => {
    const syncAudio = () => {
      if (videoRef.current && audioRef.current && activeAudioUrl && isPlaying) {
        const vTime = videoRef.current.currentTime;
        const aTime = audioRef.current.currentTime;
        const diff = Math.abs(vTime - aTime);
        
        // Only force sync if we are past the 500ms grace period
        if (Date.now() - lastPlayTimeRef.current > 500) {
          if (diff > 0.25 && videoRef.current.readyState >= 3) {
            audioRef.current.currentTime = vTime;
          }
        }
      }
      syncLoopRef.current = requestAnimationFrame(syncAudio);
    };

    if (isPlaying) {
      lastPlayTimeRef.current = Date.now();
      syncLoopRef.current = requestAnimationFrame(syncAudio);
    } else if (syncLoopRef.current) {
      cancelAnimationFrame(syncLoopRef.current);
    }

    return () => {
      if (syncLoopRef.current) cancelAnimationFrame(syncLoopRef.current);
    };
  }, [isPlaying, activeAudioUrl, videoRef, audioRef]);

  const addSubtitleTrack = (newTrack: TrackItem) => {
    setSubtitleTracks(prev => {
      const updated = [...prev, newTrack];
      setTimeout(() => {
        const newIdx = updated.findIndex(t => t.id === newTrack.id);
        if (newIdx !== -1) setActiveSubtitleIndex(newIdx);
      }, 50);
      return updated;
    });
  };

  return {
    audioTracks,
    subtitleTracks,
    setSubtitleTracks,
    addSubtitleTrack,
    activeAudioIndex,
    setActiveAudioIndex,
    activeSubtitleIndex,
    setActiveSubtitleIndex,
    activeAudioUrl
  };
}
