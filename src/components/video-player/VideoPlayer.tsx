import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Maximize, Minimize, Volume2, VolumeX, ArrowLeft, Languages, MessageSquare } from 'lucide-react';
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
  const [dictState, setDictState] = useState<{ word: string; context: string } | null>(null);

  // Errors
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Resume Progress
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedProgress] = useState(video.progress || 0);

  useEffect(() => {
    if (savedProgress > 5) {
      setShowResumePrompt(true);
    }
  }, [savedProgress]);

  useEffect(() => {
    if (showResumePrompt) {
      const timer = setTimeout(() => setShowResumePrompt(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [showResumePrompt]);

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

    setDictState({ word, context: extendedContext });
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

      {/* Interactive Subtitles Overlay */}
      {!dictState && (
        <InteractiveSubtitles 
          currentSubtitle={activeCueText} 
          onWordClick={handleWordClick} 
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
          
          {/* Audio Selector */}
          {audioTracks.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveAudioIndex(prev => prev >= audioTracks.length - 1 ? -1 : prev + 1);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-black/60 rounded-lg text-white backdrop-blur-md transition-colors border border-white/10"
                title="Trocar Idioma (A)"
              >
                <Languages size={16} className="text-brand-400" />
                <span className="text-sm font-medium">
                  {activeAudioIndex === -1 ? 'Áudio Nativo (0 Lag)' : audioTracks[activeAudioIndex].label}
                </span>
              </button>
            </div>
          )}
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
          onClose={() => setDictState(null)}
          onSaveHighlight={(color, note) => {
            console.log("Saved word from video:", dictState.word, color, note);
            // Here you can dispatch to save in a Global Vocabulary notebook
          }}
        />
      )}
    </div>
  );
}
