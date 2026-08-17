import  { useState, useRef } from 'react';
import { Play, Square } from 'lucide-react';

export function AudioMessagePlayer({ src }: { src: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggle = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  if (!src) return null;

  return (
    <div className="mt-2 inline-flex items-center gap-2 bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-full cursor-pointer transition-colors" onClick={toggle}>
      {isPlaying ? <Square size={14} className="text-brand-400" /> : <Play size={14} className="text-brand-400" />}
      <span className="text-xs font-medium text-white/80">Ouvir áudio</span>
      <audio 
        ref={audioRef} 
        src={src} 
        onEnded={() => setIsPlaying(false)} 
        onPause={() => setIsPlaying(false)} 
        onPlay={() => setIsPlaying(true)} 
        className="hidden" 
      />
    </div>
  );
}
