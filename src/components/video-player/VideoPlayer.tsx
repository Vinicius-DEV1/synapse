import React, { useState, useRef, useEffect, useCallback } from 'react';
import InteractiveSubtitles from './InteractiveSubtitles';
import { parseVtt } from '../../utils/vtt-parser';
import type { SubtitleCue } from '../../utils/vtt-parser';
import DictionaryModal from '../library/modals/DictionaryModal';
import type { VideoItem, VideoWord } from '../../types';
import type { DictionaryData } from '../../types/dictionary';

import { useVideoProgress } from './hooks/useVideoProgress';
import { useVideoTracks } from './hooks/useVideoTracks';
import { useVideoVocabulary } from './hooks/useVideoVocabulary';
import { useVideoControls } from './hooks/useVideoControls';
import { useVideoKeyboardShortcuts } from './hooks/useVideoKeyboardShortcuts';
import { useVideoPlaybackEngine } from './hooks/useVideoPlaybackEngine';
import { formatVideoTime, buildVideoSubtitleContext, calculateVideoClip } from './helpers/videoContextHelper';
import { VideoControlsOverlay } from './ui/VideoControlsOverlay';
import { VideoVocabularySidebar } from './ui/VideoVocabularySidebar';
import { VideoResumePrompt } from './ui/VideoResumePrompt';
import { useTimeTracker } from '../../hooks/useTimeTracker';
import { VideoHelpModal } from './modals/VideoHelpModal';
import { FastForward, Rewind, Gauge, MessageSquare, Volume2 as VolIcon, Repeat } from 'lucide-react';
import { attachSubtitleToVideo } from '../../services/video';
import { getCultureKey } from '../../store/useStore';
import { triggerToast } from '../ui/ToastContext';

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
  
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  
  const [dictState, setDictState] = useState<{ 
    word: string; 
    context: string; 
    preloadedData?: DictionaryData | null;
    video_clip?: { path: string; startMs: number; endMs: number };
  } | null>(null);

  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  const videoExtension = React.useMemo(() => {
    if (src.includes('_web.mp4') || (video.drive_web_file_id && !video.is_local && !src.includes(video.original_name))) {
      return 'mp4';
    }
    return video.original_name?.split('.').pop()?.toLowerCase() || 
           video.file_path?.split('.').pop()?.toLowerCase() || 
           'mp4';
  }, [src, video]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  // Ref wrappers for video sub-hooks
  const { duration, setDuration, showResumePrompt, setShowResumePrompt, savedProgress, saveProgress } = useVideoProgress(video, isPlaying, videoRef as React.RefObject<HTMLVideoElement>);
  const { audioTracks, subtitleTracks, addSubtitleTrack, activeAudioIndex, setActiveAudioIndex, activeSubtitleIndex, setActiveSubtitleIndex, activeAudioUrl } = useVideoTracks(video, isPlaying, isMuted, videoRef, audioRef);
  const { videoWords, showVocabDrawer, setShowVocabDrawer, loadVideoWords } = useVideoVocabulary(video, cues, '');
  const { showControls, setIsHoveringControls, resetControls } = useVideoControls(isPlaying, containerRef as React.RefObject<HTMLDivElement>, !!dictState);

  const handleAttachSubtitle = async (file: File) => {
    try {
      const { newTrack } = await attachSubtitleToVideo(video, file, undefined, getCultureKey());
      addSubtitleTrack(newTrack);
      triggerToast(`Legenda "${newTrack.label}" carregada e ativada!`, 'success');
    } catch (err: unknown) {
      console.error('Erro ao anexar legenda no player:', err);
      const msg = err instanceof Error ? err.message : 'Falha ao carregar legenda.';
      triggerToast(msg, 'error');
    }
  };

  const {
    isFullscreen,
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
  } = useVideoPlaybackEngine({
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
    isPlaying,
    setIsPlaying,
    isBuffering,
    setIsBuffering,
    isMuted,
    setIsMuted,
    volume,
    setVolume,
  });

  useTimeTracker({
    itemId: video.id,
    itemTitle: title || video.title || 'Unknown Video',
    module: 'video',
    isActive: isPlaying,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchNewSubtitle = async () => {
      if (activeSubtitleIndex > 0 && subtitleTracks[activeSubtitleIndex]) {
        try {
          const track = subtitleTracks[activeSubtitleIndex];
          const { getSubtitleText } = await import('../../services/video');
          const { getCultureKey } = await import('../../store/useStore');
          const subText = (await getSubtitleText(track.drive_id, track.local_path, getCultureKey())) || '';
          
          if (isMounted) {
            if (subText) {
              const parsed = parseVtt(subText);
              setCues(parsed);
            } else {
              setCues([]);
            }
          }
        } catch (e) {
          console.error('Erro ao trocar legenda:', e);
          if (isMounted) setCues([]);
        }
      } else {
        // activeSubtitleIndex === 0 ("Sem Legenda")
        if (isMounted) setCues([]);
      }
    };
    fetchNewSubtitle();
    return () => { isMounted = false; };
  }, [activeSubtitleIndex, subtitleTracks]);

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ text: string, icon: 'rewind' | 'forward' | 'speed' | 'subtitle' | 'volume' | 'loop' } | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerFeedback = useCallback((text: string, icon: 'rewind' | 'forward' | 'speed' | 'subtitle' | 'volume' | 'loop') => {
    setActionFeedback({ text, icon });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setActionFeedback(null);
    }, 600);
  }, []);

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
    playbackRate,
    changePlaybackRate,
    subtitleOffset,
    setSubtitleOffset,
    setLoopA,
    setLoopB,
    clearLoop,
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    triggerFeedback,
  });

  const handleClose = async () => {
    if (videoRef.current) {
      await saveProgress(videoRef.current.currentTime);
    }
    onClose();
  };

  const handleWordClick = (word: string, context: string) => {
    if (videoRef.current) {
      videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    }
    const time = videoRef.current ? videoRef.current.currentTime : 0;
    let currentIndex = -1;
    let left = 0;
    let right = cues.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const cue = cues[mid];
      if (time >= cue.startTime && time <= cue.endTime) {
        currentIndex = mid;
        break;
      } else if (time < cue.startTime) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    const extendedContext = buildVideoSubtitleContext(cues, currentIndex, title, context);

    let preloadedData: DictionaryData | null = null;
    const existingWord = videoWords.find(vw => vw.word.toLowerCase() === word.toLowerCase());
    if (existingWord && typeof existingWord.note === 'string') {
      try {
        preloadedData = JSON.parse(existingWord.note.replace('<!-- AI_DICT -->', '')) as DictionaryData;
      } catch (err) {
        console.warn('Failed to parse preloaded dictionary note:', err);
      }
    }

    const video_clip = calculateVideoClip(cues, currentIndex, video.file_path || src);
    setDictState({ word, context: extendedContext, preloadedData, video_clip });
  };

  const bufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWaiting = useCallback(() => {
    if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
    bufferTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setIsBuffering(true);
      }
    }, 250);
  }, [setIsBuffering]);

  const handleCanPlay = useCallback(() => {
    if (bufferTimerRef.current) {
      clearTimeout(bufferTimerRef.current);
      bufferTimerRef.current = null;
    }
    setIsBuffering(false);
  }, [setIsBuffering]);

  useEffect(() => {
    return () => {
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full h-full bg-black flex flex-col justify-center items-center overflow-hidden font-sans group ${(!showControls && isPlaying && !dictState && !showHelpModal && !showVocabDrawer) ? 'cursor-none' : ''}`}
      onWheel={(e) => {
        // Adjust volume on scroll
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        const newVol = Math.max(0, Math.min(1, volume + delta));
        setVolumeDirectly(newVol);
        triggerFeedback(`Vol ${Math.round(newVol * 100)}%`, 'volume');
      }}
    >
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
        onDoubleClick={toggleFullscreen}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onSeeked={handleCanPlay}
        onError={() => {
          handleCanPlay();
          const err = videoRef.current?.error;
          if (err && err.code === 4) {
            setErrorMsg(window.api?.video ? 'Formato de vídeo não suportado nativamente.' : 'Este formato de vídeo não é suportado pelo navegador Web. Por favor, assista na versão Desktop.');
          }
        }}
        onPlay={() => {
          handleCanPlay();
          setIsPlaying(true);
          if (audioRef.current && activeAudioUrl) {
            const vidTime = videoRef.current?.currentTime || 0;
            if (Math.abs(audioRef.current.currentTime - vidTime) > 0.05) {
              audioRef.current.currentTime = vidTime;
            }
            audioRef.current.play().catch(e => console.warn(e));
          }
        }}
        onPlaying={() => {
          handleCanPlay();
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

      {/* Action Feedback Overlay (Seek, Vol, Speed, Loop) */}
      <div 
        className={`absolute inset-0 flex pointer-events-none z-50 transition-all duration-300 ${
          actionFeedback ? 'opacity-100' : 'opacity-0'
        } ${
          actionFeedback?.icon === 'forward' ? 'justify-end items-center pr-16 md:pr-32' :
          actionFeedback?.icon === 'rewind' ? 'justify-start items-center pl-16 md:pl-32' :
          'justify-center items-start pt-16'
        }`}
      >
        {actionFeedback && (
          <div className={`bg-black/50 backdrop-blur-sm rounded-full px-5 py-2.5 text-white flex items-center gap-3 shadow-2xl border border-white/10 ${actionFeedback ? 'animate-fade-in' : ''}`}>
            {actionFeedback.icon === 'rewind' && <Rewind size={24} className="text-brand-400" />}
            {actionFeedback.icon === 'forward' && <FastForward size={24} className="text-brand-400" />}
            {actionFeedback.icon === 'speed' && <Gauge size={24} className="text-brand-400" />}
            {actionFeedback.icon === 'volume' && <VolIcon size={24} className="text-brand-400" />}
            {actionFeedback.icon === 'subtitle' && <MessageSquare size={24} className="text-brand-400" />}
            {actionFeedback.icon === 'loop' && <Repeat size={24} className="text-brand-400" />}
            <span className="text-lg font-bold font-mono tracking-wider">{actionFeedback.text}</span>
          </div>
        )}
      </div>

      {!dictState && (
        <InteractiveSubtitles 
          cues={cues}
          videoRef={videoRef as React.RefObject<HTMLVideoElement>}
          onWordClick={handleWordClick} 
          savedWords={videoWords}
          subtitleOffset={subtitleOffset}
        />
      )}

      <VideoControlsOverlay 
        title={title}
        videoExtension={videoExtension}
        isPlaying={isPlaying}
        duration={duration}
        videoRef={videoRef as React.RefObject<HTMLVideoElement>}
        volume={volume}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        showControls={showControls}
        audioTracks={audioTracks}
        subtitleTracks={subtitleTracks}
        activeAudioIndex={activeAudioIndex}
        activeSubtitleIndex={activeSubtitleIndex}
        videoWordsCount={videoWords ? videoWords.length : 0}
        videoWords={videoWords || []}
        playbackRate={playbackRate}
        loopA={loopA}
        loopB={loopB}
        clearLoop={clearLoop}
        onClose={handleClose}
        togglePlay={togglePlay}
        toggleMute={toggleMute}
        handleVolumeChange={handleVolumeChange}
        handleSeek={handleSeek}
        toggleFullscreen={toggleFullscreen}
        setActiveAudioIndex={setActiveAudioIndex}
        setActiveSubtitleIndex={setActiveSubtitleIndex}
        onAttachSubtitle={handleAttachSubtitle}
        changePlaybackRate={changePlaybackRate}
        setShowVocabDrawer={setShowVocabDrawer}
        setShowHelpModal={setShowHelpModal}
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
          onSaveHighlight={async (color: string, note?: string) => {
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

      {showHelpModal && (
        <VideoHelpModal onClose={() => setShowHelpModal(false)} />
      )}
    </div>
  );
}
