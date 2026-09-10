import { useRef, useCallback } from 'react';

export function useAudioStreamPlayer() {
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const nextAudioTimeRef = useRef<number>(0);
  const isPlayingRef = useRef(false);

  const playAudioData = useCallback(async (base64Str: string) => {
    const binaryStr = window.atob(base64Str);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
      nextAudioTimeRef.current = playbackContextRef.current.currentTime;
    }

    const ctx = playbackContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    if (nextAudioTimeRef.current < ctx.currentTime) {
      nextAudioTimeRef.current = ctx.currentTime;
    }

    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    if (!playbackAnalyserRef.current) {
      playbackAnalyserRef.current = ctx.createAnalyser();
      playbackAnalyserRef.current.fftSize = 256;
      playbackAnalyserRef.current.connect(ctx.destination);
    }

    isPlayingRef.current = true;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(playbackAnalyserRef.current);
    source.start(nextAudioTimeRef.current);
    nextAudioTimeRef.current += buffer.duration;

    source.onended = () => {
      if (playbackContextRef.current && nextAudioTimeRef.current <= playbackContextRef.current.currentTime + 0.08) {
        isPlayingRef.current = false;
      }
    };
  }, []);

  const initPlayback = useCallback(() => {
    if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    if (playbackContextRef.current.state === 'suspended') {
      playbackContextRef.current.resume().catch(() => {});
    }
    nextAudioTimeRef.current = playbackContextRef.current.currentTime;
  }, []);

  const closePlayback = useCallback(() => {
    if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
      try {
        playbackContextRef.current.close();
      } catch (e: unknown) {
        console.debug('[useAudioStreamPlayer] Error closing AudioContext:', e);
      }
    }
    playbackContextRef.current = null;
    playbackAnalyserRef.current = null;
    isPlayingRef.current = false;
    nextAudioTimeRef.current = 0;
  }, []);

  return {
    playbackContextRef,
    playbackAnalyserRef,
    nextAudioTimeRef,
    isPlayingRef,
    playAudioData,
    initPlayback,
    closePlayback,
  };
}
