import { useState, useRef, useEffect, useCallback } from 'react';
import {
  processContinuousVadChunk,
} from './audioStreamHelpers';
import { usePushToTalkKeyboard } from './usePushToTalkKeyboard';
import {
  type ISpeechRecognitionEvent,
  type ISpeechRecognitionInstance,
} from './speechRecognitionTypes';

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
  isPlayingRef,
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
            processContinuousVadChunk({
              inputData,
              ws: wsRef.current,
              isPlaying: Boolean(isPlayingRef?.current),
              speechActiveRef,
              silentChunksCountRef,
              isRecordingRef,
              setIsRecording,
              userAudioChunksRef,
              userTranscriptRef,
              finalTranscriptRef,
              setLiveTranscript,
              saveMessage,
            });
          } else {
            // Push-to-talk mode
            if (!isRecordingRef.current) return;
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
  }, [wsRef, setError, setLiveTranscript, continuousMode, isConnected, isInCall, isPlayingRef, saveMessage]);

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

  // Delegate push-to-talk keyboard and touch event listeners
  usePushToTalkKeyboard({
    continuousMode,
    isConnected,
    isInCall,
    isMobile,
    wsRef,
    isRecordingRef,
    setIsRecording,
    micButtonRef,
    recognitionRef,
    userTranscriptRef,
    finalTranscriptRef,
    userAudioChunksRef,
    setLiveTranscript,
    saveMessage,
  });

  return {
    isRecording,
    isRecordingRef,
    analyserRef,
    micLabel,
    micButtonRef,
    startAudioCapture,
    stopAudioCapture,
  };
}
