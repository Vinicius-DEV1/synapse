import { useRef, useCallback, useState } from 'react';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const play = useCallback((url: string) => {
    stop();
    const audio = new Audio(url);
    audioRef.current = audio;
    
    audio.addEventListener('ended', () => setIsPlaying(false));
    audio.addEventListener('error', () => setIsPlaying(false));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audio.addEventListener('play', () => setIsPlaying(true));

    audio.play().catch(e => {
      console.error("Audio error:", e);
      setIsPlaying(false);
    });
  }, [stop]);

  return { play, stop, isPlaying };
}
