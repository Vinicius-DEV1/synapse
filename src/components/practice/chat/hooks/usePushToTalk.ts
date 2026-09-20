import { useState, useRef, useEffect, useCallback } from 'react';
import { encodeWAV } from '../../../../utils/audio';
import { arrayBufferToBase64 } from '../../../../utils/binary';

interface ISpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: { readonly transcript: string };
}

interface ISpeechRecognitionResultList {
  readonly length: number;
  [index: number]: ISpeechRecognitionResult;
}

interface ISpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: ISpeechRecognitionResultList;
}

interface ISpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: ISpeechRecognitionConstructor;
    webkitSpeechRecognition?: ISpeechRecognitionConstructor;
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
  continuousMode?: boolean;
  isPlayingRef?: React.MutableRefObject<boolean>;
}

export function usePushToTalk({
  isConnected,
  isInCall,
  isMobile,
  wsRef,
  saveMessage,
  setLiveTranscript,
  setError,
  continuousMode = false,
  isPlayingRef
}: UsePushToTalkProps) {
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [micLabel, setMicLabel] = useState<string>('');
  const micButtonRef = useRef<HTMLButtonElement>(null);

  const silentChunksCountRef = useRef(0);
  const speechActiveRef = useRef(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null);
  const userTranscriptRef = useRef<string>('');
  const finalTranscriptRef = useRef<string>('');
  const userAudioChunksRef = useRef<Float32Array[]>([]);

  const startAudioCapture = useCallback(async () => {
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (err) {
        console.warn('Overconstrained audio request failed, falling back to basic audio', err);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      }
      mediaStreamRef.current = stream;
      
      const track = stream.getAudioTracks()[0];
      if (track) setMicLabel(track.label);
      
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      
      let workletNode: AudioWorkletNode | null = null;
      if (typeof AudioWorkletNode !== 'undefined' && audioCtx.audioWorklet?.addModule) {
        try {
          await audioCtx.audioWorklet.addModule('/audio-worklet.js');
          workletNode = new AudioWorkletNode(audioCtx, 'pcm-extractor');
        } catch (workletErr) {
          console.warn('Failed to initialize AudioWorkletNode:', workletErr);
        }
      }

      let source: MediaStreamAudioSourceNode | null = null;
      if (typeof audioCtx.createMediaStreamSource === 'function') {
        source = audioCtx.createMediaStreamSource(stream);
      }
      
      if (typeof audioCtx.createAnalyser === 'function') {
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source?.connect(analyser);
        analyserRef.current = analyser;
      }
      
      // Initialize STT
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: ISpeechRecognitionEvent) => {
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

        if (continuousMode) {
          recognition.onend = () => {
            if (isConnected && isInCall) {
              try {
                recognition.start();
              } catch {
                // ignore if already running
              }
            }
          };
          try {
            recognition.start();
          } catch {
            // ignore
          }
        }

        recognitionRef.current = recognition;
      }
      
      if (workletNode) {
        workletNode.port.onmessage = (e) => {
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
          const inputData: Float32Array = e.data;

        if (continuousMode) {
          // In continuous mode, pause mic input while AI speaks to avoid speaker acoustic feedback
          if (isPlayingRef?.current) {
            if (speechActiveRef.current) {
              speechActiveRef.current = false;
              isRecordingRef.current = false;
              setIsRecording(false);
            }
            return;
          }

          // Real-time Voice Activity Detection (RMS energy)
          let sumSquares = 0;
          for (let i = 0; i < inputData.length; i++) {
            sumSquares += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sumSquares / inputData.length);
          const isSpeech = rms > 0.015;

          if (isSpeech) {
            silentChunksCountRef.current = 0;
            if (!speechActiveRef.current) {
              speechActiveRef.current = true;
              isRecordingRef.current = true;
              setIsRecording(true);
            }
          } else {
            silentChunksCountRef.current++;
          }

          if (speechActiveRef.current) {
            userAudioChunksRef.current.push(inputData.slice());

            // Real-time streaming to Gemini Live WebSocket
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              let s = Math.max(-1, Math.min(1, inputData[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            const buffer = new Uint8Array(pcm16.buffer);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < buffer.length; i += chunkSize) {
              binary += String.fromCharCode.apply(null, Array.from(buffer.slice(i, i + chunkSize)));
            }
            wsRef.current.send(JSON.stringify({
              realtimeInput: {
                mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: window.btoa(binary) }]
              }
            }));

            // Conclude turn after 5 silent chunks (~1.25s)
            if (silentChunksCountRef.current >= 5) {
              speechActiveRef.current = false;
              isRecordingRef.current = false;
              setIsRecording(false);

              // Send 1.5s silence to trigger Gemini's server-side VAD model turn
              const silenceBuffer = new Uint8Array(16000 * 1.5 * 2);
              let silenceBinary = '';
              for (let i = 0; i < silenceBuffer.length; i += chunkSize) {
                silenceBinary += String.fromCharCode.apply(null, Array.from(silenceBuffer.slice(i, i + chunkSize)));
              }
              wsRef.current.send(JSON.stringify({
                realtimeInput: {
                  mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: window.btoa(silenceBinary) }]
                }
              }));

              let text = userTranscriptRef.current.trim();
              if (text) {
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
                    console.error('Falha ao gerar audio do candidato:', err);
                  }
                }
                saveMessage('user', text);
              }
              userTranscriptRef.current = '';
              finalTranscriptRef.current = '';
              userAudioChunksRef.current = [];
              setLiveTranscript('');
              silentChunksCountRef.current = 0;
            }
          }
        } else {
          // Push-to-talk mode
          const recording = isRecordingRef.current;
          if (!recording) return;
          userAudioChunksRef.current.push(inputData.slice());
        }
      };
      }
      
      if (source && workletNode) {
        source.connect(workletNode);
      }
      if (workletNode) {
        workletNode.connect(audioCtx.destination);
        processorRef.current = workletNode;
      }
      
      isRecordingRef.current = false;
      setIsRecording(false);
    } catch (err: unknown) {
      console.error('Mic error:', err);
      const isNotAllowed = err instanceof Error && err.name === 'NotAllowedError';
      if (isNotAllowed) {
        setError('Permissão de microfone negada. Verifique as permissões de áudio do sistema.');
      } else {
        setError('Erro ao acessar microfone.');
      }
    }
  }, [wsRef, setError, setLiveTranscript]);

  const stopAudioCapture = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    
    if (mediaStreamRef.current) {
      if (typeof mediaStreamRef.current.getTracks === 'function') {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop?.());
      }
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      if (typeof processorRef.current.disconnect === 'function') {
        processorRef.current.disconnect();
      }
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      if (typeof audioContextRef.current.close === 'function') {
        audioContextRef.current.close().catch?.(() => {});
      }
      audioContextRef.current = null;
    }
  }, []);

  // Ensure microphone stream is stopped and AudioContext closed on component unmount
  useEffect(() => {
    return () => {
      stopAudioCapture();
    };
  }, [stopAudioCapture]);

  // Auto start capture on call start
  useEffect(() => {
    if (isConnected && isInCall && !mediaStreamRef.current) {
      startAudioCapture();
    }
  }, [isConnected, isInCall, startAudioCapture]);

  // Handle Push-To-Talk (Only in traditional mode, bypassed in continuous interview mode)
  useEffect(() => {
    if (continuousMode) return;

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
  }, [continuousMode, isConnected, isInCall, isMobile, wsRef, saveMessage, setLiveTranscript]);

  return {
    isRecording,
    isRecordingRef,
    analyserRef,
    micLabel,
    micButtonRef,
    startAudioCapture,
    stopAudioCapture
  };
}
