import { useState, useEffect, useRef } from 'react';
import type { VideoItem, TrackItem } from '../../../types';

export function useVideoTracks(
  video: VideoItem,
  isPlaying: boolean,
  isMuted: boolean,
  videoRef: React.RefObject<HTMLVideoElement | null>,
  audioRef: React.RefObject<HTMLAudioElement | null>
) {
  const [audioTracks, setAudioTracks] = useState<TrackItem[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<TrackItem[]>([]);
  const [activeAudioIndex, setActiveAudioIndex] = useState<number>(-1);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number>(0);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  
  const syncLoopRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    try {
      if (video.audio_tracks_json) {
        setAudioTracks(JSON.parse(video.audio_tracks_json));
      }
      
      const tracks: TrackItem[] = [{ id: 'none', label: 'Sem Legenda' }];
      

      // Adiciona as legendas extras
      if (video.subtitles_json) {
        try {
          const parsedSubs = JSON.parse(video.subtitles_json);
          tracks.push(...parsedSubs);
        } catch (e) { console.warn(e); }
      }
      
      setSubtitleTracks(tracks);
      
      if (tracks.length > 1) {
        setActiveSubtitleIndex(1); // Auto-seleciona a primeira legenda real
      } else {
        setActiveSubtitleIndex(0); // Sem legenda
      }
    } catch (e) {
      console.error("Failed to parse tracks", e);
    }
  }, [video]);

  useEffect(() => {
    let isMounted = true;
    if (activeAudioIndex === -1) {
      setActiveAudioUrl(null);
      if (videoRef.current) videoRef.current.muted = isMuted;
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

  useEffect(() => {
    const syncAudio = () => {
      if (videoRef.current && audioRef.current && activeAudioUrl && isPlaying) {
        const vTime = videoRef.current.currentTime;
        const aTime = audioRef.current.currentTime;
        const diff = Math.abs(vTime - aTime);
        
        if (diff > 0.15 && videoRef.current.readyState >= 3) {
          audioRef.current.currentTime = vTime;
        }
      }
      syncLoopRef.current = requestAnimationFrame(syncAudio);
    };

    if (isPlaying) {
      syncLoopRef.current = requestAnimationFrame(syncAudio);
    } else if (syncLoopRef.current) {
      cancelAnimationFrame(syncLoopRef.current);
    }

    return () => {
      if (syncLoopRef.current) cancelAnimationFrame(syncLoopRef.current);
    };
  }, [isPlaying, activeAudioUrl, videoRef, audioRef]);

  return {
    audioTracks,
    subtitleTracks,
    activeAudioIndex,
    setActiveAudioIndex,
    activeSubtitleIndex,
    setActiveSubtitleIndex,
    activeAudioUrl
  };
}
