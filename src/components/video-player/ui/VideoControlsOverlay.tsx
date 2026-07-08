import React from 'react';
import { Play, Pause, Maximize, Minimize, Volume2, VolumeX, ArrowLeft, Languages, BookOpen } from 'lucide-react';
import type { TrackItem } from '../../../types_video';

interface VideoControlsOverlayProps {
  title: string;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  showControls: boolean;
  audioTracks: TrackItem[];
  activeAudioIndex: number;
  videoWordsCount: number;
  onClose: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  toggleFullscreen: () => void;
  setActiveAudioIndex: React.Dispatch<React.SetStateAction<number>>;
  setShowVocabDrawer: (val: boolean) => void;
  onPauseForDrawer: () => void;
  formatTime: (t: number) => string;
  setIsHoveringControls: (hovering: boolean) => void;
}

export function VideoControlsOverlay({
  title, isPlaying, progress, duration, volume, isMuted, isFullscreen, showControls,
  audioTracks, activeAudioIndex, videoWordsCount,
  onClose, togglePlay, toggleMute, handleVolumeChange, handleSeek, toggleFullscreen,
  setActiveAudioIndex, setShowVocabDrawer, onPauseForDrawer, formatTime, setIsHoveringControls
}: VideoControlsOverlayProps) {
  return (
    <div 
      className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none transition-opacity duration-300 \${showControls ? 'opacity-100' : 'opacity-0'}`}
    >
      <div 
        className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between pointer-events-auto"
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
      >
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-white font-medium text-lg drop-shadow-md">{title}</h2>
        </div>
        
        <div className="flex items-center gap-3">
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

          <button
            onClick={() => {
              setShowVocabDrawer(true);
              onPauseForDrawer();
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-brand-500/20 rounded-lg text-white backdrop-blur-md transition-colors border border-white/10"
            title="Palavras Salvas"
          >
            <BookOpen size={16} className={videoWordsCount > 0 ? "text-yellow-400" : "text-white/70"} />
            <span className="text-sm font-medium">
              {videoWordsCount}
            </span>
          </button>
        </div>
      </div>

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

      <div 
        className="absolute bottom-0 left-0 right-0 p-6 pointer-events-auto"
        onMouseEnter={() => setIsHoveringControls(true)}
        onMouseLeave={() => setIsHoveringControls(false)}
      >
        <div className="flex items-center w-full gap-4">
          <button 
            onClick={togglePlay}
            className="text-white hover:text-brand-400 transition-colors"
          >
            {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </button>

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

          <span className="text-white/80 text-xs font-medium tabular-nums ml-2">
            {formatTime(progress)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={handleSeek}
            className="flex-1 h-1.5 mx-2 bg-white/30 rounded-full appearance-none cursor-pointer accent-brand-500 hover:h-2 transition-all"
          />

          <span className="text-white/80 text-xs font-medium tabular-nums mr-2">
            {formatTime(duration)}
          </span>

          <button onClick={toggleFullscreen} className="text-white hover:text-brand-400 transition-colors">
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
