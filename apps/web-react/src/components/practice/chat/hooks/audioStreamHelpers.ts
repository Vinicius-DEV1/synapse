import { encodeWAV } from '../../../../utils/audio';
import { arrayBufferToBase64 } from '../../../../utils/binary';

/**
 * Transcodes Float32Array PCM into 16-bit PCM binary chunks and sends them over WebSocket to Gemini Live.
 */
export function sendPcmChunkToGemini(ws: WebSocket | null, inputData: Float32Array): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const pcm16 = new Int16Array(inputData.length);
  for (let i = 0; i < inputData.length; i++) {
    const s = Math.max(-1, Math.min(1, inputData[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const buffer = new Uint8Array(pcm16.buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < buffer.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(buffer.slice(i, i + chunkSize)));
  }
  ws.send(
    JSON.stringify({
      realtimeInput: {
        mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: window.btoa(binary) }],
      },
    })
  );
}

/**
 * Sends a burst of PCM silence to trigger Gemini's server-side Voice Activity Detection turn.
 */
export function sendSilenceBurstToGemini(ws: WebSocket | null, durationSeconds: number = 1.5): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const silenceBuffer = new Uint8Array(16000 * durationSeconds * 2);
  let silenceBinary = '';
  const chunkSize = 8192;
  for (let i = 0; i < silenceBuffer.length; i += chunkSize) {
    silenceBinary += String.fromCharCode.apply(null, Array.from(silenceBuffer.slice(i, i + chunkSize)));
  }
  ws.send(
    JSON.stringify({
      realtimeInput: {
        mediaChunks: [{ mimeType: 'audio/pcm;rate=16000', data: window.btoa(silenceBinary) }],
      },
    })
  );
}

/**
 * Combines recorded Float32Array chunks into a standard WAV base64 string.
 */
export function buildWavBase64(chunks: Float32Array[]): string | null {
  if (chunks.length === 0) return null;
  try {
    const totalLen = chunks.reduce((acc, curr) => acc + curr.length, 0);
    const combined = new Float32Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    const wavBuffer = encodeWAV(combined, 16000);
    return arrayBufferToBase64(wavBuffer);
  } catch (err) {
    console.error('Falha ao gerar WAV a partir de chunks de áudio:', err);
    return null;
  }
}

export interface ProcessVadChunkParams {
  inputData: Float32Array;
  ws: WebSocket | null;
  isPlaying: boolean;
  speechActiveRef: React.MutableRefObject<boolean>;
  silentChunksCountRef: React.MutableRefObject<number>;
  isRecordingRef: React.MutableRefObject<boolean>;
  setIsRecording: (recording: boolean) => void;
  userAudioChunksRef: React.MutableRefObject<Float32Array[]>;
  userTranscriptRef: React.MutableRefObject<string>;
  finalTranscriptRef: React.MutableRefObject<string>;
  setLiveTranscript: (text: string) => void;
  saveMessage: (role: 'user' | 'model', text: string) => void;
}

/**
 * Processes audio worklet chunk in continuous mode using real-time RMS energy Voice Activity Detection.
 */
export function processContinuousVadChunk({
  inputData,
  ws,
  isPlaying,
  speechActiveRef,
  silentChunksCountRef,
  isRecordingRef,
  setIsRecording,
  userAudioChunksRef,
  userTranscriptRef,
  finalTranscriptRef,
  setLiveTranscript,
  saveMessage,
}: ProcessVadChunkParams): void {
  // Pause mic input while AI is speaking to avoid feedback
  if (isPlaying) {
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
    sendPcmChunkToGemini(ws, inputData);

    // Conclude turn after 5 silent chunks (~1.25s)
    if (silentChunksCountRef.current >= 5) {
      speechActiveRef.current = false;
      isRecordingRef.current = false;
      setIsRecording(false);

      sendSilenceBurstToGemini(ws, 1.5);

      let text = userTranscriptRef.current.trim();
      if (text) {
        const b64 = buildWavBase64(userAudioChunksRef.current);
        if (b64) {
          text += ` [audio:data:audio/wav;base64,${b64}]`;
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
}
