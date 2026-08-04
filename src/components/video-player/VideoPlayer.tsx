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
import { VideoControlsOverlay } from './ui/VideoControlsOverlay';
import { VideoVocabularySidebar } from './ui/VideoVocabularySidebar';
import { useTimeTracker } from '../../hooks/useTimeTracker';

interface VideoPlayerProps {
  src: string;
  video: VideoItem;
  subtitleContent?: string;
  title: string;
  onClose: () => void;
  onDurationLoaded?: (duration: number) => void;
}

export default function VideoPlayer({ src, video, subtitleContent, title, onClose, onDurationLoaded }: VideoPlayerProps) {
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
    isActive: isPlaying
  });

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  const { progress, setProgress, duration, setDuration, showResumePrompt, setShowResumePrompt, savedProgress, saveProgress } = useVideoProgress(video, isPlaying, videoRef);
  const { audioTracks, subtitleTracks, activeAudioIndex, setActiveAudioIndex, activeSubtitleIndex, setActiveSubtitleIndex, activeAudioUrl } = useVideoTracks(video, isPlaying, isMuted, videoRef, audioRef);
  const { videoWords, showVocabDrawer, setShowVocabDrawer, activeSavedWords, loadVideoWords } = useVideoVocabulary(video, cues, activeCueText);
  const { showControls, setShowControls, setIsHoveringControls, resetControls } = useVideoControls(isPlaying, containerRef, !!dictState);

  useEffect(() => {
    if (subtitleContent && activeSubtitleIndex === 0) {
      setCues(parseVtt(subtitleContent));
    }
  }, [subtitleContent, activeSubtitleIndex]);

  useEffect(() => {
    const fetchNewSubtitle = async () => {
      if (activeSubtitleIndex > 0 && subtitleTracks[activeSubtitleIndex]) {
        try {
          const track = subtitleTracks[activeSubtitleIndex];
          const { getSubtitleText } = await import('../../services/video-manager');
          const { getCultureKey } = await import('../../store/useStore');
          let subText = '';
          if (track.local_path) subText = await getSubtitleText(undefined, track.local_path, getCultureKey());
          if (!subText && track.drive_id) subText = await getSubtitleText(track.drive_id, undefined, getCultureKey());
          
          if (subText) setCues(parseVtt(subText));
          else setCues([]);
        } catch(e) { console.error("Error changing subtitle", e); }
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (dictState) return;
      const target = e.target as HTMLElement;
      if (
        (target instanceof HTMLInputElement && target.type !== 'range' && target.type !== 'button') ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'Escape' || e.key === 'Escape') {
        if (isFullscreen) toggleFullscreen();
      } else if (e.code === 'KeyF' || e.key === 'f') {
        toggleFullscreen();
      } else if (e.code === 'KeyA' || e.key === 'a') {
        setActiveAudioIndex(prev => prev >= audioTracks.length - 1 ? -1 : prev + 1);
      } else if (e.code === 'KeyS' || e.key === 's') {
        if (subtitleTracks.length > 1) {
          setActiveSubtitleIndex(prev => prev >= subtitleTracks.length - 1 ? 0 : prev + 1);
        }
      } else if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J' || e.key === '<') {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
        seekBy(-5);
      } else if (e.code === 'ArrowRight' || e.key === 'ArrowRight' || e.key === 'l' || e.key === 'L' || e.key === '>') {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
        seekBy(5);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dictState, isFullscreen, audioTracks]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setProgress(time);
      if (cues.length > 0) {
        const activeCue = cues.find(c => time >= c.startTime && time <= c.endTime);
        setActiveCueText(activeCue ? activeCue.text : '');
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      let vidDur = videoRef.current.duration;
      // Para streams transcodificados, o duration retornado será o do chunk atual ou Infinity
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

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error("Error fullscreen:", err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const h = Math.floor(timeInSeconds / 3600);
    const m = Math.floor((timeInSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const handleWordClick = (word: string, context: string) => {
    if (videoRef.current) {
      videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    }
    const time = videoRef.current ? videoRef.current.currentTime : 0;
    const currentIndex = cues.findIndex(c => time >= c.startTime && time <= c.endTime);
    let extendedContext = context;
    if (currentIndex !== -1) {
      const contextLines = [];
      let totalChars = 0;

      // Pegar a própria frase atual
      const currentCue = cues[currentIndex];
      const currentLine = `[${(currentCue.startTime * 1000).toFixed(0)}ms - ${(currentCue.endTime * 1000).toFixed(0)}ms]: \n${currentCue.text.trim()}`;
      totalChars += currentLine.length;

      // Construir contexto para trás (até ~1600 caracteres)
      const backwardLines = [];
      let backChars = 0;
      let backIdx = currentIndex - 1;
      while (backIdx >= 0 && backChars < 1600) {
        const c = cues[backIdx];
        const line = `[${(c.startTime * 1000).toFixed(0)}ms - ${(c.endTime * 1000).toFixed(0)}ms]: \n${c.text.trim()}`;
        backwardLines.unshift(line);
        backChars += line.length;
        backIdx--;
      }

      // Construir contexto para frente (até ~1600 caracteres)
      const forwardLines = [];
      let fwdChars = 0;
      let fwdIdx = currentIndex + 1;
      while (fwdIdx < cues.length && fwdChars < 1600) {
        const c = cues[fwdIdx];
        const line = `[${(c.startTime * 1000).toFixed(0)}ms - ${(c.endTime * 1000).toFixed(0)}ms]: \n${c.text.trim()}`;
        forwardLines.push(line);
        fwdChars += line.length;
        fwdIdx++;
      }

      contextLines.push(...backwardLines, currentLine, ...forwardLines);
      
      extendedContext = `Metadados do Vídeo:\nTítulo: "${title}"\n\nContexto das Legendas (Tempo Mínimo e Máximo em ms):\n${contextLines.join('\n')}`;
    }

    let preloadedData = null;
    const existingWord = activeSavedWords.find(vw => vw.word.toLowerCase() === word.toLowerCase());
    if (existingWord && existingWord.note) {
      try { preloadedData = JSON.parse(existingWord.note.replace('<!-- AI_DICT -->', '')); } catch(e) {}
    }

    let video_clip = undefined;
    if (currentIndex !== -1) {
      const cue = cues[currentIndex];
      const startMs = Math.max(0, (cue.startTime - 0.5) * 1000);
      const endMs = (cue.endTime + 0.5) * 1000;
      video_clip = { path: video.local_path || src, startMs, endMs };
    }
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
        onError={() => {
          setIsBuffering(false);
          const err = videoRef.current?.error;
          if (err && err.code === 4) {
             setErrorMsg(window.api?.video ? "Formato de vídeo não suportado nativamente." : "Este formato de vídeo não é suportado pelo navegador Web. Por favor, assista na versão Desktop.");
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

      {showResumePrompt && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-5 shadow-2xl animate-in zoom-in-95 duration-200 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center gap-2 text-center text-white">
              <span className="text-4xl mb-1">⏱️</span>
              <h3 className="text-xl font-bold">Continuar assistindo?</h3>
              <p className="text-sm text-white/70">
                Você parou em <span className="text-brand-400 font-bold">{formatTime(savedProgress)}</span>
              </p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button 
                onClick={() => {
                  setShowResumePrompt(false);
                  if (videoRef.current) videoRef.current.play().catch(() => {});
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Recomeçar
              </button>
              <button 
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = savedProgress;
                    videoRef.current.play().catch(() => {});
                  }
                  setShowResumePrompt(false);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-brand-500 text-white hover:bg-brand-400 transition-colors shadow-lg shadow-brand-500/25"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

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
        formatTime={formatTime}
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
                note
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
