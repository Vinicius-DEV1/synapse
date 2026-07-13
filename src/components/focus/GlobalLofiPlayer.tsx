import React, { useEffect, useRef, useState } from 'react';
import { Volume2, Play, Pause, VolumeX, SkipForward, X } from 'lucide-react';
import { useFocusContext } from '../../store/FocusContext';
import { resolveLofiUrl } from '../../services/lofi-manager';

export const GlobalLofiPlayer: React.FC = () => {
  const { activeLofi, setActiveLofi, isPlayingLofi, setIsPlayingLofi, lofiVolume, setLofiVolume } = useFocusContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (activeLofi) {
      resolveLofiUrl(activeLofi)
        .then(url => {
          setSrc(url);
        })
        .catch(err => {
          console.error("Falha ao resolver URL do lofi", err);
          setSrc(null);
        });
    } else {
      setSrc(null);
    }
  }, [activeLofi]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = lofiVolume;
    }
  }, [lofiVolume, src]);

  useEffect(() => {
    if (audioRef.current && src) {
      if (isPlayingLofi) {
        audioRef.current.play().catch(e => console.warn("Lofi play interrupted", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlayingLofi, src]);

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!activeLofi) return null;

  return (
    <>
      {src && (
        <audio 
          ref={audioRef} 
          src={src} 
          loop 
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={() => { /* loop nativo já trata */ }}
        />
      )}
      
      <div 
        className="fixed bottom-4 left-4 z-50 flex items-end gap-2 group"
      >
        <div 
          className={`bg-dark-card border border-white/10 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] origin-bottom-left ${
            isExpanded ? 'opacity-100 scale-100 mb-2' : 'opacity-0 scale-90 pointer-events-none absolute bottom-0 left-0'
          }`}
        >
          <div className="p-3 w-64 bg-gradient-to-b from-dark-bg/50 to-transparent">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                {isPlayingLofi ? (
                  <div className="flex gap-0.5 items-end h-4">
                    <div className="w-1 bg-brand-400 rounded-full animate-[bounce_1s_infinite] h-full" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 bg-brand-400 rounded-full animate-[bounce_1s_infinite] h-2/3" style={{ animationDelay: '200ms' }} />
                    <div className="w-1 bg-brand-400 rounded-full animate-[bounce_1s_infinite] h-4/5" style={{ animationDelay: '400ms' }} />
                  </div>
                ) : (
                  <VolumeX size={18} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-bold truncate leading-tight">{activeLofi.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-brand-400 text-[10px] uppercase tracking-widest">Lofi Station</p>
                  <span className="text-[10px] text-dark-subtext border-l border-white/10 pl-2">
                    {formatDuration(currentTime)} / {formatDuration(activeLofi.duration)}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveLofi(null);
                  setIsPlayingLofi(false);
                  setIsExpanded(false);
                }}
                className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-dark-subtext hover:text-white transition-colors shrink-0 self-start"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <button 
                onClick={() => setIsPlayingLofi(!isPlayingLofi)}
                className="w-8 h-8 rounded-full bg-white text-dark-bg flex items-center justify-center hover:scale-110 transition-transform shadow-lg shrink-0"
              >
                {isPlayingLofi ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
              </button>
              
              <div className="flex-1 flex items-center gap-2">
                <Volume2 size={12} className="text-dark-subtext shrink-0" />
                <input 
                  type="range" 
                  min="0" max="1" step="0.01"
                  value={lofiVolume}
                  onChange={(e) => setLofiVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-dark-bg rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500 hover:[&::-webkit-slider-thumb]:bg-brand-400"
                />
                <span className="text-[10px] text-dark-subtext font-mono w-7 text-right shrink-0">
                  {Math.round(lofiVolume * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-12 h-12 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 backdrop-blur-md border z-50 ${
            isExpanded 
              ? 'bg-brand-500 border-brand-400 text-white scale-90' 
              : 'bg-dark-card/80 border-white/10 text-dark-subtext hover:bg-white/10 hover:text-white hover:scale-105'
          }`}
        >
          {isPlayingLofi && !isExpanded ? (
            <div className="flex gap-0.5 items-center justify-center">
              <div className="w-1 bg-brand-400 rounded-full animate-[bounce_1s_infinite] h-3" style={{ animationDelay: '0ms' }} />
              <div className="w-1 bg-brand-400 rounded-full animate-[bounce_1s_infinite] h-5" style={{ animationDelay: '200ms' }} />
              <div className="w-1 bg-brand-400 rounded-full animate-[bounce_1s_infinite] h-4" style={{ animationDelay: '400ms' }} />
            </div>
          ) : (
            <Volume2 size={20} className={isPlayingLofi && isExpanded ? 'text-white' : ''} />
          )}
        </button>
      </div>
    </>
  );
};
