import React, { useState, useRef, useEffect } from 'react';
import InteractiveSubtitles from './InteractiveSubtitles';
import { parseVtt } from '../../utils/vtt-parser';
import type { SubtitleCue } from '../../utils/vtt-parser';
import DictionaryModal from '../library/DictionaryModal';
import type { VideoItem } from '../../types';

import { useVideoProgress } from './hooks/useVideoProgress';
import { useVideoTracks } from './hooks/useVideoTracks';
import { useVideoVocabulary } from './hooks/useVideoVocabulary';
import { useVideoControls } from './hooks/useVideoControls';
import { useVideoKeyboardShortcuts } from './hooks/useVideoKeyboardShortcuts';
import { formatVideoTime, buildVideoSubtitleContext, calculateVideoClip } from './helpers/videoContextHelper';
import { VideoControlsOverlay } from './ui/VideoControlsOverlay';
import { VideoVocabularySidebar } from './ui/VideoVocabularySidebar';
import { VideoResumePrompt } from './ui/VideoResumePrompt';
import { useTimeTracker } from '../../hooks/useTimeTracker';

interface VideoPlayerProps {
  src: string;
  video: VideoItem;
  subtitleContent?: string;
  title: string;
  onClose: () => void;
  onDurationLoaded?: (duration: number) => void;
}

export default function VideoPlayer({ src, video, subtitleContent: _subtitleContent, title, onClose, onDurationLoaded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [activeCueText, setActiveCueText] = useState('');
  
  const [isBuffering, setIsBuffering] = useState(true);
  
  const [dictState, setDictState] = useState<{ 
    word: string; 
    context: string; 
    preloadedData?: any;
    video_clip?: { path: string; startMs: number; endMs: number };
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentSrc, setCurrentSrc] = useState(src);

  useTimeTracker({
    itemId: video.id,
    itemTitle: title || video.title || 'Unknown Video',
    module: 'video',
    isActive: isPlaying,
  });

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  // useVideoProgress e useVideoControls (hooks fora do escopo desta correção) ainda
  // declaram RefObject<T> sem `| null`, tipagem antiga do React < 19; o objeto de ref
  // em si é o mesmo e ambos os hooks já checam `.current` antes de usar.
  const { progress, setProgress, duration, setDuration, showResumePrompt, setShowResumePrompt, savedProgress, saveProgress } = useVideoProgress(video, isPlaying, videoRef as React.RefObject<HTMLVideoElement>);
  const { audioTracks, subtitleTracks, activeAudioIndex, setActiveAudioIndex, activeSubtitleIndex, setActiveSubtitleIndex, activeAudioUrl } = useVideoTracks(video, isPlaying, isMuted, videoRef, audioRef);
  const { videoWords, showVocabDrawer, setShowVocabDrawer, activeSavedWords, loadVideoWords } = useVideoVocabulary(video, cues, activeCueText);
  const { showControls, setIsHoveringControls, resetControls } = useVideoControls(isPlaying, containerRef as React.RefObject<HTMLDivElement>, !!dictState);

  useEffect(() => {
    const fetchNewSubtitle = async () => {
      if (activeSubtitleIndex > 0 && subtitleTracks[activeSubtitleIndex]) {
        try {
          const track = subtitleTracks[activeSubtitleIndex];
          const { getSubtitleText } = await import('../../services/video-manager');
          const { getCultureKey } = await import('../../store/useStore');
          let subText = '';
          if (track.local_path) subText = (await getSubtitleText(undefined, track.local_path, getCultureKey())) || '';
          if (!subText && track.drive_id) subText = (await getSubtitleText(track.drive_id, undefined, getCultureKey())) || '';
          
          if (subText) {
            const parsed = parseVtt(subText);
            setCues(parsed);
          } else {
            setCues([]);
          }
        } catch (e) {
          console.error('Error changing subtitle', e);
        }
      } else if (activeSubtitleIndex === 0) {
        setCues([]);
      }
    };
    fetchNewSubtitle();
  }, [activeSubtitleIndex, subtitleTracks]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        if (audioRef.current && activeAudioUrl) {
          audioRef.current.currentTime = videoRef.current.currentTime;
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
      setProgress(newTime);
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

  useVideoKeyboardShortcuts({
    dictState,
    isFullscreen,
    audioTracks,
    subtitleTracks,
    togglePlay,
    toggleFullscreen,
    seekBy,
    setActiveAudioIndex,
    setActiveSubtitleIndex,
  });

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setProgress(time);
      setIsBuffering(false);
      if (cues.length > 0) {
        const activeCue = cues.find(c => time >= c.startTime && time <= c.endTime);
        setActiveCueText(activeCue ? activeCue.text : '');
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

  const handleClose = async () => {
    if (videoRef.current) {
      await saveProgress(videoRef.current.currentTime);
    }
    onClose();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      if (audioRef.current) audioRef.current.currentTime = time;
      setProgress(time);
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

  const handleWordClick = (word: string, context: string) => {
    if (videoRef.current) {
      videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    }
    const time = videoRef.current ? videoRef.current.currentTime : 0;
    const currentIndex = cues.findIndex(c => time >= c.startTime && time <= c.endTime);
    const extendedContext = buildVideoSubtitleContext(cues, currentIndex, title, context);

    let preloadedData = null;
    const existingWord = activeSavedWords.find(vw => vw.word.toLowerCase() === word.toLowerCase());
    if (existingWord && existingWord.note) {
      try {
        preloadedData = JSON.parse(existingWord.note.replace('<!-- AI_DICT -->', ''));
      } catch {}
    }

    const video_clip = calculateVideoClip(cues, currentIndex, video.file_path || src);
    setDictState({ word, context: extendedContext, preloadedData, video_clip });
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black flex flex-col justify-center items-center overflow-hidden font-sans group">
      {errorMsg && (
        <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center text-white p-6 text-center">
          <div className="bg-red-500/20 text-red-300 p-4 rounded-lg max-w-lg border border-red-500/30">
            <h3 className="font-bold text-lg mb-2">Erro de Reprodução</h3>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {isBuffering && !errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-[55] pointer-events-none">
          <div className="relative flex items-center justify-center mb-4">
            <div className="w-16 h-16 border-4 border-white/20 border-t-brand-500 rounded-full animate-spin"></div>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={currentSrc}
        autoPlay
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onSeeked={() => setIsBuffering(false)}
        onError={() => {
          setIsBuffering(false);
          const err = videoRef.current?.error;
          if (err && err.code === 4) {
            setErrorMsg(window.api?.video ? 'Formato de vídeo não suportado nativamente.' : 'Este formato de vídeo não é suportado pelo navegador Web. Por favor, assista na versão Desktop.');
          }
        }}
        onPlay={() => {
          setIsBuffering(false);
          setIsPlaying(true);
          if (audioRef.current && activeAudioUrl) {
            audioRef.current.currentTime = videoRef.current?.currentTime || 0;
            audioRef.current.play().catch(e => console.warn(e));
          }
        }}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => {
          setIsPlaying(false);
          if (audioRef.current) audioRef.current.pause();
        }}
      />
      
      {activeAudioUrl && (
        <audio 
          ref={audioRef}
          src={activeAudioUrl}
          preload="auto"
          onWaiting={() => { if (videoRef.current) videoRef.current.pause(); }}
          onPlaying={() => { if (videoRef.current && isPlaying) videoRef.current.play().catch(() => {}); }}
        />
      )}

      <VideoResumePrompt
        show={showResumePrompt}
        savedProgress={savedProgress}
        onRestart={() => {
          setShowResumePrompt(false);
          if (videoRef.current) videoRef.current.play().catch(() => {});
        }}
        onResume={() => {
          if (videoRef.current) {
            videoRef.current.currentTime = savedProgress;
            videoRef.current.play().catch(() => {});
          }
          setShowResumePrompt(false);
        }}
      />

      {!dictState && (
        <InteractiveSubtitles 
          currentSubtitle={activeCueText} 
          onWordClick={handleWordClick} 
          savedWords={activeSavedWords}
        />
      )}

      <VideoControlsOverlay 
        title={title}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        showControls={showControls}
        audioTracks={audioTracks}
        subtitleTracks={subtitleTracks}
        activeAudioIndex={activeAudioIndex}
        activeSubtitleIndex={activeSubtitleIndex}
        videoWordsCount={videoWords ? videoWords.length : 0}
        onClose={handleClose}
        togglePlay={togglePlay}
        toggleMute={toggleMute}
        handleVolumeChange={handleVolumeChange}
        handleSeek={handleSeek}
        toggleFullscreen={toggleFullscreen}
        setActiveAudioIndex={setActiveAudioIndex}
        setActiveSubtitleIndex={setActiveSubtitleIndex}
        setShowVocabDrawer={setShowVocabDrawer}
        onPauseForDrawer={() => { if (videoRef.current) videoRef.current.pause(); }}
        formatTime={formatVideoTime}
        setIsHoveringControls={setIsHoveringControls}
      />

      {dictState && (
        <DictionaryModal 
          text={dictState.word}
          pageContext={dictState.context}
          preloadedData={dictState.preloadedData}
          videoClip={dictState.video_clip}
          onClose={() => setDictState(null)}
          sourceType="video"
          onSaveHighlight={async (color, note) => {
            if (window.api?.sync) {
              const newWord = {
                id: crypto.randomUUID(),
                video_id: video.id,
                word: dictState.word,
                context: dictState.context,
                timestamp: videoRef.current?.currentTime || 0,
                color,
                note,
              };
              await window.api.sync.upsertRow('video_words', newWord);
              loadVideoWords();
            }
          }}
        />
      )}

      {showVocabDrawer && (
        <VideoVocabularySidebar 
          video={video}
          videoWords={videoWords}
          setShowVocabDrawer={setShowVocabDrawer}
          videoRef={videoRef}
          loadVideoWords={loadVideoWords}
          setDictState={setDictState}
        />
      )}
    </div>
  );
}
