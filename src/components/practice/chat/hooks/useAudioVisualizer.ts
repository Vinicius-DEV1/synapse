import { useEffect, useRef, useState } from 'react';

interface UseAudioVisualizerProps {
  isInCall: boolean;
  isPlayingRef: React.MutableRefObject<boolean>;
  isRecordingRef: React.MutableRefObject<boolean>;
  playbackAnalyserRef: React.MutableRefObject<AnalyserNode | null>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  playbackContextRef: React.MutableRefObject<AudioContext | null>;
  nextAudioTimeRef: React.MutableRefObject<number>;
}

export function useAudioVisualizer({
  isInCall,
  isPlayingRef,
  isRecordingRef,
  playbackAnalyserRef,
  analyserRef,
  playbackContextRef,
  nextAudioTimeRef
}: UseAudioVisualizerProps) {
  const visualizerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const requestRef = useRef<number | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const updateVisualizer = () => {
      if (!isInCall) return;
      
      let dataArray: Uint8Array | null = null;
      let active = false;
      
      if (isPlayingRef.current && playbackAnalyserRef.current) {
        dataArray = new Uint8Array(playbackAnalyserRef.current.frequencyBinCount);
        playbackAnalyserRef.current.getByteFrequencyData(dataArray);
        active = true;
      } else if (isRecordingRef.current && analyserRef.current) {
        dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        active = true;
      }
      
      for (let i = 0; i < 6; i++) {
        const el = visualizerRefs.current[i];
        if (el) {
          if (active && dataArray) {
            const binValue = dataArray[4 + i * 8] / 255.0 || 0;
            const targetHeight = 12 + (binValue * 48); // max 60px
            el.style.height = `${targetHeight}px`;
          } else {
            const t = Date.now() / 1000;
            const targetHeight = 12 + Math.sin(t * 2 + i) * 4;
            el.style.height = `${targetHeight}px`;
          }
        }
      }
      
      if (playbackContextRef.current && nextAudioTimeRef.current > playbackContextRef.current.currentTime) {
        if (!isPlayingRef.current) {
          isPlayingRef.current = true;
          setIsPlaying(true);
        }
      } else {
        if (isPlayingRef.current) {
          isPlayingRef.current = false;
          setIsPlaying(false);
        }
      }
      
      requestRef.current = requestAnimationFrame(updateVisualizer);
    };
    
    if (isInCall) {
      requestRef.current = requestAnimationFrame(updateVisualizer);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isInCall, isPlayingRef, isRecordingRef, playbackAnalyserRef, analyserRef, playbackContextRef, nextAudioTimeRef]);

  return {
    visualizerRefs,
    isPlaying,
    setIsPlaying
  };
}
