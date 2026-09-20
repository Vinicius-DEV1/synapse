import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, Volume2, VolumeX, Rewind, FastForward } from 'lucide-react';
import { Portal } from '../ui/Portal';
import type { FileItem } from '../../types';
import { useStore } from '../../store/useStore';
import { getDecryptedFileUrl } from '../../utils/file-fetcher';

interface AudioPlayerModalProps {
  item: FileItem;
  onClose: () => void;
}

export default function AudioPlayerModal({ item, onClose }: AudioPlayerModalProps) {
  const { state } = useStore();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const filesMasterKey = state.moduleKeys['files'];

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    
    getDecryptedFileUrl(item, filesMasterKey)
      .then((resolvedUrl) => {
        if (isCancelled) {
          if (resolvedUrl && typeof resolvedUrl === 'string' && resolvedUrl.startsWith('blob:')) {
            URL.revokeObjectURL(resolvedUrl);
          }
          return;
        }
        if (resolvedUrl && typeof resolvedUrl === 'string') {
          if (objectUrlRef.current && objectUrlRef.current.startsWith('blob:')) {
            URL.revokeObjectURL(objectUrlRef.current);
          }
          objectUrlRef.current = resolvedUrl;
          setObjectUrl(resolvedUrl);
        } else {
          setError('Arquivo de áudio não encontrado localmente.');
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Falha ao carregar o áudio.';
        if (!isCancelled) setError(message);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
      if (objectUrlRef.current && objectUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [item, filesMasterKey]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const setAudioData = () => {
      setDuration(audio.duration);
    };
    
    const setAudioTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [objectUrl]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300" onMouseDown={onClose}>
        <div className="bg-[#1C1C1F]/90 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col p-6 items-center animate-scale-in" onMouseDown={e => e.stopPropagation()}>
          
          <div className="w-full flex justify-between items-start mb-6">
            <div className="flex flex-col min-w-0 pr-4">
              <h3 className="text-white font-semibold text-lg truncate" title={item.name}>{item.name}</h3>
              <p className="text-white/40 text-xs">{(item.file_size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {isLoading ? (
            <div className="py-8 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-white/40 text-xs">Carregando áudio...</span>
            </div>
          ) : error ? (
            <div className="py-8 text-red-400 text-sm text-center">
              {error}
            </div>
          ) : (
            <div className="w-full flex flex-col gap-6">
              {objectUrl && <audio ref={audioRef} src={objectUrl} className="hidden" preload="metadata" autoPlay onPlay={() => setIsPlaying(true)} />}
              
              {/* Progress Slider */}
              <div className="w-full flex flex-col gap-2">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleTimeSeek}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                  style={{
                    background: `linear-gradient(to right, #f87171 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) ${(currentTime / (duration || 1)) * 100}%)`
                  }}
                />
                <div className="flex justify-between w-full text-[10px] text-white/40 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6">
                <button onClick={skipBackward} className="text-white/40 hover:text-white transition-colors" title="Voltar 10s">
                  <Rewind size={20} />
                </button>
                <button 
                  onClick={togglePlayPause} 
                  className="w-14 h-14 bg-brand-500 hover:bg-brand-400 text-white rounded-full flex items-center justify-center transition-all shadow-[0_0_15px_rgba(248,113,113,0.3)] hover:scale-105"
                >
                  {isPlaying ? <Pause size={24} className="fill-white" /> : <Play size={24} className="fill-white ml-1" />}
                </button>
                <button onClick={skipForward} className="text-white/40 hover:text-white transition-colors" title="Avançar 10s">
                  <FastForward size={20} />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center justify-between gap-3 px-4 pt-2 border-t border-white/5">
                <button onClick={toggleMute} className="text-white/30 hover:text-white/70 transition-colors">
                  {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    if (audioRef.current) audioRef.current.volume = v;
                    if (v > 0 && isMuted) setIsMuted(false);
                  }}
                  className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white/70 [&::-webkit-slider-thumb]:rounded-full"
                  style={{
                    background: `linear-gradient(to right, rgba(255,255,255,0.7) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.1) ${(isMuted ? 0 : volume) * 100}%)`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
