import { useEffect } from 'react';
import { sendPcmChunkToGemini, sendSilenceBurstToGemini, buildWavBase64 } from './audioStreamHelpers';

import { type ISpeechRecognitionInstance } from './speechRecognitionTypes';

interface UsePushToTalkKeyboardProps {
  continuousMode: boolean;
  isConnected: boolean;
  isInCall: boolean;
  isMobile: boolean;
  wsRef: React.MutableRefObject<WebSocket | null>;
  isRecordingRef: React.MutableRefObject<boolean>;
  setIsRecording: (recording: boolean) => void;
  micButtonRef: React.RefObject<HTMLButtonElement | null>;
  recognitionRef: React.MutableRefObject<ISpeechRecognitionInstance | null>;
  userTranscriptRef: React.MutableRefObject<string>;
  finalTranscriptRef: React.MutableRefObject<string>;
  userAudioChunksRef: React.MutableRefObject<Float32Array[]>;
  setLiveTranscript: (text: string) => void;
  saveMessage: (role: 'user' | 'model', text: string) => void;
}

export function usePushToTalkKeyboard({
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
}: UsePushToTalkKeyboardProps) {
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

          sendPcmChunkToGemini(wsRef.current, combined);
          sendSilenceBurstToGemini(wsRef.current, 2);
        }
      }

      setTimeout(async () => {
        let text = userTranscriptRef.current.trim();
        if (!text) return;

        if (userAudioChunksRef.current.length > 0) {
          const b64 = buildWavBase64(userAudioChunksRef.current);
          if (b64) {
            text += ` [audio:data:audio/wav;base64,${b64}]`;
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
          } catch {
            // ignore if already active
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
          } catch {
            // ignore if already active
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
  }, [
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
  ]);
}
