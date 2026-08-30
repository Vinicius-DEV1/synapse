import { useState, useRef, useEffect, useCallback } from 'react';
import { encodeWAV } from '../../../../utils/audio';
import { arrayBufferToBase64 } from '../../../../utils/binary';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface UsePushToTalkProps {
  isConnected: boolean;
  isInCall: boolean;
  isMobile: boolean;
  wsRef: React.MutableRefObject<WebSocket | null>;
  saveMessage: (role: 'user' | 'model', text: string) => void;
  setLiveTranscript: (text: string) => void;
  setError: (err: string | null) => void;
}

export function usePushToTalk({
  isConnected,
  isInCall,
  isMobile,
  wsRef,
  saveMessage,
  setLiveTranscript,
  setError
}: UsePushToTalkProps) {
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [micLabel, setMicLabel] = useState<string>('');
  const micButtonRef = useRef<HTMLButtonElement>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const recognitionRef = useRef<any>(null);
  const userTranscriptRef = useRef<string>('');
  const finalTranscriptRef = useRef<string>('');
  const userAudioChunksRef = useRef<Float32Array[]>([]);

  const startAudioCapture = useCallback(async () => {
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
      } catch (err) {
        console.warn('Overconstrained audio request failed, falling back to basic audio', err);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      mediaStreamRef.current = stream;
      
      const track = stream.getAudioTracks()[0];
      if (track) setMicLabel(track.label);
      
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      
      await audioCtx.audioWorklet.addModule('/audio-worklet.js');
      const workletNode = new AudioWorkletNode(audioCtx, 'pcm-extractor');
      const source = audioCtx.createMediaStreamSource(stream);
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Initialize STT
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'pt-BR';
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const chunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscriptRef.current += chunk + ' ';
            } else {
              interimTranscript += chunk;
            }
          }
          const fullTranscript = finalTranscriptRef.current + interimTranscript;
          userTranscriptRef.current = fullTranscript;
          setLiveTranscript(fullTranscript);
        };
      }
      
      workletNode.port.onmessage = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const inputData = e.data;
        const recording = isRecordingRef.current;
        if (!recording) return;
        userAudioChunksRef.current.push(inputData.slice());
      };
      
      source.connect(workletNode);
      workletNode.connect(audioCtx.destination);
      processorRef.current = workletNode;
      
      isRecordingRef.current = false;
      setIsRecording(false);
    } catch (err: any) {
      console.error('Mic error:', err);
      setError('Erro ao acessar microfone.');
    }
  }, [wsRef, setError, setLiveTranscript]);

  const stopAudioCapture = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  // Auto start capture on call start
  useEffect(() => {
    if (isConnected && isInCall && !mediaStreamRef.current) {
      startAudioCapture();
    }
  }, [isConnected, isInCall, startAudioCapture]);

  // Handle Push-To-Talk
  useEffect(() => {
    const stopRecordingAndSend = async () => {
      isRecordingRef.current = false;
      setIsRecording(false);
      
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        if (userAudioChunksRef.current.length > 0) {
          const totalLen = userAudioChunksRef.current.reduce((acc, curr) => acc + curr.length, 0);
          const combined = new Float32Array(totalLen);
          let offset = 0;
          for (const chunk of userAudioChunksRef.current) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          
          const pcm16 = new Int16Array(combined.length);
          for (let i = 0; i < combined.length; i++) {
            let s = Math.max(-1, Math.min(1, combined[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          const buffer = new Uint8Array(pcm16.buffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < buffer.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, Array.from(buffer.slice(i, i + chunkSize)));
          }
          const b64 = window.btoa(binary);
          
          // 1. Send actual audio burst
          wsRef.current.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: b64 }]
            }
          }));
          
          // 2. Send 2 seconds silence for VAD
          const silenceBuffer = new Uint8Array(16000 * 2 * 2);
          let silenceBinary = '';
          for (let i = 0; i < silenceBuffer.length; i += chunkSize) {
            silenceBinary += String.fromCharCode.apply(null, Array.from(silenceBuffer.slice(i, i + chunkSize)));
          }
          const silenceB64 = window.btoa(silenceBinary);
          
          wsRef.current.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: silenceB64 }]
            }
          }));
        }
      }
      
      setTimeout(async () => {
        let text = userTranscriptRef.current.trim();
        if (!text) return;
        
        if (userAudioChunksRef.current.length > 0) {
          try {
            const totalLen = userAudioChunksRef.current.reduce((acc, curr) => acc + curr.length, 0);
            const combined = new Float32Array(totalLen);
            let offset = 0;
            for (const chunk of userAudioChunksRef.current) {
              combined.set(chunk, offset);
              offset += chunk.length;
            }
            const wavBuffer = encodeWAV(combined, 16000);
            const b64 = arrayBufferToBase64(wavBuffer);
            text += ` [audio:data:audio/wav;base64,${b64}]`;
          } catch (err) {
            console.error('Falha ao gerar audio do usuario:', err);
          }
        }
        
        saveMessage('user', text);
        userTranscriptRef.current = '';
        userAudioChunksRef.current = [];
      }, 800);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p' && !isRecordingRef.current && isConnected && isInCall && !isMobile) {
        isRecordingRef.current = true;
        setIsRecording(true);
        
        userAudioChunksRef.current = [];
        userTranscriptRef.current = '';
        finalTranscriptRef.current = '';
        setLiveTranscript('');
        
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // ignore
          }
        }
      }
    };

    const handleKeyUp = async (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p' && !isMobile) {
        await stopRecordingAndSend();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isMobile && isConnected && isInCall && !isRecordingRef.current) {
        e.preventDefault();
        isRecordingRef.current = true;
        setIsRecording(true);
        
        userAudioChunksRef.current = [];
        userTranscriptRef.current = '';
        finalTranscriptRef.current = '';
        setLiveTranscript('');
        
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            // ignore
          }
        }
      }
    };

    const handleTouchEnd = async (e: TouchEvent) => {
      if (isMobile) {
        e.preventDefault();
        await stopRecordingAndSend();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    const btn = micButtonRef.current;
    if (btn && isMobile) {
      btn.addEventListener('touchstart', handleTouchStart);
      btn.addEventListener('touchend', handleTouchEnd);
      btn.addEventListener('touchcancel', handleTouchEnd);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      if (btn && isMobile) {
        btn.removeEventListener('touchstart', handleTouchStart);
        btn.removeEventListener('touchend', handleTouchEnd);
        btn.removeEventListener('touchcancel', handleTouchEnd);
      }
    };
  }, [isConnected, isInCall, isMobile, wsRef, saveMessage, setLiveTranscript]);

  return {
    isRecording,
    isRecordingRef,
    analyserRef,
    micLabel,
    micButtonRef,
    stopAudioCapture
  };
}
