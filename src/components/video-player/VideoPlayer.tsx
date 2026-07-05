import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Maximize, Minimize, Volume2, VolumeX, ArrowLeft, Languages, MessageSquare, BookOpen, Trash2, X, Sparkles } from 'lucide-react';
import InteractiveSubtitles from './InteractiveSubtitles';
import { parseVtt } from '../../utils/vtt-parser';
import type { SubtitleCue } from '../../utils/vtt-parser';
import DictionaryModal from '../library/DictionaryModal';
import type { VideoItem, TrackItem } from '../../types_video';

interface VideoPlayerProps {
  src: string;
  video: VideoItem;
  subtitleContent?: string; // VTT text content
  title: string;
  onClose: () => void;
  onDurationLoaded?: (duration: number) => void;
}

export default function VideoPlayer({ src, video, subtitleContent, title, onClose, onDurationLoaded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const syncLoopRef = useRef<number>();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  // Tracks
  const [audioTracks, setAudioTracks] = useState<TrackItem[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<TrackItem[]>([]);
  const [activeAudioIndex, setActiveAudioIndex] = useState<number>(-1); // -1 = Native Video Audio (Track 1)
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);

  // Subtitles
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [activeCueText, setActiveCueText] = useState('');
  
  // Dictionary
  const [dictState, setDictState] = useState<{ 
    word: string; 
    context: string; 
    preloadedData?: any;
    video_clip?: { path: string; startMs: number; endMs: number };
  } | null>(null);

  // Vocabulary
  const [videoWords, setVideoWords] = useState<any[]>([]);
  const [showVocabDrawer, setShowVocabDrawer] = useState(false);

  const loadVideoWords = async () => {
    if (window.api?.sync) {
      try {
        const words = await window.api.sync.getTable('video_words');
        const currentVideoWords = words.filter((w: any) => w.video_id === video.id && !w.deleted_at);
        setVideoWords(currentVideoWords);
      } catch(e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    loadVideoWords();
  }, [video.id]);

  const activeSavedWords = videoWords.filter(vw => {
    // Check if the saved word's timestamp falls within the currently active cue (or any active cue in 'cues')
    const activeCue = cues.find(c => vw.timestamp >= c.startTime && vw.timestamp <= c.endTime);
    return activeCue && activeCue.text === activeCueText;
  });

  // Errors
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Resume Progress
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedProgress] = useState(video.progress || 0);

  useEffect(() => {
    if (savedProgress > 5) {
      setShowResumePrompt(true);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  }, [savedProgress]);

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
  }, [isPlaying, video]);

  // Initialize tracks from JSON
  useEffect(() => {
    try {
      if (video.audio_tracks_json) {
        setAudioTracks(JSON.parse(video.audio_tracks_json));
      }
      if (video.subtitles_json) {
        setSubtitleTracks(JSON.parse(video.subtitles_json));
      }
    } catch (e) {
      console.error("Failed to parse tracks", e);
    }
  }, [video]);

  // Handle active audio URL resolving
  useEffect(() => {
    if (activeAudioIndex === -1) {
      setActiveAudioUrl(null);
      if (videoRef.current) videoRef.current.muted = isMuted; // Restore native audio
      return;
    }
    
    const track = audioTracks[activeAudioIndex];
    if (track) {
      if (videoRef.current) videoRef.current.muted = true; // Mute native video audio
      
      const resolveUrl = async () => {
        if (track.local_path && window.api?.video) {
          const streamUrl = `file:///${track.local_path.replace(/\\/g, '/')}`;
          setActiveAudioUrl(streamUrl);
        } else if (track.drive_id) {
          // Cloud stream URL
          const { getVideoStreamLink } = await import('../../services/video-manager');
          try {
            const url = await getVideoStreamLink(track.drive_id);
            setActiveAudioUrl(url);
          } catch(e) { console.error(e); }
        }
      };
      resolveUrl();
    }
  }, [activeAudioIndex, audioTracks, isMuted]);

  useEffect(() => {
    if (subtitleContent) {
      setCues(parseVtt(subtitleContent));
    }
  }, [subtitleContent]);

  // --- Audio Sync Anti-Lag Logic ---
  useEffect(() => {
    const syncAudio = () => {
      if (videoRef.current && audioRef.current && activeAudioUrl && isPlaying) {
        const vTime = videoRef.current.currentTime;
        const aTime = audioRef.current.currentTime;
        const diff = Math.abs(vTime - aTime);
        
        // If difference is greater than 100ms, snap it back
        if (diff > 0.1) {
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
  }, [isPlaying, activeAudioUrl]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetControlsTimeout = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isPlaying && !dictState) {
          setShowControls(false);
        }
      }, 2500);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', resetControlsTimeout);
      container.addEventListener('mouseleave', () => { if (isPlaying && !dictState) setShowControls(false); });
    }
    
    resetControlsTimeout();
    return () => {
      clearTimeout(timeout);
      if (container) {
        container.removeEventListener('mousemove', resetControlsTimeout);
      }
    };
  }, [isPlaying, dictState]);

  // Spacebar & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (dictState) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'Escape') {
        if (isFullscreen) toggleFullscreen();
      } else if (e.code === 'KeyF' || e.key === 'f') {
        toggleFullscreen();
      } else if (e.code === 'KeyA' || e.key === 'a') {
        // Cycle audio track
        setActiveAudioIndex(prev => {
          if (prev >= audioTracks.length - 1) return -1; // back to native
          return prev + 1;
        });
      } else if (e.code === 'ArrowLeft') {
        seekBy(-5);
      } else if (e.code === 'ArrowRight') {
        seekBy(5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dictState, isFullscreen, audioTracks]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        if (audioRef.current && activeAudioUrl) {
           audioRef.current.currentTime = videoRef.current.currentTime;
           audioRef.current.play();
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
      const newTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = newTime;
      if (audioRef.current) audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setProgress(time);
      
      // Update active subtitle
      if (cues.length > 0) {
        const activeCue = cues.find(c => time >= c.startTime && time <= c.endTime);
        setActiveCueText(activeCue ? activeCue.text : '');
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (onDurationLoaded) {
        onDurationLoaded(videoRef.current.duration);
      }
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
      // If we are using an extra audio track, mute that one instead of native
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
        console.error("Error attempting to enable fullscreen:", err);
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
    if (h > 0) {
      return `${h}:${m}:${s}`;
    }
    return `${m}:${s}`;
  };

  const handleWordClick = (word: string, context: string) => {
    if (videoRef.current) {
      videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    }
    
    // Find the current cue index to build the surrounding context
    const time = videoRef.current ? videoRef.current.currentTime : 0;
    const currentIndex = cues.findIndex(c => time >= c.startTime && time <= c.endTime);
    
    let extendedContext = context;
    
    if (currentIndex !== -1) {
      // Gather previous context (up to 1600 chars)
      let prevContext = '';
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (prevContext.length + cues[i].text.length > 1600) break;
        prevContext = cues[i].text + ' ' + prevContext;
      }
      
      // Gather next context (up to 1600 chars)
      let nextContext = '';
      for (let i = currentIndex + 1; i < cues.length; i++) {
        if (nextContext.length + cues[i].text.length > 1600) break;
        nextContext = nextContext + ' ' + cues[i].text;
      }
      
      const fullContext = [];
      if (prevContext.trim()) fullContext.push(`[Contexto Anterior]: ${prevContext.trim()}`);
      fullContext.push(`[Cena Atual]: ${context}`);
      if (nextContext.trim()) fullContext.push(`[Contexto Posterior]: ${nextContext.trim()}`);
      
      extendedContext = fullContext.join('\n\n');
    }

    let preloadedData = null;
    const existingWord = activeSavedWords.find(vw => vw.word.toLowerCase() === word.toLowerCase());
    if (existingWord && existingWord.note) {
      try {
        preloadedData = JSON.parse(existingWord.note.replace('<!-- AI_DICT -->', ''));
      } catch(e) {}
    }

    let video_clip = undefined;
    if (currentIndex !== -1) {
      const cue = cues[currentIndex];
      const startMs = Math.max(0, (cue.startTime - 1) * 1000);
      const endMs = (cue.endTime + 1) * 1000;
      video_clip = { path: video.local_path || src, startMs, endMs };
    }

    setDictState({ word, context: extendedContext, preloadedData, video_clip });
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-black flex flex-col justify-center items-center overflow-hidden font-sans group"
    >
      {errorMsg && (
        <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center text-white p-6 text-center">
          <div className="bg-red-500/20 text-red-300 p-4 rounded-lg max-w-lg border border-red-500/30">
            <h3 className="font-bold text-lg mb-2">Erro de Reprodução</h3>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        autoPlay
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={() => {
          const err = videoRef.current?.error;
          if (err && err.code === 4) {
             if (!window.api?.video) {
               setErrorMsg("Este formato de vídeo não é suportado pelo navegador Web. Por favor, assista na versão Desktop.");
             } else {
               setErrorMsg("Formato de vídeo não suportado nativamente.");
             }
          }
        }}
        onPlay={() => {
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
      
      {/* Secondary Audio Element */}
      {activeAudioUrl && (
        <audio 
          ref={audioRef}
          src={activeAudioUrl}
          preload="auto"
          onWaiting={() => { if (videoRef.current) videoRef.current.pause(); }}
          onPlaying={() => { if (videoRef.current && isPlaying) videoRef.current.play(); }}
        />
      )}

      {/* Resume Prompt Overlay */}
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
                  if (videoRef.current) videoRef.current.play();
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Recomeçar
              </button>
              <button 
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = savedProgress;
                    videoRef.current.play();
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

      {/* Interactive Subtitles Overlay */}
      {!dictState && (
        <InteractiveSubtitles 
          currentSubtitle={activeCueText} 
          onWordClick={handleWordClick} 
          savedWords={activeSavedWords}
        />
      )}

      {/* Custom Controls Overlay */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-white font-medium text-lg drop-shadow-md">{title}</h2>
          </div>
          
          {/* Top Right Controls */}
          <div className="flex items-center gap-3">
            {/* Audio Selector */}
            {audioTracks.length > 0 && (
              <button
                onClick={() => setActiveAudioIndex(prev => prev >= audioTracks.length - 1 ? -1 : prev + 1)}
                className="flex items-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-black/60 rounded-lg text-white backdrop-blur-md transition-colors border border-white/10"
                title="Trocar Idioma (A)"
              >
                <Languages size={16} className="text-brand-400" />
                <span className="text-sm font-medium">
                  {activeAudioIndex === -1 ? 'Áudio Nativo (0 Lag)' : audioTracks[activeAudioIndex].label}
                </span>
              </button>
            )}

            {/* Vocabulary Drawer Toggle */}
            <button
              onClick={() => {
                setShowVocabDrawer(true);
                if (videoRef.current) videoRef.current.pause();
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-brand-500/20 rounded-lg text-white backdrop-blur-md transition-colors border border-white/10"
              title="Palavras Salvas"
            >
              <BookOpen size={16} className={videoWords.length > 0 ? "text-yellow-400" : "text-white/70"} />
              <span className="text-sm font-medium">
                {videoWords.length}
              </span>
            </button>
          </div>
        </div>

        {/* Play/Pause Center Button */}
        {showControls && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button 
              onClick={togglePlay}
              className="bg-black/50 p-6 rounded-full text-white pointer-events-auto hover:bg-brand-500/80 hover:scale-110 transition-all duration-300"
            >
              {isPlaying ? <Pause size={48} /> : <Play size={48} className="ml-2" />}
            </button>
          </div>
        )}

        {/* Bottom Bar Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-auto">
          <div className="flex items-center w-full gap-4">
            {/* Play/Pause Button */}
            <button 
              onClick={togglePlay}
              className="text-white hover:text-brand-400 transition-colors"
            >
              {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-brand-400 transition-colors">
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer accent-brand-500 transition-all duration-300"
              />
            </div>

            {/* Current Time */}
            <span className="text-white/80 text-xs font-medium tabular-nums ml-2">
              {formatTime(progress)}
            </span>

            {/* Progress Bar */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={progress}
              onChange={handleSeek}
              className="flex-1 h-1.5 mx-2 bg-white/30 rounded-full appearance-none cursor-pointer accent-brand-500 hover:h-2 transition-all"
            />

            {/* Duration Time */}
            <span className="text-white/80 text-xs font-medium tabular-nums mr-2">
              {formatTime(duration)}
            </span>

            {/* Fullscreen Button */}
            <button onClick={toggleFullscreen} className="text-white hover:text-brand-400 transition-colors">
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Dictionary Modal */}
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

      {/* Vocabulary Drawer */}
      {showVocabDrawer && (
        <div className="absolute inset-y-0 right-0 w-96 max-w-full bg-dark-card border-l border-white/10 shadow-2xl z-50 flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <BookOpen size={20} className="text-brand-400" />
              <h2 className="text-lg font-bold text-white">Vocabulário Salvo</h2>
            </div>
            <button 
              onClick={() => {
                setShowVocabDrawer(false);
                if (videoRef.current) videoRef.current.play();
              }}
              className="p-2 hover:bg-white/10 rounded-full text-white/70 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {videoWords.length === 0 ? (
              <div className="text-center text-white/50 py-10">
                <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
                <p>Você ainda não salvou nenhuma palavra neste vídeo.</p>
                <p className="text-sm mt-2">Clique nas legendas para salvar!</p>
              </div>
            ) : (
              videoWords.sort((a, b) => a.timestamp - b.timestamp).map(vw => (
                <div key={vw.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: vw.color === 'yellow' ? '#facc15' : vw.color === 'green' ? '#4ade80' : vw.color === 'blue' ? '#60a5fa' : vw.color === 'purple' ? '#c084fc' : vw.color === 'pink' ? '#f472b6' : vw.color === 'red' ? '#f87171' : '#facc15' }} />
                      <h4 className="text-white font-bold">{vw.word}</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = vw.timestamp;
                            setShowVocabDrawer(false);
                            videoRef.current.play();
                          }
                        }}
                        className="text-xs font-mono bg-black/40 px-2 py-1 rounded text-white/70 hover:text-white hover:bg-brand-500 transition-colors"
                      >
                        {new Date(vw.timestamp * 1000).toISOString().substring(14, 19)}
                      </button>
                      <button 
                        onClick={async () => {
                          if (window.api?.sync) {
                            await window.api.sync.upsertRow('video_words', { ...vw, deleted_at: new Date().toISOString() });
                            loadVideoWords();
                          }
                        }}
                        className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 transition-all p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {vw.context && (
                    <p className="text-sm text-white/60 italic border-l-2 border-white/20 pl-3 py-1 mt-2 line-clamp-3">
                      "{vw.context.match(/\[Cena Atual\]:\s*([^\n]+)/)?.[1] || vw.context}"
                    </p>
                  )}
                  {vw.note && vw.note.startsWith('<!-- AI_DICT -->') ? (
                    (() => {
                      try {
                        const data = JSON.parse(vw.note.replace('<!-- AI_DICT -->', ''));
                        let defs: string[] = [];
                        if (data.english?.definitions) defs = data.english.definitions;
                        else if (data.english?.definition) defs = [data.english.definition];
                        else if (data.definitions) defs = data.definitions;
                        else if (data.definition) defs = [data.definition];
                        
                        const textToShow = defs.length > 0 ? defs[0] : (data.portuguese?.definition || data.portuguese?.definitions?.[0] || 'Dicionário IA');
                        
                        return (
                          <button 
                            onClick={() => {
                              if (videoRef.current) videoRef.current.pause();
                              setDictState({ word: vw.word, context: vw.context, preloadedData: data });
                              setShowVocabDrawer(false);
                            }}
                            className="mt-2 text-xs font-medium text-brand-600 dark:text-brand-400 p-2 bg-white/50 dark:bg-black/20 rounded text-left hover:bg-black/40 transition-colors w-full group/btn cursor-pointer flex flex-col gap-1 border border-transparent hover:border-brand-500/30"
                          >
                            <div className="flex items-center justify-between opacity-70">
                              <div className="flex items-center gap-1">
                                <Sparkles size={10} /> <span className="font-bold text-[9px] uppercase tracking-wider">IA Salva</span>
                              </div>
                              <span className="text-[9px] opacity-0 group-hover/btn:opacity-100 transition-opacity">Ver Mais →</span>
                            </div>
                            <div className="line-clamp-2 opacity-90">{textToShow}</div>
                          </button>
                        );
                      } catch (e) {
                        return <p className="text-sm text-brand-300 mt-1">{vw.note}</p>;
                      }
                    })()
                  ) : vw.note ? (
                    <p className="text-sm text-brand-300 mt-1">{vw.note}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
