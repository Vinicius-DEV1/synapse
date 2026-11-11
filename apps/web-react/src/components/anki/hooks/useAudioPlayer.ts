import { useRef, useCallback, useState, useEffect } from 'react';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cleanupListenersRef = useRef<(() => void) | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const stop = useCallback(() => {
    if (cleanupListenersRef.current) {
      cleanupListenersRef.current();
      cleanupListenersRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const play = useCallback(
    (url: string) => {
      stop();
      const audio = new Audio(url);
      audioRef.current = audio;

      const handleEnded = () => setIsPlaying(false);
      const handleError = () => setIsPlaying(false);
      const handlePause = () => setIsPlaying(false);
      const handlePlay = () => setIsPlaying(true);

      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('play', handlePlay);

      cleanupListenersRef.current = () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('play', handlePlay);
      };

      audio.play().catch((e) => {
        console.error('Audio error:', e);
        setIsPlaying(false);
      });
    },
    [stop]
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { play, stop, isPlaying };
}
